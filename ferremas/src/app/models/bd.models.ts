
export interface Usuario {
  uid: string;
  nombreCompleto: string;
  email: string
  password:string;
  rol: string;
  pushToken?: string;
}

export interface Producto {
  id: string;
  imagen: string;
  nombre: string;
  precio: number;
  stock: number;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

// crear un objeto que representa la compra completa
export interface DetalleCompra {
  metodoRetiro: 'retiro' | 'despacho';
  direccion: string;
  metodoPago: 'webpay' | 'transferencia';
}

