// ✅ carro.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { Producto, EstadoPago, EstadoPedido } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Router } from '@angular/router';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { TransbankService } from 'src/app/servicios/transbank.service';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/servicios/auth.service';
import { MetodoRetiroModal } from 'src/app/shared/metodo-retiro-modal/metodo-retiro-modal.component';
import { ItemCarrito } from 'src/app/models/bd.models';



@Component({
  selector: 'app-carro',
  templateUrl: './carro.page.html',
  styleUrls: ['./carro.page.scss'],
})
export class CarroPage implements OnInit {
  productos: Producto[] = [];
  ItemCarrito: ItemCarrito[] = [];
  total = 0;

  carritoService = inject(CarritoService);
  utilsSvc = inject(UtilsService);
  router = inject(Router);
  firebaseSvc = inject(FirebaseService);
  transbankService = inject(TransbankService);
  alertController = inject(AlertController);
  authService = inject(AuthService);

  ngOnInit() {
    this.actualizarCarrito();
    this.checkPendingTransaction();
  }

  ionViewWillEnter() {
    this.actualizarCarrito();
    this.checkPendingTransaction();
  }

  actualizarCarrito() {
    this.productos = this.carritoService.getItems();
    this.total = this.carritoService.getTotal();
  }

  eliminarProducto(index: number) {
    this.carritoService.removeItem(index);
    this.actualizarCarrito();
    this.utilsSvc.presentToast({
      message: 'Producto eliminado del carrito',
      duration: 1500,
      color: 'success',
      position: 'bottom'
    });
  }

  vaciarCarrito() {
    this.carritoService.clearCart();
    this.productos = [];
    this.total = 0;
    this.utilsSvc.presentToast({
      message: 'Carrito vaciado correctamente',
      duration: 1500,
      color: 'success',
      position: 'bottom'
    });
  }

  async finalizarCompra() {
  const datos = await this.utilsSvc.presentModal({
    component: MetodoRetiroModal,
  });

  if (!datos) return;

  const tipoRetiro = datos.tipoRetiro;
  const direccion = datos.tipoRetiro === 'domicilio' ? datos.direccion : `Sucursal: ${datos.sucursal}`;

  this.elegirMetodoPago(tipoRetiro, direccion);
}


  async elegirMetodoPago(retiro: string, direccion: string) {
    const alert = await this.alertController.create({
      header: 'Selecciona el método de pago',
      buttons: [
        {
          text: 'Transferencia',
          handler: () => this.pagarPorTransferencia(retiro, direccion)
        },
        {
          text: 'Webpay',
          handler: () => this.pagarConTransbank(retiro, direccion)
        }
      ]
    });
    await alert.present();
  }

  async pagarConTransbank(retiro: string, direccion: string) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      if (this.productos.length === 0 || this.total <= 0) {
        throw new Error('Carrito vacío o monto inválido');
      }

      await this.transbankService.procesarPago(
        this.total,
        this.productos,
        retiro,
        direccion
      );

    } catch (error) {
      console.error('Error al pagar con Transbank:', error);
      this.utilsSvc.presentToast({
        message: 'Error en el pago: ' + error.message,
        duration: 3000,
        color: 'danger'
      });
    } finally {
      loading.dismiss();
    }
  }

