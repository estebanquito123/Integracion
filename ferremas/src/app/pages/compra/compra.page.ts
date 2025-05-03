import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';

@Component({
  selector: 'app-compra',
  templateUrl: './compra.page.html',
  styleUrls: ['./compra.page.scss'],
})
export class CompraPage implements OnInit {
  producto: any; // Producto a comprar
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Obtener el producto desde los parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.producto = JSON.parse(params['producto']);
    });
  }

  async confirmarCompra() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Añadir la compra al historial del usuario
      const compra = {
        productoId: this.producto.id,
        nombre: this.producto.nombre,
        precio: this.producto.precio,
        fecha: new Date().toISOString()
      };

      // Llamar al método en el servicio de Firebase para guardar la compra
      await this.firebaseSvc.guardarCompra(compra);
      this.utilsSvc.presentToast({
        message: 'Compra realizada con éxito',
        duration: 2000,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });
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

