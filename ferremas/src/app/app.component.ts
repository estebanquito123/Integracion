import { Component, OnInit } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthService } from './servicios/auth.service';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.initPushNotifications();
  }

  initPushNotifications() {
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    PushNotifications.addListener('registration', async (token) => {
      console.log('📲 Token FCM recibido:', token.value);

      const auth = getAuth();
      const user = auth.currentUser;

      if (user?.uid) {
        await this.authService.registrarTokenPush(token.value, user.uid);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Error al registrar PushNotifications:', error);
    });
  }
}
