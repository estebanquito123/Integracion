// notification.service.ts
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { PushNotifications } from '@capacitor/push-notifications';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationCountSubject = new BehaviorSubject<number>(0);
  notificationCount$ = this.notificationCountSubject.asObservable();

  constructor(
    private platform: Platform,
    private firestore: AngularFirestore,
    private router: Router,
    private http: HttpClient
  ) {}

  // Initialize push notifications
  async initPushNotifications() {
    // Only run on mobile devices
    if (!this.platform.is('capacitor')) {
      console.log('Push notifications solo disponibles en dispositivos móviles');
      return false;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive !== 'granted') {
        console.log('Permiso de notificaciones denegado');
        return false;
      }

      // Clear old notifications
      await PushNotifications.removeAllDeliveredNotifications();

      // Register for push
      await PushNotifications.register();

      // Add listeners
      this.addNotificationListeners();

      console.log('Push notifications inicializadas correctamente');
      return true;
    } catch (error) {
      console.error('Error inicializando notificaciones:', error);
      return false;
    }
  }

  private addNotificationListeners() {
    // On registration success
    PushNotifications.addListener('registration',
      (token: { value: string }) => {
        console.log('Push token obtenido:', token.value);
        this.saveTokenToStorage(token.value);

        // Save if user is logged in
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (usuario && usuario.uid) {
          this.registerPushTokenForUser(usuario.uid, token.value);
        }
      }
    );

    // On notification received in foreground
    PushNotifications.addListener('pushNotificationReceived',
      (notification: any) => {
        console.log('Notificación recibida en primer plano:', notification);
        this.incrementNotificationCounter();
        // You could display a toast or update your UI here
      }
    );

    // On notification tapped
    PushNotifications.addListener('pushNotificationActionPerformed',
      (action: any) => {
        console.log('Notificación presionada:', action);
        this.handleNotificationAction(action.notification);
      }
    );
  }

  private incrementNotificationCounter() {
    const currentCount = this.notificationCountSubject.value;
    this.notificationCountSubject.next(currentCount + 1);
  }

  resetNotificationCounter() {
    this.notificationCountSubject.next(0);
  }

  private saveTokenToStorage(token: string) {
    localStorage.setItem('pushToken', token);
  }

  private async registerPushTokenForUser(userId: string, token: string) {
    try {
      // Update user document with token
      await this.firestore.collection('usuarios').doc(userId).update({
        pushToken: token
      });

      // Also send to your API for diagnostics
      await this.http.post(`${environment.backendApiUrl}/api/debug-fcm`, {
        token: token,
        details: {
          userId: userId,
          platform: this.platform.platforms(),
          timestamp: new Date().toISOString()
        }
      }).toPromise();

      console.log('Token registrado para usuario:', userId);
      return true;
    } catch (error) {
      console.error('Error al registrar token:', error);
      return false;
    }
  }

  private handleNotificationAction(notification: any) {
    try {
      // Extract data from notification
      console.log('Handling notification:', notification);

      const data = notification.data;

      if (!data) {
        console.warn('Notificación sin datos');
        return;
      }

      // Navigate based on notification type
      if (data.tipo === 'pedido_listo') {
        this.router.navigate(['/mis-pedidos'], {
          queryParams: { orden: data.ordenCompra }
        });
      } else if (data.tipo === 'nuevo_pedido') {
        this.router.navigate(['/pedidos-pendientes']);
      } else if (data.pedidoId) {
        // Default navigation if type not specified but pedidoId exists
        this.router.navigate(['/mis-pedidos'], {
          queryParams: { pedido: data.pedidoId }
        });
      }
    } catch (error) {
      console.error('Error al manejar notificación:', error);
    }
  }

  // Method to test notifications
  async sendTestNotification() {
    const token = localStorage.getItem('pushToken');

    if (!token) {
      console.error('No hay token push disponible');
      return false;
    }

    try {
      const response = await this.http.post(`${environment.backendApiUrl}/api/test-notification`, {
        token: token
      }).toPromise();

      console.log('Resultado prueba de notificación:', response);
      return true;
    } catch (error) {
      console.error('Error en prueba de notificación:', error);
      return false;
    }
  }
}
