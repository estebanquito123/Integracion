// carro.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { Producto } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Router } from '@angular/router';
import { FirebaseService } from 'src/app/servicios/firebase.service';

@Component({
  selector: 'app-carro',
  templateUrl: './carro.page.html',
  styleUrls: ['./carro.page.scss'],
})
export class CarroPage implements OnInit {
  productos: Producto[] = [];
  total = 0;

  // Inyección de servicios
  carritoService = inject(CarritoService);
  utilsSvc = inject(UtilsService);
  router = inject(Router);
  firebaseSvc = inject(FirebaseService);

  ngOnInit() {
    this.actualizarCarrito();
  }

  ionViewWillEnter() {
    this.actualizarCarrito();
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
    if (this.productos.length === 0) {
      this.utilsSvc.presentToast({
        message: 'El carrito está vacío',
        duration: 1500,
        color: 'warning',
        position: 'middle'
      });
      return;
    }

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Aquí procesamos la compra
      for (const producto of this.productos) {
        const compra = {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          fecha: new Date().toISOString()
        };
        await this.firebaseSvc.guardarCompra(compra);
      }

      // Vaciamos el carrito después de una compra exitosa
      this.carritoService.clearCart();
      this.productos = [];
      this.total = 0;

      this.utilsSvc.presentToast({
        message: '¡Compra realizada con éxito!',
        duration: 2000,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });

      // Redirigimos al cliente a la página principal
      this.router.navigate(['/cliente']);

    } catch (error) {
      console.error(error);
      this.utilsSvc.presentToast({
        message: 'Error al realizar la compra',
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    } finally {
      loading.dismiss();
    }
  }
}
