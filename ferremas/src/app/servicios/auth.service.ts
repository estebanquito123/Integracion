//auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from '../models/bd.models';
import { PushNotifications } from '@capacitor/push-notifications';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private usuarioSubject = new BehaviorSubject<string>('');
  usuario$ = this.usuarioSubject.asObservable();

  private usuarioCompletoSubject = new BehaviorSubject<Usuario | null>(null);
  usuarioCompleto$ = this.usuarioCompletoSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {
    // Restaurar sesión desde localStorage si existe
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado) as Usuario;
      this.usuarioCompletoSubject.next(usuario);
      this.usuarioSubject.next(usuario.nombreCompleto || '');
      this.isAuthenticatedSubject.next(true);
    }

    // Sincronizar con Firebase en caso de cierre automático
    this.afAuth.authState.subscribe(user => {
      if (!user) {
        this.logout(); // Si Firebase cierra sesión, sincronizamos el estado local
      }
    });
  }

  async login(email: string, password: string): Promise<Usuario> {
  try {
    const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
    this.isAuthenticatedSubject.next(true);

    const userDoc = await this.firestore.collection('usuarios')
      .doc(userCredential.user.uid)
      .get()
      .toPromise();

    const usuarioData = userDoc.data() as Usuario;
    this.usuarioCompletoSubject.next(usuarioData);
    this.usuarioSubject.next(usuarioData.nombreCompleto || '');
    localStorage.setItem('usuario', JSON.stringify(usuarioData));

    // Check if there's a pending push token to register
    const pendingToken = localStorage.getItem('pushToken');
    if (pendingToken) {
      await this.registrarTokenPush(pendingToken, usuarioData.uid);
      localStorage.removeItem('pushToken');
      console.log('Push token registrado después del login');
    } else {
      // Try to request new token
      this.solicitarTokenPush(usuarioData.uid);
    }

    return usuarioData;
  } catch (error) {
    this.isAuthenticatedSubject.next(false);
    throw error;
  }
}


  logout(): void {
    this.afAuth.signOut();
    this.isAuthenticatedSubject.next(false);
    this.usuarioSubject.next('');
    this.usuarioCompletoSubject.next(null);
    localStorage.removeItem('usuario'); // Limpia almacenamiento persistente
  }

  async registrarNuevoUsuario(
    nombreCompleto: string,
    email: string,
    password: string,
    rol: string
  ): Promise<boolean> {
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      const nuevoUsuario: Usuario = {
        uid,
        nombreCompleto,
        email,
        password: '', // Nunca guardar contraseñas en Firestore
        rol,
      };

      await this.firestore.collection('usuarios').doc(uid).set(nuevoUsuario);
      this.usuarioCompletoSubject.next(nuevoUsuario);
      this.usuarioSubject.next(nombreCompleto);
      this.isAuthenticatedSubject.next(true);
      localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));

      return true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('El correo electrónico ya está en uso. Por favor, usa otro.');
      } else {
        throw new Error('Error al registrar el usuario. Inténtalo de nuevo.');
      }
    }
  }

async actualizarUsuario(uid: string, data: Partial<Usuario>): Promise<void> {
  return this.firestore.collection('usuarios').doc(uid).update(data);
}

async registrarTokenPush(token: string, uid: string): Promise<boolean> {
  if (!uid || !token) return false;

  try {
    // Update user document with the token
    await this.firestore.collection('usuarios').doc(uid).update({
      pushToken: token
    });

    // Save token info for debug purposes
    await this.firestore.collection('tokens_push').add({
      token,
      userId: uid,
      platform: this.getPlatform(),
      date: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    console.log('Token push registrado correctamente');
    return true;
  } catch (error) {
    console.error('Error al registrar token push:', error);
    return false;
  }
}


async solicitarTokenPush(uid: string) {
  try {
    // If using Capacitor and PushNotifications API is available
    // This is just to trigger the registration flow
    if ('PushNotifications' in window) {
      const PushNotifications = (window as any).PushNotifications;

      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error al solicitar permisos de notificaciones:', error);
    return false;
  }
}

getPlatform(): string {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'iOS';
  }

  return 'Web';
}



}
