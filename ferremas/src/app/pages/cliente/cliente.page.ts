// cliente.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Producto, Usuario } from 'src/app/models/bd.models';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/add-update-product/add-update-product.component';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.page.html',
  styleUrls: ['./cliente.page.scss'],
})
export class ClientePage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  router= inject(Router)

  productos: Producto[] = [];

  constructor() {}

  ngOnInit() {}


  ionViewWillEnter() {
    this.getProducts();
  }

  getProducts() {
    const sub = this.firebaseSvc.getProductos().subscribe({
      next: (res: Producto[]) => {
        console.log(res)
        this.productos = res;
        sub.unsubscribe();
      },
      error: (error) => console.log('Error al obtener productos:', error)
    });
  }


  comprarProducto(producto: Producto) {
    this.router.navigate(['/compra'], { queryParams: { producto: JSON.stringify(producto) } });
  }

}
