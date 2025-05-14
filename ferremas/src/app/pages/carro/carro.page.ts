// ✅ carro.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { Producto } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Router } from '@angular/router';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { TransbankService } from 'src/app/servicios/transbank.service';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/servicios/auth.service';
import { MetodoRetiroModal } from 'src/app/shared/metodo-retiro-modal/metodo-retiro-modal.component';

@Component({
  selector: 'app-carro',
  templateUrl: './carro.page.html',
  styleUrls: ['./carro.page.scss'],
})
export class CarroPage implements OnInit {
  productos: Producto[] = [];
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

      for (const producto of this.productos) {
        const compra = {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          fecha: new Date().toISOString(),
          ordenCompra,
          estadoPago: 'pendiente',
          metodoPago: 'transferencia',
          direccion,
          retiro,

        };
        await this.firebaseSvc.guardarCompra(compra);
      }
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const clienteId = usuario.uid;

      await this.firebaseSvc.notificarPedidoAVendedor({
        productos: this.productos,
        ordenCompra,
        metodoPago: 'transferencia',
        direccion,
        retiro,
        fecha: new Date().toISOString(),
        clienteId
      });

      this.carritoService.clearCart();
      this.router.navigate(['/cliente']);

      this.utilsSvc.presentToast({
        message: 'Pedido registrado. Esperando transferencia.',
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
