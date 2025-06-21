// sucursales.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, map } from 'rxjs';
import { Sucursal } from '../models/bd.models';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {

  constructor(private firestore: AngularFirestore) { }

  getSucursales(): Observable<Sucursal[]> {
    return this.firestore.collection<Sucursal>('sucursales').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Sucursal;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }

  getSucursalesActivas(): Observable<Sucursal[]> {
    return this.firestore.collection<Sucursal>('sucursales', ref =>
      ref.where('activo', '==', true)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Sucursal;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }

  getSucursal(id: string): Observable<Sucursal> {
    return this.firestore.doc<Sucursal>(`sucursales/${id}`).valueChanges().pipe(
      map(sucursal => {
        return { id, ...sucursal } as Sucursal;
      })
    );
  }

  createSucursal(sucursal: Sucursal): Promise<any> {
    return this.firestore.collection('sucursales').add({
      ...sucursal,
      activo: sucursal.activo ?? true
    });
  }

  updateSucursal(id: string, sucursal: Partial<Sucursal>): Promise<void> {
    return this.firestore.doc(`sucursales/${id}`).update(sucursal);
  }

  deleteSucursal(id: string): Promise<void> {
    return this.firestore.doc(`sucursales/${id}`).delete();
  }

  // Alternativa para marcar como inactivo en lugar de eliminar
  desactivarSucursal(id: string): Promise<void> {
    return this.updateSucursal(id, { activo: false });
  }
}
