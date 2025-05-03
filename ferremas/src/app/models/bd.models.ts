
export interface Usuario {
  uid: string;
  nombreCompleto: string;
  email: string
  password:string;
  rol: string;
}

export interface Producto {
  id: string;
  imagen: string;
  nombre: string;
  precio: number;
}
