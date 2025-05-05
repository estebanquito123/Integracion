import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UtilsService } from './utils.service';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TransbankService {
  private http = inject(HttpClient);
  private afAuth = inject(AngularFireAuth);
  private firestore = inject(AngularFirestore);
  private utilsSvc = inject(UtilsService);
  private router = inject(Router);

  // URL del backend que maneja la comunicación con Transbank
  // Asegúrate de configurar esto en tu environment.ts
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  // Iniciar una transacción con Transbank
  iniciarTransaccion(monto: number, ordenCompra: string): Observable<any> {
    const body = {
      amount: monto,
      buyOrder: ordenCompra,
      returnUrl: `${window.location.origin}/transbank-result`,
      sessionId: `session_${Date.now()}`
    };

    console.log('Enviando petición a Transbank:', body);
    console.log('URL de API:', `${this.apiUrl}/transbank/create`);

    return this.http.post(`${this.apiUrl}/transbank/create`, body)
      .pipe(
        catchError(error => {
          console.error('Error en la llamada HTTP a Transbank:', error);
          return throwError(() => new Error('Error al comunicarse con el servidor de pagos: ' + (error.message || error.statusText)));
        })
      );
  }

  // Confirmar una transacción después de que el usuario regresa de la página de pago
  confirmarTransaccion(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/transbank/commit`, { token_ws: token })
      .pipe(
        catchError(error => {
          console.error('Error al confirmar transacción:', error);
          return throwError(() => new Error('Error al confirmar el pago: ' + (error.message || error.statusText)));
        })
      );
  }

  // Generar un número de orden único
  generarOrdenCompra(): string {
    const fecha = new Date();
    const timestamp = fecha.getTime().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `OC${timestamp}${random}`;
  }

  // Guardar información de la transacción en Firestore
  async guardarTransaccion(data: any): Promise<any> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) throw new Error('Usuario no autenticado');

      const transaccionRef = this.firestore.collection(`usuarios/${user.uid}/transacciones`);
      const docRef = await transaccionRef.add({
        ...data,
        fechaCreacion: new Date(),
        estado: 'iniciada',
        usuarioId: user.uid
      });

      return { id: docRef.id };
    } catch (error) {
      console.error('Error al guardar transacción:', error);
      throw error;
    }
  }

  // Actualizar el estado de una transacción
  async actualizarEstadoTransaccion(transaccionId: string, estado: string, datosRespuesta?: any): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) throw new Error('Usuario no autenticado');

      await this.firestore.doc(`usuarios/${user.uid}/transacciones/${transaccionId}`).update({
        estado,
        fechaActualizacion: new Date(),
        respuesta: datosRespuesta || {}
      });
    } catch (error) {
      console.error('Error al actualizar transacción:', error);
      throw error;
    }
  }

  // Procesar el pago completo (desde la selección de productos hasta la redirección a Transbank)
  async procesarPago(monto: number, productos: any[]): Promise<any> {
    let loading = null;

    try {
      // 1. Generar orden de compra
      const ordenCompra = this.generarOrdenCompra();
      console.log('Orden de compra generada:', ordenCompra);

      // 2. Validar que el usuario esté autenticado
      const usuario = await this.afAuth.currentUser;
      if (!usuario) {
        throw new Error('Debes iniciar sesión para realizar el pago');
      }

      // 3. Guardar la transacción en Firestore
      console.log('Guardando transacción en Firestore...');
      const transaccion = await this.guardarTransaccion({
        ordenCompra,
        monto,
        productos: productos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio
        })),
        fechaInicio: new Date()
      });
      console.log('Transacción guardada con ID:', transaccion.id);

      // 4. Iniciar la transacción con Transbank
      return new Promise((resolve, reject) => {
        console.log('Iniciando transacción con Transbank...');
        this.iniciarTransaccion(monto, ordenCompra).subscribe({
          next: (response) => {
            console.log('Respuesta de Transbank recibida:', response);

            if (!response.url || !response.token) {
              this.actualizarEstadoTransaccion(transaccion.id, 'error', {
                error: 'Respuesta inválida del servidor de pagos'
              });
              reject(new Error('Respuesta inválida del servidor de pagos'));
              return;
            }

            // Guardamos información de la transacción en localStorage para recuperarla después
            localStorage.setItem('currentTransaction', JSON.stringify({
              transaccionId: transaccion.id,
              token: response.token,
              ordenCompra,
              monto
            }));

            console.log('Redirigiendo a URL de pago:', response.url);

            // Redirigir al usuario a la página de pago de Transbank
            window.location.href = response.url;
            resolve(response);
          },
          error: (error) => {
            console.error('Error en iniciarTransaccion:', error);

            // Actualizar el estado de la transacción a 'fallida'
            this.actualizarEstadoTransaccion(transaccion.id, 'fallida', {
              error: error.message || 'Error desconocido'
            }).catch(err => console.error('Error al actualizar estado de transacción:', err));

            this.utilsSvc.presentToast({
              message: 'Error al iniciar la transacción de pago',
              duration: 3000,
              color: 'danger',
              position: 'middle',
              icon: 'alert-circle-outline'
            });

            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error en procesarPago:', error);
      throw error;
    }
  }
}
