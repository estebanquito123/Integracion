//login.page.ts
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/servicios/auth.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UtilsService } from 'src/app/servicios/utils.service';
import { FirebaseService } from 'src/app/servicios/firebase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  private authService = inject(AuthService);
  private alertController = inject(AlertController);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private utilsSvc= inject(UtilsService)
  private firebaseSvc= inject(FirebaseService)
  private authSubscription: Subscription; // Suscripción para escuchar el estado de autenticación

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Escuchar el estado de autenticación para limpiar el formulario cuando se cierra sesión
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (!isAuthenticated) {
        this.loginForm.reset(); // Resetea el formulario si no hay una sesión activa
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe(); // Desuscribirse para evitar fugas de memoria
  }
initializePushNotifications(uid: string) {
  PushNotifications.requestPermissions().then(permission => {
    if (permission.receive === 'granted') {
      PushNotifications.register();
    } else {
      console.warn('Permiso de notificaciones denegado');
    }
  });

  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('Token FCM:', token.value);

    // Guarda el token en Firestore
    try {
      await this.firebaseSvc.guardarTokenDispositivo(uid, token.value);
      console.log('Token guardado en Firestore');
    } catch (error) {
      console.error('Error al guardar token en Firestore:', error);
    }
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error al registrar push token:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notificación recibida:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Notificación abierta:', notification);
  });
}


async login() {
  if (this.loginForm.invalid) return;

  const { email, password } = this.loginForm.value;
  const loading = await this.utilsSvc.loading();  // Instancia de loading
  await loading.present();

  try {
    const usuarioData = await this.authService.login(email, password);

    // Verificar que realmente tenemos datos de usuario
    if (usuarioData && usuarioData.uid) {
      this.mostrarAlerta('Éxito', 'Sesión iniciada exitosamente');
      this.initializePushNotifications(usuarioData.uid);

      let ruta = '/inicio'; // ruta por defecto

      switch (usuarioData.rol) {
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

      console.log('Redirigiendo a:', ruta);
      setTimeout(() => {
        this.router.navigate([ruta]);
      }, 300); // Pequeño retraso para asegurar que el alert se muestre antes de la redirección
    } else {
      // Si llegamos aquí, la autenticación fue exitosa pero no obtuvimos datos de usuario válidos
      console.error('Error: Datos de usuario incompletos después de login', usuarioData);
      this.mostrarAlerta('Error', 'No se pudieron obtener los datos de usuario. Inténtalo de nuevo.');
    }
  } catch (error) {
    console.error('Error de login:', error);
    this.mostrarAlerta('Error', 'Correo o contraseña incorrectos');
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




