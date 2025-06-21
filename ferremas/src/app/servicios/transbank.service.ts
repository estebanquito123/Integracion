// transbank.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
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
  private backendApiUrl = environment.backendApiUrl || 'https://integracion-7xjk.onrender.com/api';

  // Iniciar una transacción con Transbank a través del backend
  iniciarTransaccion(monto: number, ordenCompra: string): Observable<any> {
    const body = {
      amount: monto,
      buyOrder: ordenCompra,
      returnUrl: `${window.location.origin}/transbank-result`,
      sessionId: `session_${Date.now()}`
    };

    console.log('Enviando petición al backend:', body);
    return this.http.post(`${this.backendApiUrl}/pagos/iniciar`, body)
      .pipe(
        timeout(30000), // Añadimos un timeout de 30 segundos
        catchError(error => {
          console.error('Error en la llamada HTTP al backend:', error);
          return throwError(() => new Error('Error al comunicarse con el servidor de pagos: ' + (error.message || error.statusText)));
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
  async procesarPago(monto: number, productos: any[], retiro?: string, direccion?: string): Promise<any> {
  try {
    const ordenCompra = this.generarOrdenCompra();
    console.log('🧾 Orden de compra generada:', ordenCompra);

    const usuario = await this.afAuth.currentUser;
    if (!usuario) {
      throw new Error('Debes iniciar sesión para realizar el pago');
    }

    // Store order data in localStorage before redirecting
    localStorage.setItem('carritoWebpay', JSON.stringify(productos));
    localStorage.setItem('direccionWebpay', direccion || '');
    localStorage.setItem('retiroWebpay', retiro || '');
    localStorage.setItem('currentTransaction', ordenCompra);

    // Also store the transaction details in Firestore for recovery
    await this.firestore.collection('transacciones').add({
      ordenCompra,
      monto,
      productos,
      retiro,
      direccion,
      fechaInicio: new Date(),
      usuarioId: usuario.uid,
      estado: 'iniciada'
    });

    const transaccion = await this.guardarTransaccion({
      ordenCompra,
      monto,
      productos: productos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio
      })),
      retiro,
      direccion,
      fechaInicio: new Date()
    });

    return new Promise((resolve, reject) => {
      console.log('🔄 Iniciando transacción con Transbank...');

      this.iniciarTransaccion(monto, ordenCompra).subscribe({
        next: (response) => {
          console.log('🔄 Respuesta del backend:', response);

          if (!response.url || !response.token) {
            this.actualizarEstadoTransaccion(transaccion.id, 'error', {
              error: 'Respuesta inválida del servidor de pagos'
            });
            reject(new Error('Respuesta inválida del servidor de pagos'));
            return;
          }

          console.log('✅ Token recibido:', response.token);
          console.log('✅ URL de Webpay:', response.url);

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = response.url;

          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'token_ws';
          input.value = response.token;

          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();

          resolve(response);
        },
        error: (error) => {
          console.error('Error en iniciarTransaccion:', error);

          this.actualizarEstadoTransaccion(transaccion.id, 'fallida', {
            error: error.message || 'Error desconocido'
          });

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
    console.error('❌ Error en procesarPago:', error);
    throw error;
  }
}
}
