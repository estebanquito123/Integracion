//reset.page.ts
import { Component, inject, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { Usuario } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage implements OnInit {
  @Input() control!: FormControl;
  @Input() type!: string;
  @Input() label!: string;
  @Input() autocomplete!: string;
  @Input() icon!: string;

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  firebaseSvc= inject(FirebaseService)
  utilsSvc = inject(UtilsService)
  private alertController = inject(AlertController);


  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {

  }
  async submit() {
    if (this.form.valid) {
      const loading = await this.utilsSvc.loading();
      await loading.present();
      this.firebaseSvc.sendRecoveryEmail(this.form.value.email).then(res => {
        this.mostrarAlerta('Éxito', 'Se ha enviado un link de recuperacion de contraseña a su correo');
      console.log(res)
      }).catch(error => {
        console.log(error);

        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2000,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'

        });

      }).finally(() => {
        loading.dismiss();
      })
    }
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }
}
