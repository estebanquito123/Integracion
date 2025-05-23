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
    const clienteId = usuario?.uid || '';

    // Convertir productos del carrito a ProductoPedido con validación
    const productosPedido = this.productos.map(producto => {
  const itemCarrito = this.carritoService.getItems().find(item => item.id === producto.id);
  const cantidad = itemCarrito?.cantidad ?? 1;

  return {
    id: producto.id || '',
    nombre: producto.nombre || 'Sin nombre',
    precio: producto.precio ?? 0,
    cantidad: cantidad,
    imagen: producto.imagen || '',
    stock: producto.stock ?? 0
  };
});

    // Crear el objeto pedido sin valores undefined
    const pedidoData = {
      productos: productosPedido,
      ordenCompra,
      metodoPago: 'transferencia',
      direccion: direccion || '',
      retiro: retiro || '',
      fecha: new Date().toISOString(),
      estadoPago: EstadoPago.PENDIENTE,
      estadoPedido: EstadoPedido.PENDIENTE,
      montoTotal: montoTotal ?? 0,
      clienteId: clienteId,
      verificadoPorContador: false
    };

    // Validación final para evitar errores
    Object.entries(pedidoData).forEach(([key, value]) => {
      if (value === undefined) {
        throw new Error(`Campo ${key} está undefined`);
      }
    });

    // Notificar al contador sobre el pago pendiente
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

    // Mostrar instrucciones para transferencia
    const alert = await this.alertController.create({
      header: 'Instrucciones de Pago',
      subHeader: 'Realiza una transferencia con los siguientes datos:',
      message: `
        Banco: Banco Estado
        Cuenta:Cuenta Corriente
        Número: 123456789
        RUT: 12.345.678-9
        Nombre: Tienda Online SpA
        Email:pagos@tiendaonline.cl
        Monto: $${montoTotal}
        Orden de Compra: ${ordenCompra}
        El contador confirmará tu pago a la brevedad.
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
    console.error('Error en pago por transferencia:', error);
    this.utilsSvc.presentToast({
      message: 'Error al registrar pedido: ' + error.message,
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
