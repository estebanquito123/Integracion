//firebase.service
import { Injectable, inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Usuario } from '../models/bd.models';
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


}








