// pedido.service.ts - Nuevo servicio para gestión de pedidos
import { Injectable, inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirebaseService } from './firebase.service';
import firebase from 'firebase/compat/app';
import { UtilsService } from './utils.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private firestore = inject(AngularFirestore);
  private firebaseSvc = inject(FirebaseService);
  private utilsSvc = inject(UtilsService);

  /**
   * Actualiza el estado de un pedido
   * @param pedidoId ID del pedido a actualizar
   * @param nuevoEstado Nuevo estado del pedido ('pendiente', 'aceptado', 'rechazado', 'preparado', 'enviado', 'entregado')
   * @param motivoRechazo Motivo opcional en caso de rechazo
   */
  async actualizarEstadoPedido(pedidoId: string, nuevoEstado: string, motivoRechazo?: string): Promise<void> {
    try {
      const updateData: any = {
        estado: nuevoEstado,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (motivoRechazo && nuevoEstado === 'rechazado') {
        updateData.motivoRechazo = motivoRechazo;
      }

      await this.firestore.collection('pedidosPendientes').doc(pedidoId).update(updateData);

      // Si el pedido es rechazado, también actualizamos en las compras del usuario
      if (nuevoEstado === 'rechazado') {
        const pedido = await this.firestore.collection('pedidosPendientes').doc(pedidoId).get().toPromise();
        const pedidoData = pedido.data();

        if (pedidoData && pedidoData['usuarioId']) {
          const comprasRef = this.firestore.collection(`usuarios/${pedidoData['usuarioId']}/compras`,
            ref => ref.where('ordenCompra', '==', pedidoData['ordenCompra']));

          const compras = await comprasRef.get().toPromise();
          compras.forEach(doc => {
            doc.ref.update({
              estadoPago: 'rechazado',
              motivoRechazo: motivoRechazo || 'Pedido rechazado por vendedor'
            });
          });
        }
      }

      return;
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      throw new Error('No se pudo actualizar el estado del pedido');
    }
  }

  /**
   * Notifica a los bodegueros de un nuevo pedido asignado
   */
  async notificarBodeguero(pedido: any): Promise<void> {
    try {
      // 1. Crear una entrada en la colección de pedidosBodega
      await this.firestore.collection('pedidosBodega').add({
        ...pedido,
        estadoBodega: 'pendiente',
        fechaAsignacion: firebase.firestore.FieldValue.serverTimestamp(),
        fechaPreparacion: null,
        asignadoPor: firebase.auth().currentUser?.uid || 'sistema'
      });

      // 2. Enviar notificación push a todos los bodegueros
      const bodegueros = await this.firebaseSvc.getUsuariosPorRol(['bodeguero']);

      for (const bodeguero of bodegueros) {
        if (bodeguero && bodeguero['pushToken']) {
          const productosTexto = pedido.productos?.map(p => p.nombre).join(', ') || 'Sin productos';

          await fetch(`${this.utilsSvc.getBackendUrl()}/api/notificar-bodeguero`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: bodeguero['pushToken'],
              title: '📦 Nuevo Pedido Asignado',
              body: `Orden: ${pedido.ordenCompra}\nProductos: ${productosTexto}`,
              data: {
                pedidoId: pedido.id,
                ordenCompra: pedido.ordenCompra,
                tipo: 'nuevoPedido'
              }
            })
          });
        }
      }

      return;
    } catch (error) {
      console.error('Error al notificar bodeguero:', error);
      throw new Error('No se pudo notificar al bodeguero');
    }
  }

  /**
   * Obtiene todos los pedidos asignados al bodeguero
   */
  getPedidosBodega(): Observable<any[]> {
    return this.firestore.collection('pedidosBodega', ref =>
      ref.orderBy('fechaAsignacion', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Marca un pedido como preparado por el bodeguero
   */
  async marcarPedidoComoPreparado(pedidoId: string, notas?: string): Promise<void> {
    try {
      // Actualizar estado en pedidosBodega
      await this.firestore.collection('pedidosBodega').doc(pedidoId).update({
        estadoBodega: 'preparado',
        fechaPreparacion: firebase.firestore.FieldValue.serverTimestamp(),
        notasPreparacion: notas || ''
      });

      // Obtener datos del pedido para actualizar también en pedidosPendientes
      const pedidoBodega = await this.firestore.collection('pedidosBodega').doc(pedidoId).get().toPromise();
      const pedidoData = pedidoBodega.data();

      if (pedidoData && pedidoData['ordenCompra']) {
        // Buscar el pedido en pedidosPendientes por ordenCompra
        const pedidosPendientesRef = this.firestore.collection('pedidosPendientes',
          ref => ref.where('ordenCompra', '==', pedidoData['ordenCompra']));

        const pedidosPendientes = await pedidosPendientesRef.get().toPromise();

        if (!pedidosPendientes.empty) {
          // Actualizar el primer resultado (debería ser único)
          await pedidosPendientes.docs[0].ref.update({
            estado: 'preparado',
            fechaPreparacion: firebase.firestore.FieldValue.serverTimestamp(),
            notasPreparacion: notas || ''
          });
        }
      }

      return;
    } catch (error) {
      console.error('Error al marcar pedido como preparado:', error);
      throw new Error('No se pudo actualizar el pedido');
    }
  }
}
