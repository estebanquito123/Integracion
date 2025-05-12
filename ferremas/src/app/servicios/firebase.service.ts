//firebase.service
import { Injectable, inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Producto, Usuario } from '../models/bd.models';
import { getAuth, updateProfile, createUserWithEmailAndPassword  } from 'firebase/auth';
import { addDoc, collection, getFirestore, collectionData, query, doc, deleteDoc, updateDoc} from '@angular/fire/firestore';
import {AngularFirestore} from '@angular/fire/compat/firestore'

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private auth = inject(AngularFireAuth);
  private firestore= inject(AngularFirestore)

  sendRecoveryEmail(email: string) {
    return this.auth.sendPasswordResetEmail(email); // Utiliza la instancia de AngularFireAuth
  }

  getProductos() {
    const path = 'productos';
    const ref = collection(getFirestore(), path);
    return collectionData(query(ref), { idField: 'id' });
  }

  // Agregar un nuevo producto a la colección global `productos`
  addProducto(data: any) {
    const path = 'productos';
    return addDoc(collection(getFirestore(), path), data);
  }

  // Actualizar un producto específico en la colección `productos`
  updateProducto(id: string, data: any) {
    const path = `productos/${id}`;
    const docRef = doc(getFirestore(), path);
    return updateDoc(docRef, data);
  }

  // Eliminar un producto específico de la colección `productos`
  deleteProducto(id: string) {
    const path = `productos/${id}`;
    const docRef = doc(getFirestore(), path);
    return deleteDoc(docRef);
  }

  async guardarCompra(compra: any) {
    const usuarioId = JSON.parse(localStorage.getItem('usuario')).uid; // Obtener el ID del usuario logueado
    return this.firestore.collection(`usuarios/${usuarioId}/compras`).add(compra);
}
async notificarPedidoAVendedor(pedido: any) {
  return this.firestore.collection('pedidosPendientes').add(pedido);
}

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


}















