import { AuthService } from 'src/app/servicios/auth.service';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http'; // Agregado para Transbank
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { environment } from '../environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { initializeApp } from '@angular/fire/app';
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';
// app.module.ts
import { FirebaseService } from './servicios/firebase.service';
import { UtilsService } from './servicios/utils.service';
import { NotificationService } from './servicios/push-notifications.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule, // Agregado para Transbank
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireMessagingModule
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    AuthService,
    FirebaseService,
    UtilsService,
    NotificationService
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
