export interface Usuario {
  uid: string;
  nombreCompleto: string;
  email: string
  password: string;
  rol: string; // cliente, vendedor, bodeguero, contador
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

// Enum para manejar el estado del pedido
export enum EstadoPedido {
  PENDIENTE = 'pendiente',
  ACEPTADO = 'aceptado',
  RECHAZADO = 'rechazado',
  EN_PREPARACION = 'en_preparacion',
  PREPARADO = 'preparado',
  ENTREGADO = 'entregado'
}

// Enum para manejar el estado del pago
export enum EstadoPago {
  PENDIENTE = 'pendiente',
  PAGADO = 'pagado',
  RECHAZADO = 'rechazado',
  REEMBOLSADO = 'reembolsado'
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
  estadoPago: EstadoPago | string;
  estadoPedido: EstadoPedido;
  vendedorId?: string;
  bodegueroId?: string;
  clienteId?: string;
  usuarioId?: string;
  montoTotal?: number; // Agregado para facilitar cálculos de contabilidad
  fechaEntrega?: string; // Fecha cuando se entregó el pedido
  verificadoPorContador?: boolean; // Flag para que el contador sepa qué pedidos ya revisó
}

// Interfaz para transacciones
export interface Transaccion {
  id?: string;
  ordenCompra: string;
  monto: number;
  productos: Producto[];
  retiro?: string;
  direccion?: string;
  fechaInicio: Date;
  usuarioId: string;
  estado: 'iniciada' | 'pagado' | 'fallida' | 'error';
  respuesta?: any;
}

// Nueva interfaz para el reporte financiero (para el contador)
export interface ReporteFinanciero {
  id?: string;
  periodo: string; // ej: "Mayo 2025"
  fechaInicio: string;
  fechaFin: string;
  totalVentas: number;
  totalPedidos: number;
  pedidosEntregados: number;
  ventasPorMetodoPago: {
    webpay: number;
    transferencia: number;
  };
  fechaGeneracion: string;
  generadoPor: string; // UID del contador
}
