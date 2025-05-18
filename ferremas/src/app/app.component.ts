import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';
import { FirebaseService } from './servicios/firebase.service';
import { UtilsService } from './servicios/utils.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    this.setupPushChannels();
    this.setupPushNotifications();
  }

  async setupPushChannels() {
    await PushNotifications.createChannel({
      id: 'vendedor_channel',
      name: 'Notificaciones para vendedor',
      importance: 5,
      sound: 'default',
      description: 'Pedidos nuevos'
    });

    await PushNotifications.createChannel({
      id: 'cliente_channel',
      name: 'Notificaciones para cliente',
      importance: 5,
      sound: 'default',
      description: 'Pedidos confirmados o despachados'
    });

    await PushNotifications.createChannel({
      id: 'bodeguero_channel',
      name: 'Notificaciones para bodeguero',
      importance: 5,
      sound: 'default',
      description: 'Pedidos para preparación'
    });

    await PushNotifications.createChannel({
      id: 'test_channel',
      name: 'Canal de prueba',
      importance: 5,
      sound: 'default'
    });
  }

  setupPushNotifications() {
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    PushNotifications.addListener('registration', async (token: Token) => {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      if (usuario?.uid) {
        await this.firebaseSvc.guardarTokenDispositivo(usuario.uid, token.value);
      }
    });

    PushNotifications.addListener('registrationError', err => {
      console.error('Error al registrar FCM:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      this.utilsSvc.presentToast({
        message: `${notification.title}: ${notification.body}`,
        duration: 3000,
        color: 'primary'
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Notificación tocada:', notification);
      // Redirigir según los datos si se desea
    });
  }
}
