import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TransbankService } from 'src/app/servicios/transbank.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { FirebaseService } from 'src/app/servicios/firebase.service';

@Component({
  selector: 'app-transbank-result',
  templateUrl: './transbank-result.page.html',
  styleUrls: ['./transbank-result.page.scss'],
})
export class TransbankResultPage implements OnInit {
  // Inyección de servicios
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transbankService = inject(TransbankService);
  private utilsSvc = inject(UtilsService);
  private carritoService = inject(CarritoService);
  private firebaseSvc = inject(FirebaseService);

  // Variables para la UI
  pageTitle = 'Resultado de la transacción';
  transaccionExitosa = false;
  cargando = true;
  mensajeError = '';

  // Detalles de la transacción que se muestran al usuario
  detallesTransaccion: any = {
    ordenCompra: '',
    monto: 0,
    fecha: new Date(),
    codigoAutorizacion: ''
  };

  ngOnInit() {
    console.log('TransbankResultPage: ngOnInit');
    this.procesarResultado();
  }

  async procesarResultado() {
    console.log('Procesando resultado de Transbank');

    // Obtener los parámetros de la URL después de la redirección desde Transbank
    this.route.queryParams.subscribe(params => {
      console.log('Parámetros recibidos:', params);

      if (params['token_ws']) {
        // Token de respuesta exitosa
        console.log('Token recibido:', params['token_ws']);
        this.verificarTransaccion(params['token_ws']);
      } else if (params['TBK_TOKEN']) {
        // La transacción fue abortada o rechazada por Webpay
        console.log('Transacción abortada/rechazada. TBK_TOKEN:', params['TBK_TOKEN']);
        this.manejarErrorTransaccion('La transacción fue cancelada o rechazada');
      } else if (params['TBK_ID_SESSION']) {
        // Error general en la transacción
        console.log('Error general. TBK_ID_SESSION:', params['TBK_ID_SESSION']);
        this.manejarErrorTransaccion('Error en la transacción');
      } else {
        console.log('No se recibieron parámetros válidos');
        this.manejarErrorTransaccion('No se recibieron parámetros válidos de Transbank');
      }
    });
  }

  async verificarTransaccion(token: string) {
    try {
      // Recuperar información de la transacción guardada en localStorage
      const transaccionInfoStr = localStorage.getItem('currentTransaction');
      if (!transaccionInfoStr) {
        console.error('No se encontró información de la transacción en localStorage');
        throw new Error('No se encontró información de la transacción');
      }

      const transaccionInfo = JSON.parse(transaccionInfoStr);
      console.log('Información de transacción recuperada:', transaccionInfo);

      // Confirmar la transacción con Transbank
      console.log('Confirmando transacción con token:', token);
      this.transbankService.confirmarTransaccion(token).subscribe({
        next: async (response) => {
          console.log('Respuesta de Transbank:', response);

          if (response.status === 'AUTHORIZED') {
            // Transacción exitosa
            console.log('Transacción autorizada');
            this.transaccionExitosa = true;

            // Actualizar los detalles a mostrar
            this.detallesTransaccion = {
              ordenCompra: response.buy_order,
              monto: response.amount,
              fecha: new Date(),
              codigoAutorizacion: response.authorization_code
            };

            // Actualizar el estado de la transacción en Firestore
            console.log('Actualizando estado de transacción a "completada"');
            await this.transbankService.actualizarEstadoTransaccion(
              transaccionInfo.transaccionId,
              'completada',
              response
            );

            // Guardar cada producto como una compra individual
            console.log('Guardando productos como compras');
            const productosCarrito = this.carritoService.getItems();
            for (const producto of productosCarrito) {
              const compra = {
                productoId: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                fecha: new Date().toISOString(),
                ordenCompra: response.buy_order,
                estadoPago: 'completado',
                metodoPago: 'webpay',
                codigoAutorizacion: response.authorization_code
              };
              await this.firebaseSvc.guardarCompra(compra);
            }

            // Limpiar el carrito después de la compra exitosa
            console.log('Limpiando carrito');
            this.carritoService.clearCart();

            // Mostrar mensaje de éxito
            this.utilsSvc.presentToast({
              message: '¡Pago realizado con éxito!',
              duration: 3000,
              color: 'success',
              position: 'middle',
              icon: 'checkmark-circle-outline'
            });
          } else {
            // Transacción rechazada
            console.log('Transacción rechazada:', response.status);
            const mensaje = response.status_description || 'Transacción rechazada por Webpay';
            this.manejarErrorTransaccion(mensaje);

            await this.transbankService.actualizarEstadoTransaccion(
              transaccionInfo.transaccionId,
              'rechazada',
              response
            );
          }
        },
        error: (error) => {
          console.error('Error al verificar transacción:', error);
          this.manejarErrorTransaccion('Error al verificar la transacción con Webpay');

          if (transaccionInfo && transaccionInfo.transaccionId) {
            this.transbankService.actualizarEstadoTransaccion(
              transaccionInfo.transaccionId,
              'error',
              { error: error.message || 'Error desconocido' }
            ).catch(err => console.error('Error al actualizar estado:', err));
          }
        },
        complete: () => {
          console.log('Verificación de transacción completada');
          this.cargando = false;
          // Limpiamos la información de transacción del localStorage
          localStorage.removeItem('currentTransaction');
        }
      });
    } catch (error) {
      console.error('Error en verificarTransaccion:', error);
      this.manejarErrorTransaccion('Error al procesar el resultado del pago');
      this.cargando = false;
    }
  }

  manejarErrorTransaccion(mensaje: string) {
    console.log('Manejando error de transacción:', mensaje);
    this.transaccionExitosa = false;
    this.mensajeError = mensaje;
    this.cargando = false;

    this.utilsSvc.presentToast({
      message: mensaje,
      duration: 3000,
      color: 'danger',
      position: 'middle',
      icon: 'alert-circle-outline'
    });
  }
}
