import { Injectable, inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Producto, Usuario, EstadoPedido, Pedido } from '../models/bd.models';
import { getAuth, updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, getFirestore, collectionData, query, doc, deleteDoc, updateDoc, where } from '@angular/fire/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private auth = inject(AngularFireAuth);
  private firestore = inject(AngularFirestore);

  sendRecoveryEmail(email: string) {
    return this.auth.sendPasswordResetEmail(email);
  }

  getProductos() {
    const path = 'productos';
    const ref = collection(getFirestore(), path);
    return collectionData(query(ref), { idField: 'id' });
  }

  addProducto(data: any) {
    const path = 'productos';
    return addDoc(collection(getFirestore(), path), data);
  }

  updateProducto(id: string, data: any) {
    const path = `productos/${id}`;
    const docRef = doc(getFirestore(), path);
    return updateDoc(docRef, data);
  }

  deleteProducto(id: string) {
    const path = `productos/${id}`;
    const docRef = doc(getFirestore(), path);
    return deleteDoc(docRef);
  }

  async guardarCompra(compra: any) {
    const usuarioId = JSON.parse(localStorage.getItem('usuario')).uid;
    return this.firestore.collection(`usuarios/${usuarioId}/compras`).add(compra);
  }

  // Método para notificar al vendedor de un nuevo pedido
  async notificarPedidoAVendedor(pedido: any) {
    // Añadir el estado del pedido como pendiente (si no viene ya en el objeto)
    if (!pedido.estadoPedido) {
      pedido.estadoPedido = EstadoPedido.PENDIENTE;
    }

    return this.firestore.collection('pedidosPendientes').add(pedido);
  }

  // Método para obtener los pedidos por estado
  getPedidosPorEstado() {
    return this.firestore.collection<Pedido>('pedidosPendientes').valueChanges({ idField: 'id' });
  }

  // Método para obtener pedidos específicos para el bodeguero
  getPedidosBodega() {
    return this.firestore.collection<Pedido>('pedidosPendientes', ref =>
      ref.where('estadoPedido', 'in', [
        EstadoPedido.ACEPTADO,
        EstadoPedido.EN_PREPARACION,
        EstadoPedido.PREPARADO
      ])
    ).valueChanges({ idField: 'id' });
  }

  // Método para actualizar el estado de un pedido
  async actualizarEstadoPedido(pedidoId: string, nuevoEstado: EstadoPedido) {
    return this.firestore.collection('pedidosPendientes').doc(pedidoId).update({
      estadoPedido: nuevoEstado
    });
  }

  // Método para notificar al bodeguero de un pedido aceptado
  async notificarPedidoABodeguero(pedido: Pedido) {
    // Primero, buscar bodegueros disponibles
    const bodegueros = await this.firestore.collection('usuarios', ref =>
      ref.where('rol', '==', 'bodeguero')
    ).get().toPromise();

    // Asignar el pedido a un bodeguero (se podría mejorar para equilibrar la carga)
    if (bodegueros && !bodegueros.empty) {
      const bodeguero = bodegueros.docs[0].data() as Usuario;

      // Actualizar el pedido con el ID del bodeguero asignado
      await this.firestore.collection('pedidosPendientes').doc(pedido.id).update({
        bodegueroId: bodeguero.uid
      });

      // Enviar notificación push al bodeguero si tiene token
      if (bodeguero.pushToken) {
        const productosTexto = pedido.productos?.map(p => p.nombre).join(', ') || 'Sin productos';

        await fetch('https://tu-api.com/api/notificar-bodeguero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: bodeguero.pushToken,
            title: '📦 Nuevo Pedido por Preparar',
            body: `Orden: ${pedido.ordenCompra}\nProductos: ${productosTexto}`,
            data: {
              pedidoId: pedido.id,
              ordenCompra: pedido.ordenCompra,
              productos: JSON.stringify(pedido.productos)
            }
          })
        });
      }
    }
  }

  // Método para notificar al vendedor cuando un pedido está preparado
  async notificarPedidoPreparado(pedido: Pedido) {
    // Si el pedido tiene un vendedorId asignado, usarlo para enviar la notificación
    if (pedido.vendedorId) {
      const vendedorSnap = await this.firestore.collection('usuarios')
        .doc(pedido.vendedorId).get().toPromise();

      const vendedor = vendedorSnap.data() as Usuario;

      if (vendedor && vendedor.pushToken) {
        await fetch('https://tu-api.com/api/notificar-vendedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: vendedor.pushToken,
            title: '✅ Pedido Preparado',
            body: `La orden ${pedido.ordenCompra} está lista para ser entregada`,
            data: {
              pedidoId: pedido.id,
              ordenCompra: pedido.ordenCompra
            }
          })
        });
      }
    } else {
      // Si no hay vendedorId, notificar a todos los vendedores
      const vendedoresSnap = await this.firestore.collection('usuarios', ref =>
        ref.where('rol', '==', 'vendedor')
      ).get().toPromise();

      for (const doc of vendedoresSnap.docs) {
        const vendedor = doc.data() as Usuario;
        if (vendedor.pushToken) {
          await fetch('https://tu-api.com/api/notificar-vendedor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: vendedor.pushToken,
              title: '✅ Pedido Preparado',
              body: `La orden ${pedido.ordenCompra} está lista para ser entregada`,
              data: {
                pedidoId: pedido.id,
                ordenCompra: pedido.ordenCompra
              }
            })
          });
        }
      }
    }
  }

  // Método para notificar al cliente sobre el estado de su pedido
  /*async notificarCambioEstadoAlCliente(pedido: Pedido) {
    // Aquí se implementaría la lógica para enviar notificaciones al cliente
    // Esta función podría ser llamada desde los métodos que actualizan el estado del pedido
    // Por ejemplo, cuando un pedido es aceptado o rechazado

    // Ejemplo de implementación (requiere que guardemos el uid del cliente en el pedido)
    if (pedido.clienteId) {
      const clienteSnap = await this.firestore.collection('usuarios')
        .doc(pedido.clienteId).get().toPromise();

      const cliente = clienteSnap.data() as Usuario;

      if (cliente && cliente.pushToken) {
        let mensaje = '';

        switch (pedido.estadoPedido) {
          case EstadoPedido.ACEPTADO:
            mensaje = `Tu pedido #${pedido.ordenCompra} ha sido aceptado y está siendo procesado`;
            break;
          case EstadoPedido.RECHAZADO:
            mensaje = `Tu pedido #${pedido.ordenCompra} ha sido rechazado. Por favor, contacta con atención al cliente`;
            break;
          case EstadoPedido.PREPARADO:
            mensaje = `Tu pedido #${pedido.ordenCompra} está listo para ser recogido/enviado`;
            break;
          case EstadoPedido.ENTREGADO:
            mensaje = `Tu pedido #${pedido.ordenCompra} ha sido marcado como entregado. ¡Gracias por tu compra!`;
            break;
        }

        if (mensaje) {
          await fetch('https://tu-api.com/api/notificar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: cliente.pushToken,
              title: 'Actualización de tu pedido',
              body: mensaje,
              data: {
                pedidoId: pedido.id,
                ordenCompra: pedido.ordenCompra,
                estado: pedido.estadoPedido
              }
            })
          });
        }
      }
    }
  }*/

  getPedidosPendientes() {
    return this.firestore.collection('pedidosPendientes').valueChanges({ idField: 'id' });
  }

  getSucursales() {
    const ref = collection(getFirestore(), 'sucursales');
    return collectionData(query(ref), { idField: 'id' });
  }

  addSucursal(data: { nombre: string, direccion: string }) {
    const path = 'sucursales';
    return addDoc(collection(getFirestore(), path), data);
  }

  async enviarNotificacionAlVendedor(pedido: {
    productos: any[];
    metodoPago: string;
    retiro: string;
    direccion: string;
    ordenCompra: string;
  }) {
    const vendedoresSnap = await this.firestore.collection('usuarios', ref =>
      ref.where('rol', '==', 'vendedor')
    ).get().toPromise();

    for (const doc of vendedoresSnap.docs) {
      const vendedor = doc.data() as Usuario;
      if (vendedor.pushToken) {
        const productosTexto = pedido.productos?.map(p => p.nombre).join(', ') || 'Sin productos';
        const tipoEntrega = pedido.retiro === 'domicilio' ? 'Despacho a domicilio' : 'Retiro en tienda';

        await fetch('https://tu-api.com/api/notificar-vendedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: vendedor.pushToken,
            title: '🛒 Nuevo Pedido',
            body: `${tipoEntrega} - ${pedido.direccion}\nProductos: ${productosTexto}`,
            data: {
              ordenCompra: pedido.ordenCompra,
              metodoPago: pedido.metodoPago,
              retiro: pedido.retiro,
              direccion: pedido.direccion,
              productos: JSON.stringify(pedido.productos)
            }
          })
        });
      }
    }
  }

  getNotificacionesVendedor() {
    return this.firestore.collection('notificacionesVendedor', ref =>
      ref.orderBy('timestamp', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  async obtenerTransaccionPorOrden(ordenCompra: string): Promise<any | null> {
    try {
      // Try to get from transacciones collection
      const snap = await this.firestore.collection('transacciones', ref =>
        ref.where('ordenCompra', '==', ordenCompra)
      ).get().toPromise();

      if (!snap.empty) {
        return snap.docs[0].data();
      }

      // If not found, try to get from user's transacciones subcollection (backup)
      const user = await this.auth.currentUser;
      if (user) {
        const userSnap = await this.firestore.collection(`usuarios/${user.uid}/transacciones`, ref =>
          ref.where('ordenCompra', '==', ordenCompra)
        ).get().toPromise();

        if (!userSnap.empty) {
          return userSnap.docs[0].data();
        }
      }

      return null;
    } catch (error) {
      console.error('Error al obtener transacción:', error);
      return null;
    }
  }

  async actualizarInventarioDespuesDeCompra(productos: any[]) {
    try {
      for (const item of productos) {
        if (item.id) {
          // Get current product data
          const productoRef = this.firestore.doc(`productos/${item.id}`);
          const productoSnap = await productoRef.get().toPromise();

          if (productoSnap.exists) {
            const productoData = productoSnap.data() as Producto;
            const nuevoStock = Math.max(0, productoData.stock - (item.cantidad || 1));

            // Update stock
            await productoRef.update({
              stock: nuevoStock
            });

            console.log(`Stock actualizado para ${item.nombre}: ${productoData.stock} -> ${nuevoStock}`);
          }
        }
      }
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
    }
  }

  getUsuariosPorRol(roles: string[]) {
    return this.firestore.collection('usuarios', ref =>
      ref.where('rol', 'in', roles)
    ).valueChanges({ idField: 'uid' });
  }

  eliminarUsuario(uid: string) {
    return this.firestore.collection('usuarios').doc(uid).delete();
  }
}
