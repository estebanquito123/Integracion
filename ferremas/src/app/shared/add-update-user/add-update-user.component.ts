import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Usuario } from 'src/app/models/bd.models';
import { AuthService } from 'src/app/servicios/auth.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-add-update-user',
  templateUrl: './add-update-user.component.html',
  styleUrls: ['./add-update-user.component.scss']
})
export class AddUpdateUserComponent implements OnInit {
  fb = inject(FormBuilder);
  authSvc = inject(AuthService);
  utilsSvc = inject(UtilsService);
  modalCtrl = inject(ModalController);

  @Input() usuario?: Usuario;

  form: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      nombreCompleto: [this.usuario?.nombreCompleto || '', Validators.required],
      email: [this.usuario?.email || '', [Validators.required, Validators.email]],
      password: ['', this.usuario ? [] : [Validators.required, Validators.minLength(6)]],
      rol: [this.usuario?.rol || '', Validators.required]
    });

    if (this.usuario) {
      this.form.get('email')?.disable(); // No permitir cambiar el email en edición
    }
  }

  async guardar() {
    if (this.form.invalid) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const { nombreCompleto, password, rol } = this.form.getRawValue();
      const email = this.usuario?.email || this.form.get('email')?.value;

      if (this.usuario) {
        // Solo editar en Firestore
        await this.authSvc.actualizarUsuario(this.usuario.uid, {
          nombreCompleto,
          rol
        });
      } else {
        // Registrar nuevo usuario
        await this.authSvc.registrarNuevoUsuario(nombreCompleto, email, password, rol);
      }

      this.utilsSvc.presentToast({
        message: 'Usuario guardado correctamente',
        color: 'success',
        duration: 2000
      });

      this.modalCtrl.dismiss({ success: true });
    } catch (error: any) {
      this.utilsSvc.presentToast({
        message: error.message,
        color: 'danger',
        duration: 2000
      });
    } finally {
      loading.dismiss();
    }
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}
