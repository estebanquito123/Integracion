// carrito.service.ts
import { Injectable } from '@angular/core';
import { Producto } from '../models/bd.models';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private carrito: Producto[] = [];
  private totalSubject = new BehaviorSubject<number>(0);
  private itemsSubject = new BehaviorSubject<Producto[]>([]);
  private itemCountSubject = new BehaviorSubject<number>(0);

  total$ = this.totalSubject.asObservable();
  items$ = this.itemsSubject.asObservable();
  itemCount$ = this.itemCountSubject.asObservable();

  constructor() {
    // Intentar recuperar el carrito del localStorage al iniciar
    const savedCart = localStorage.getItem('carrito');
    if (savedCart) {
      this.carrito = JSON.parse(savedCart);
      this.updateSubjects();
    }
  }

  getItems(): Producto[] {
    return [...this.carrito]; // Devolvemos una copia para evitar modificaciones directas
  }

  getTotal(): number {
    return this.carrito.reduce((total, item) => total + item.precio, 0);
  }

  getItemCount(): number {
    return this.carrito.length;
  }

  addItem(producto: Producto) {
    this.carrito.push(producto);
    this.updateSubjects();
    // Guardar en localStorage para persistencia
    this.saveToStorage();
  }

  removeItem(index: number) {
    if (index >= 0 && index < this.carrito.length) {
      this.carrito.splice(index, 1);
      this.updateSubjects();
      this.saveToStorage();
    }
  }

  clearCart() {
    this.carrito = [];
    this.updateSubjects();
    // Limpiar también en localStorage
    localStorage.removeItem('carrito');
  }

  private updateSubjects() {
    this.itemsSubject.next([...this.carrito]);
    this.totalSubject.next(this.getTotal());
    this.itemCountSubject.next(this.carrito.length);
  }

  private saveToStorage() {
    localStorage.setItem('carrito', JSON.stringify(this.carrito));
  }
setItems(productos: Producto[]) {
  this.carrito = [...productos]; // Replace current cart with new products
  this.updateSubjects();
  this.saveToStorage();
}
}
