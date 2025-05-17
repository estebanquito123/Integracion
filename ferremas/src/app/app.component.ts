import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private platform: Platform) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      this.inicializarCanalesNotificaciones();
    });
  }

  async inicializarCanalesNotificaciones() {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'cliente_channel',
      name: 'Notificaciones del Cliente',
      description: 'Avisos de cliente',
      importance: 5,
      sound: 'default'
    });

    await LocalNotifications.createChannel({
      id: 'vendedor_channel',
      name: 'Notificaciones del Vendedor',
      description: 'Avisos de vendedor',
      importance: 5,
      sound: 'default'
    });
  }
}