async pagarPorTransferencia(retiro: string, direccion: string) {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    const ordenCompra = this.transbankService.generarOrdenCompra();

    // Calcular el monto total del pedido
    const montoTotal = this.carritoService.getTotal();

    // Obtener información del usuario actual
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const clienteId = usuario.uid;

    // Convertir productos del carrito a ProductoPedido
    const productosPedido = this.productos.map(producto => {
      // Buscar el item correspondiente en el carrito para obtener la cantidad
      const itemCarrito = this.carritoService.getItems().find(item => item.id === producto.id);
      const cantidad = itemCarrito ? itemCarrito.cantidad : 1; // Si no se encuentra, usar 1 como valor por defecto

      return {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: cantidad,
        imagen: producto.imagen || '',  // Aseguramos que la imagen nunca sea undefined
        stock: producto.stock
      };
    });

    // Crear objeto de pedido completo - asegurando que no haya campos undefined
    const pedidoData = {
      productos: productosPedido,
      ordenCompra,
      metodoPago: 'transferencia',
      direccion: direccion || '', // Aseguramos que no sea undefined
      retiro: retiro || '', // Aseguramos que no sea undefined
      fecha: new Date().toISOString(),
      estadoPago: EstadoPago.PENDIENTE,
      estadoPedido: EstadoPedido.PENDIENTE,
      montoTotal,
      clienteId: clienteId || '', // Aseguramos que no sea undefined
      verificadoPorContador: false // Añadimos este campo para que el contador sepa que debe revisarlo
    };

    // Notificar al contador sobre el pago pendiente por transferencia
    await this.firebaseSvc.notificarPagoPendienteAContador(pedidoData);

    // Guardar la compra en el historial del cliente
    for (const producto of productosPedido) {
      const compra = {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: producto.cantidad,
        fecha: new Date().toISOString(),
        ordenCompra,
        estadoPago: EstadoPago.PENDIENTE,
        metodoPago: 'transferencia',
        direccion: direccion || '',
        retiro: retiro || ''
      };

      await this.firebaseSvc.guardarCompra(compra);
    }

    this.carritoService.clearCart();
    this.router.navigate(['/cliente']);

    // Mostrar instrucciones para realizar la transferencia
    const alert = await this.alertController.create({
      header: 'Instrucciones de Pago',
      subHeader: 'Realiza una transferencia con los siguientes datos:',
      message: `
        <p><strong>Banco:</strong> Banco Estado</p>
        <p><strong>Cuenta:</strong> Cuenta Corriente</p>
        <p><strong>Número:</strong> 123456789</p>
        <p><strong>RUT:</strong> 12.345.678-9</p>
        <p><strong>Nombre:</strong> Tienda Online SpA</p>
        <p><strong>Email:</strong> pagos@tiendaonline.cl</p>
        <p><strong>Monto:</strong> $${montoTotal}</p>
        <p><strong>Orden de Compra:</strong> ${ordenCompra}</p>
        <p>El contador confirmará tu pago a la brevedad.</p>
      `,
      buttons: ['Entendido']
    });
    await alert.present();

    this.utilsSvc.presentToast({
      message: 'Pedido registrado. Esperando confirmación de transferencia.',
      duration: 3000,
      color: 'success'
    });

  } catch (error) {
    console.error(error);
    this.utilsSvc.presentToast({
      message: 'Error al registrar pedido',
      duration: 2000,
      color: 'danger'
    });
  } finally {
    loading.dismiss();
  }
}

async checkPendingTransaction() {
  const pendingTransaction = localStorage.getItem('currentTransaction');
  if (pendingTransaction) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const transData = await this.firebaseSvc.obtenerTransaccionPorOrden(pendingTransaction);

      if (transData && transData.estado === 'pagado') {
        // Transaction was successful but we didn't finish the process
        this.carritoService.clearCart();
        this.router.navigate(['/cliente']);

        this.utilsSvc.presentToast({
          message: 'Tu pedido anterior fue procesado correctamente',
          duration: 3000,
          color: 'success'
        });

        localStorage.removeItem('currentTransaction');
        localStorage.removeItem('carritoWebpay');
        localStorage.removeItem('direccionWebpay');
        localStorage.removeItem('retiroWebpay');
      } else if (transData && transData.estado === 'iniciada') {
        // Transaction is still pending
        const alert = await this.alertController.create({
          header: 'Transacción pendiente',
          message: '¿Deseas continuar con el pago pendiente o cancelarlo?',
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => {
                localStorage.removeItem('currentTransaction');
                localStorage.removeItem('carritoWebpay');
                localStorage.removeItem('direccionWebpay');
                localStorage.removeItem('retiroWebpay');
              }
            },
            {
              text: 'Continuar',
              handler: () => {
                // Reconstruct the cart and redirect to checkout
                if (transData.productos && Array.isArray(transData.productos)) {
                  // Clear current cart first
                  this.carritoService.clearCart();

                  // Add each product individually
                  transData.productos.forEach((producto: Producto) => {
                    this.carritoService.addItem(producto);
                  });

                  this.actualizarCarrito();
                  this.finalizarCompra();
                }
              }
            }
          ]
        });
        await alert.present();
      }
    } catch (error) {
      console.error('Error al verificar transacción pendiente:', error);
    } finally {
      loading.dismiss();
    }
  }
}


}
