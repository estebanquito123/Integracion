// app.component.ts
import { Component, OnInit } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from './servicios/auth.service';
import { FirebaseService } from './servicios/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private authService: AuthService,
    private firebaseSvc: FirebaseService,
    private router: Router
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    // Call the notification setup when the component initializes
    if (this.platform.is('capacitor')) {
      this.setupPushNotifications();
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Check if we're running on a mobile device with Capacitor
      if (this.platform.is('capacitor')) {
        this.setupPushNotifications();
      }
    });
  }

  async setupPushNotifications() {
    try {
      // Request permission to use push notifications
      // iOS will prompt user and return if they granted permission or not
      // Android will just grant without prompting
      const result = await PushNotifications.requestPermissions();

      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // On success, we should be able to receive notifications
        PushNotifications.addListener('registration',
          async (token: { value: string }) => {
            console.log('Push registration success, token: ' + token.value);

            // Store token in your service/localStorage
            // And register with your backend server
            const currentUser = await this.authService.usuarioCompleto$.toPromise();
            if (currentUser && currentUser.uid) {
              await this.authService.registrarTokenPush(token.value, currentUser.uid);
              console.log('Token registered for user', currentUser.uid);
            } else {
              // Save token temporarily to apply later when user logs in
              localStorage.setItem('pushToken', token.value);
              console.log('Token saved to localStorage for later use');
            }
          }
        );

        // Method called when notification is received
        PushNotifications.addListener('pushNotificationReceived',
          (notification: any) => {
            console.log('Push notification received: ', notification);
            // Optionally display a local notification or update UI
          }
        );

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed',
          (notification: any) => {
            console.log('Push notification action performed', notification);

            // Extract data from notification
            const data = notification.notification.data;
            console.log('Notification data: ', data);

            // Handle navigation based on notification data
            if (data.pedidoId) {
              if (data.tipo === 'pedido_listo') {
                this.router.navigate(['/mis-pedidos'], {
                  queryParams: {
                    orden: data.ordenCompra
                  }
                });
              } else if (data.tipo === 'nuevo_pedido') {
                this.router.navigate(['/pedidos-pendientes']);
              }
            }
          }
        );
      } else {
        console.log('Push notifications not granted');
      }
    } catch (error) {
      console.error('Error setting up push notifications: ', error);
    }
  }
}
