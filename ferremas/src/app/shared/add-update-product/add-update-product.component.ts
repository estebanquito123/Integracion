//add-update-product-ts
import { Component, OnInit,Input, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Usuario } from 'src/app/models/bd.models';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Producto } from 'src/app/models/bd.models';

@Component({
  selector: 'app-add-update-product',
  templateUrl: './add-update-product.component.html',
  styleUrls: ['./add-update-product.component.scss'],
})
export class AddUpdateProductComponent  implements OnInit {
  @Input() IsModal: boolean;
  @Input() control!: FormControl;
  @Input() type!: string;
  @Input() label!: string;
  @Input() autocomplete!: string;
  @Input() icon!: string;
  @Input() producto: Producto;
  isEditMode = false;

  form = new FormGroup({
    id: new FormControl(''),
    imagen: new FormControl('', [Validators.required,]),
    nombre: new FormControl('', [Validators.required]),
    precio: new FormControl('', [Validators.required, Validators.min(0)])
  });
  firebaseSvc= inject(FirebaseService);
  utilsSvc= inject(UtilsService);
  constructor() { }

  dismissModal() {
    this.utilsSvc.dismissModal()
  }

  usuario= {} as Usuario;

  ngOnInit() {
    // Si se proporciona un producto, inicializa el formulario con sus datos
    if (this.producto) {
      this.isEditMode = true;
      const productoData = {
        ...this.producto,
        precio: this.producto.precio.toString() // Convertir precio a string para el formulario
      };
      this.form.patchValue(productoData);
    }
  }


async takePicture() {
  const dataUrl = (await this.utilsSvc.takePicture('Imagen del producto')).dataUrl;
  this.form.controls.imagen.setValue(dataUrl)
}
submit() {
  if (this.producto && this.producto.id && this.isEditMode) {
    this.actualizarProducto();
  } else {
    this.crearProducto();
  }
}

// Crear un nuevo producto en la colección global `productos`
async crearProducto() {
  if (this.form.valid) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.firebaseSvc.addProducto(this.form.value).then(() => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Producto creado exitosamente',
        duration: 2000,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });
    }).catch(error => {
      console.log(error);
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    }).finally(() => {
      loading.dismiss();
    });
  }
}

// Actualizar producto existente en la colección global `productos`
async actualizarProducto() {
  if (this.form.valid) {
    const path = `productos/${this.producto.id}`; // Usar el id del producto

    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.firebaseSvc.updateProducto(this.producto.id, this.form.value).then(() => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Producto actualizado exitosamente',
        duration: 2000,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });
    }).catch(error => {
      console.log(error);
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    }).finally(() => {
      loading.dismiss();
    });
  }
}
}
