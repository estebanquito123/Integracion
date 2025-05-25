// cliente.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Producto } from 'src/app/models/bd.models';
import { Router } from '@angular/router';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.page.html',
  styleUrls: ['./cliente.page.scss'],
})
export class ClientePage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  router = inject(Router);
  carritoService = inject(CarritoService);
  toastController = inject(ToastController);

  productos: Producto[] = [];
  notificacionesNoLeidas: number = 0;

  ngOnInit() {
    this.getProductos();
  }

  async getProductos() {
    const loading = await this.utilsSvc.loading();
    const sub = this.firebaseSvc.getProductos().subscribe({
      next: (res) => {
        this.productos = res as Producto[];
        sub.unsubscribe();
        loading.dismiss();
      },
      error: (err) => {
        console.log(err);
        loading.dismiss();
      }
    });
  }

  agregarAlCarrito(producto: Producto) {
    // Validar stock antes de agregar
    if (producto.stock === 0) {
      this.mostrarToast('Este producto no está disponible', 'danger');
      return;
    }

    // Verificar si el producto ya está en el carrito y su cantidad
    const itemsCarrito = this.carritoService.getItems();
    const productoEnCarrito = itemsCarrito.find(item => item.id === producto.id);
    const cantidadEnCarrito = productoEnCarrito ? productoEnCarrito.cantidad || 0 : 0;

    // Verificar si agregar uno más excedería el stock disponible
    if (cantidadEnCarrito >= producto.stock) {
      this.mostrarToast(`No puedes agregar más unidades. Stock disponible: ${producto.stock}`, 'warning');
      return;
    }

    // Si pasa todas las validaciones, agregar al carrito
    this.carritoService.addItem(producto);
    this.mostrarToast('Producto agregado al carrito', 'success');
  }

  async mostrarToast(mensaje: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: color,
    });
    toast.present();
  }
}
