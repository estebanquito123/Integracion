// bd.models.ts (actualizado)
export interface Usuario {
  uid: string;
  nombreCompleto: string;
  email: string
  password: string;
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

// Crear un objeto que representa la compra completa
export interface DetalleCompra {
  metodoRetiro: 'retiro' | 'despacho';
  direccion: string;
  metodoPago: 'webpay' | 'transferencia';
}

// Nuevo enum para manejar el estado del pedido
export enum EstadoPedido {
  PENDIENTE = 'pendiente',
  ACEPTADO = 'aceptado',
  RECHAZADO = 'rechazado',
  EN_PREPARACION = 'en_preparacion',
  PREPARADO = 'preparado',
  ENTREGADO = 'entregado'
}

// Interfaz para los pedidos
export interface Pedido {
  id?: string;
  productos: Producto[];
  ordenCompra: string;
  metodoPago: string;
  direccion: string;
  retiro: string;
  fecha: string;
  estadoPago: string;
  estadoPedido: EstadoPedido;
  vendedorId?: string;
  bodegueroId?: string;
}
