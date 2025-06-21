//auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from '../models/bd.models';
import { PushNotifications } from '@capacitor/push-notifications';
import { getAuth } from 'firebase/auth';
import { FirebaseService } from './firebase.service';


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
    private firestore: AngularFirestore,
    private firebaseSvc: FirebaseService
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
    console.log('Intentando login con:', email);
    const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);

    if (!userCredential || !userCredential.user || !userCredential.user.uid) {
      console.error('Error: Credenciales de usuario incompletas');
      throw new Error('Credenciales de usuario incompletas');
    }

    console.log('Login exitoso, obteniendo datos de usuario...');
    this.isAuthenticatedSubject.next(true);

    const userDoc = await this.firestore.collection('usuarios')
      .doc(userCredential.user.uid)
      .get()
      .toPromise();

    if (!userDoc.exists) {
      console.error('Error: Documento de usuario no encontrado');
      throw new Error('Documento de usuario no encontrado');
    }

    const usuarioData = userDoc.data() as Usuario;
    usuarioData.uid = userCredential.user.uid; // Aseguramos que el uid esté presente

    console.log('Datos de usuario obtenidos:', usuarioData);
    this.usuarioCompletoSubject.next(usuarioData);
    this.usuarioSubject.next(usuarioData.nombreCompleto || '');
    localStorage.setItem('usuario', JSON.stringify(usuarioData));

    // Check if there's a pending push token to register
    const pendingToken = localStorage.getItem('pushToken');
    if (pendingToken) {
      await this.firebaseSvc.registrarTokenPush(pendingToken, usuarioData.uid);
      localStorage.removeItem('pushToken');
      console.log('Push token registrado después del login');
    } else {
      // Si no hay token guardado, solicitamos uno nuevo
      try {
        await PushNotifications.requestPermissions().then(result => {
          if (result.receive === 'granted') {
            PushNotifications.register();
          }
        });
      } catch (pushError) {
        console.error('Error al solicitar permisos de notificación:', pushError);
        // Continuamos el flujo incluso si hay error con las notificaciones
      }
    }

    return usuarioData;
  } catch (error) {
    console.error('Error en proceso de login:', error);
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

async registrarTokenPush(token: string, uid: string): Promise<void> {
  await this.firebaseSvc.registrarTokenPush(token, uid);
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





}
