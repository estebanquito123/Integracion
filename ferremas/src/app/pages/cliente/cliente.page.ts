// 1. Primero corregimos el cliente.page.ts
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
  carritoService = inject(CarritoService); // Corregido: inyección correcta del servicio
  toastController = inject(ToastController); // Corregido: inyección correcta del servicio

  productos: Producto[] = [];

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
    this.carritoService.addItem(producto);
    this.mostrarToast('Producto agregado al carrito');
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 1500,
      position: 'bottom',
      color: 'success',
    });
    toast.present();
  }
}
