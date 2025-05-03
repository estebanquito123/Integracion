//auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from '../models/bd.models';

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

  constructor(private afAuth: AngularFireAuth, private firestore: AngularFirestore) {}

  // Método de inicio de sesión usando email y Firebase Authentication
  async login(email: string, password: string) {
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
      this.isAuthenticatedSubject.next(true);

      const userDoc = await this.firestore.collection('usuarios').doc(userCredential.user.uid).get().toPromise();
      const usuarioData = userDoc.data() as Usuario;
      this.usuarioCompletoSubject.next(usuarioData);

      // Guardar el usuario en localStorage
      localStorage.setItem('usuario', JSON.stringify(usuarioData));

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
    this.usuarioCompletoSubject.next(null); // Limpia los datos completos del usuario
  }


  // Método de registro que guarda en Firebase Authentication y Firestore
  async registrarNuevoUsuario(nombreCompleto: string,email: string, password: string,  rol: string) {
    try {
      // Crear el usuario en Firebase Authentication
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      // Crear un objeto usuario con el modelo especificado, sin incluir la contraseña
      const nuevoUsuario: Usuario = {
        uid,                    // UID proporcionado por Firebase Authentication
        nombreCompleto,
        email,
        password: '',           // No es seguro almacenar contraseñas en Firestore
        rol
      };

      // Guarda el nuevo usuario en Firestore en la colección 'usuarios'
      await this.firestore.collection('usuarios').doc(uid).set(nuevoUsuario);
      this.usuarioCompletoSubject.next(nuevoUsuario);

      return true;
    } catch (error) {
      // Verifica si el error es porque el correo ya está en uso
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('El correo electrónico ya está en uso. Por favor, usa otro correo.');
      } else {
        // Lanza el error tal como está para otros errores
        throw new Error('Error al registrar el usuario. Inténtalo de nuevo.');
      }
    }
  }
}
