//logout.page.ts
import { Router } from '@angular/router';
import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from 'src/app/servicios/auth.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.page.html',
  styleUrls: ['./logout.page.scss'],
})
export class LogoutPage  implements OnInit {
  successMessage: string = ''; // Para mostrar mensaje de éxito

  private authService = inject(AuthService);
  private router= inject(Router)  // Inyecta el servicio de autenticación
  private alertController = inject(AlertController);  // Inyecta el AlertController

  constructor() {}

  ngOnInit(): void {
    this.authService.logout();  // Cierra la sesión
    this.router.navigate(['/']); // Redirige al usuario a la página de login
    this.successMessage = 'Has cerrado sesion exitosamente. ¡Gracias por utilizar nuestra app!';
    this.mostrarAlerta('Exito',this.successMessage);
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });

    await alert.present();  // Muestra la alerta
  }

}
