
import { Component, inject, OnInit } from '@angular/core';
import { Producto, Usuario } from 'src/app/models/bd.models';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/add-update-product/add-update-product.component';

@Component({
  selector: 'app-admin',
  templateUrl: './productos-bodega.page.html',
  styleUrls: ['./productos-bodega.page.scss'],
})
export class ProductosBodegaPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  productos: Producto[] = [];

  constructor() {}

  ngOnInit() {}


  ionViewWillEnter() {
    this.getProducts();
  }

  async getProducts() {
    // Mostrar el loading spinner
    const loading = await this.utilsSvc.loading();

    const sub = this.firebaseSvc.getProductos().subscribe({
      next: (res: Producto[]) => {
        console.log(res);
        this.productos = res;
        sub.unsubscribe();
      },
      error: (error) => {
        console.log('Error al obtener productos:', error);
      },
      complete: () => {
        // Ocultar el loading cuando se complete la carga
        loading.dismiss();
      }
    });
  }






}
