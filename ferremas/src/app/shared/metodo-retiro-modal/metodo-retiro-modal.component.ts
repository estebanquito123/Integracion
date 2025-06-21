// ✅ metodo-retiro.modal.ts
import { Component, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FirebaseService } from 'src/app/servicios/firebase.service';

@Component({
  selector: 'app-metodo-retiro-modal',
  templateUrl: './metodo-retiro-modal.component.html'
})
export class MetodoRetiroModal implements OnInit {
  modalCtrl = inject(ModalController);
  fb = inject(FormBuilder);
  firebaseSvc = inject(FirebaseService);

  retiroForm: FormGroup;
  sucursales: any[] = [];

  ngOnInit(): void {
    this.retiroForm = this.fb.group({
      tipoRetiro: ['tienda'],
      direccion: [''],
      sucursal: ['']
    });

    // Obtener sucursales desde Firebase (si existen)
    this.firebaseSvc.getSucursales().subscribe((data) => {
      this.sucursales = data;
    });
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

  continuar() {
    const datos = this.retiroForm.value;

    if (datos.tipoRetiro === 'domicilio' && !datos.direccion.trim()) {
      alert('Debes ingresar una dirección');
      return;
    }

    if (datos.tipoRetiro === 'tienda' && !datos.sucursal) {
      alert('Debes seleccionar una sucursal');
      return;
    }

    this.modalCtrl.dismiss({
      tipoRetiro: datos.tipoRetiro,
      direccion: datos.tipoRetiro === 'domicilio' ? datos.direccion : '',
      sucursal: datos.tipoRetiro === 'tienda' ? datos.sucursal : ''
    });
  }
}
