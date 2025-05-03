// admin.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { Producto, Usuario } from 'src/app/models/bd.models';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/add-update-product/add-update-product.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {
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


  // Mostrar modal para agregar o actualizar producto
  addUpdateProduct(producto?: Producto) {
    this.utilsSvc.presentModal({
      component: AddUpdateProductComponent,
      componentProps: { producto }
    }).then((result) => {
      if (result?.success) {
        this.getProducts(); // Refresca la lista de productos después de agregar o editar
      }
    });
  }

  // Eliminar producto de la colección global `productos`
  deleteProduct(productId: string) {
    this.firebaseSvc.deleteProducto(productId).then(() => {
      this.utilsSvc.presentToast({
        message: 'Producto eliminado exitosamente',
        duration: 2000,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });
      this.getProducts(); // Refresca la lista de productos después de eliminar
    }).catch(error => {
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    });
  }
}
