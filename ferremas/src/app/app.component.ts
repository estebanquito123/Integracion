import { Component, OnInit } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthService } from './servicios/auth.service';
import { getAuth } from 'firebase/auth';
import { PushNotificationService } from './servicios/push-notifications.service';
import { Platform } from '@ionic/angular';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService, private pushNotificationService: PushNotificationService, private platform: Platform) {}

async ngOnInit() {
    // Initialize push notifications after platform is ready
    await this.platform.ready();
    this.pushNotificationService.initPush();
  }
}
