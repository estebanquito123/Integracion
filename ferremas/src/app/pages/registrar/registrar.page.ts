import { UtilsService } from 'src/app/servicios/utils.service';
//registrar.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from 'src/app/servicios/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registrar',
  templateUrl: './registrar.page.html',
  styleUrls: ['./registrar.page.scss']
})
export class RegistrarPage implements OnInit {
  registroForm: FormGroup;

  private authService = inject(AuthService);
  private alertController = inject(AlertController);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private utilsSvc= inject(UtilsService);

  ngOnInit() {
    this.registroForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombreCompleto: ['', Validators.required],
      rol: ['cliente', Validators.required]
    });
  }

  async registrar() {
    if (this.registroForm.invalid) return;

    const { email, password, nombreCompleto, rol } = this.registroForm.value;
    const loading = await this.utilsSvc.loading();  // Instancia de loading
    await loading.present();

    try {
      const resultado = await this.authService.registrarNuevoUsuario(nombreCompleto, email, password, rol);
    if (resultado) {
  this.mostrarAlerta('Éxito', 'Usuario registrado exitosamente');

  let ruta = '/inicio'; // ruta por defecto

  switch (rol) {
    case 'administrador':
      ruta = '/admin';
      break;
    case 'cliente':
      ruta = '/cliente';
      break;
    case 'vendedor':
      ruta = '/vendedor';
      break;
    case 'bodeguero':
      ruta = '/bodeguero';
      break;
    case 'contador':
      ruta = '/contador';
      break;
  }
        this.router.navigate([ruta]);
      }
    } catch (error) {
      this.mostrarAlerta('Error', error.message);
    } finally {
      loading.dismiss();
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



