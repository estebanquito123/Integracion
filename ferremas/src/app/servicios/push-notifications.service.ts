import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FirebaseService } from './firebase.service';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  public token = new BehaviorSubject<string>(null);

  constructor(
    private platform: Platform,
    private router: Router,
    private afAuth: AngularFireAuth,
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService
  ) {}

  async initPush() {
    if (this.platform.is('capacitor')) {
      // Request permission to use push notifications
      // iOS will prompt user and return if they granted permission or not
      // Android will just grant without prompting
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // On registration success, store token in Firebase
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          this.token.next(token.value);
          this.saveTokenToFirebase(token.value);
        });

        // Some issue with registering
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Handle notification received when app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification);
          this.handleNotification(notification);
        });

        // Handle notification when app is in background or closed
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification.actionId, notification.inputValue);
          this.handleNotificationAction(notification);
        });
      }
    }
  }

  private async saveTokenToFirebase(token: string) {
    try {
      const user = await this.afAuth.currentUser;

      if (user) {
        // Update user's push token
        const userData = {
          pushToken: token,
          tokenLastUpdated: new Date().toISOString()
        };

        await this.firebaseSvc.updateUserData(user.uid, userData);
        console.log('Token saved to user profile');
      }
    } catch (error) {
      console.error('Error saving token to Firebase', error);
    }
  }

  private handleNotification(notification: any) {
    // Show a toast or in-app notification
    this.utilsSvc.presentToast({
      message: notification.title + ': ' + notification.body,
      duration: 3000,
      color: 'primary',
      position: 'top'
    });
  }

  private handleNotificationAction(actionData: any) {
    // Route to appropriate page based on notification type
    const notification = actionData.notification;

    if (notification.data) {
      try {
        // Check notification type to route appropriately
        const data = notification.data;

        if (data.tipo === 'pedido_listo') {
          this.router.navigate(['/cliente/pedido-detalle', data.pedidoId]);
        } else if (data.tipo === 'pago_confirmado') {
          this.router.navigate(['/vendedor/pedidos']);
        } else if (data.pedidoId) {
          // Default fallback for pedidos
          this.router.navigate(['/cliente/pedidos']);
        }
      } catch (e) {
        console.error('Error handling notification action', e);
      }
    }
  }
}
