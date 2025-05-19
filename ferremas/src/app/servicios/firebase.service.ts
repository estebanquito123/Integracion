//firebase.service.ts
import { Injectable, inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Producto, Usuario, EstadoPedido, Pedido, EstadoPago, ReporteFinanciero} from '../models/bd.models';
import { getAuth, updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, getFirestore, collectionData, query, doc, deleteDoc, updateDoc, where } from '@angular/fire/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private auth = inject(AngularFireAuth);
  private firestore = inject(AngularFirestore);

  async enviarNotificacionAlCliente(clienteId: string, titulo: string, mensaje: string, datos: any = {}) {
  try {
    if (!clienteId) {
      console.error('ID de cliente no proporcionado');
      return false;
    }

    // Buscar el usuario en Firestore para obtener su token
    const clienteSnap = await this.firestore.collection('usuarios')
      .doc(clienteId).get().toPromise();

    const cliente = clienteSnap.data() as Usuario;

    if (!cliente || !cliente.fcmToken) {
      console.warn('Cliente sin token de notificación:', clienteId);
      return false;
    }

    // Guardar la notificación en la colección de notificaciones
    await this.firestore.collection('notificacionesCliente').add({
      titulo,
      mensaje,
      clienteId,
      fecha: new Date().toISOString(),
      leido: false,
      datos
    });

    // Enviar notificación push mediante nuestra API
    const response = await fetch('https://integracion-7xjk.onrender.com/api/notificar-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: cliente.fcmToken,
        title: titulo,
        body: mensaje,
        data: datos
      })
    });

    const result = await response.json();
    console.log('Resultado de notificación push:', result);

    return result.success;
  } catch (error) {
    console.error('Error al enviar notificación al cliente:', error);
    return false;
  }
}

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
  return this.firestore.collection<Pedido>('pedidosPendientes', ref =>
    // Solo mostrar pedidos con estado de pago PAGADO
    ref.where('estadoPago', '==', EstadoPago.PAGADO)
  ).valueChanges({ idField: 'id' });
}

  getPedidosPorTransferenciaPendientes(): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>('pedidosPendientes', ref =>
      ref.where('metodoPago', '==', 'transferencia')
         .where('estadoPago', '==', EstadoPago.PENDIENTE)
    ).valueChanges({ idField: 'id' });
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

  getPedidosEntregados(): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>('pedidosPendientes', ref =>
      ref.where('estadoPedido', '==', EstadoPedido.ENTREGADO)
    ).valueChanges({ idField: 'id' });
  }

async actualizarEstadoPago(pedidoId: string, nuevoEstado: EstadoPago): Promise<void> {
    return this.firestore.collection('pedidosPendientes').doc(pedidoId).update({
      estadoPago: nuevoEstado
    });
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

  // Asignar el pedido a un bodeguero
  if (bodegueros && !bodegueros.empty) {
    const bodeguero = bodegueros.docs[0].data() as Usuario;

    // Actualizar el pedido con el ID del bodeguero asignado
    await this.firestore.collection('pedidosPendientes').doc(pedido.id).update({
      bodegueroId: bodeguero.uid
    });

    // Enviar notificación push al bodeguero si tiene token
    if (bodeguero.fcmToken) {
      // Crear un resumen corto de los productos en lugar de enviar toda la información
      const productosResumen = pedido.productos && pedido.productos.length > 0
        ? pedido.productos.length === 1
          ? pedido.productos[0].nombre
          : `${pedido.productos[0].nombre} y ${pedido.productos.length - 1} más`
        : 'Sin productos';

      try {
        await fetch('https://integracion-7xjk.onrender.com/api/notificar-bodeguero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: bodeguero.fcmToken,
            title: '📦 Nuevo Pedido por Preparar',
            body: `Orden: ${pedido.ordenCompra}\nProductos: ${productosResumen}`,
            data: {
              pedidoId: pedido.id,
              ordenCompra: pedido.ordenCompra,
              // No enviar productos como JSON string
              cantidadProductos: String(pedido.productos?.length || 0)
            }
          }),
          signal: AbortSignal.timeout(10000) // 10 segundos máximo
        });
      } catch (error) {
        console.error('Error al notificar al bodeguero:', error);
      }
    }
  }
}

  async marcarPedidoVerificado(pedidoId: string, verificado: boolean = true): Promise<void> {
    return this.firestore.collection('pedidosPendientes').doc(pedidoId).update({
      verificadoPorContador: verificado
    });
  }

  getReportesFinancieros(): Observable<ReporteFinanciero[]> {
    return this.firestore.collection<ReporteFinanciero>('reportesFinancieros', ref =>
      ref.orderBy('fechaGeneracion', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  // Generar un nuevo reporte financiero
  async generarReporteFinanciero(reporte: ReporteFinanciero): Promise<any> {
    return this.firestore.collection('reportesFinancieros').add(reporte);
  }

  // Calcular el monto total de un pedido
  calcularMontoTotalPedido(pedido: Pedido): number {
    if (!pedido.productos || !Array.isArray(pedido.productos)) {
      return 0;
    }

    return pedido.productos.reduce((total, producto) => {
      return total + (producto.precio || 0);
    }, 0);
  }

  // Actualizar monto total de un pedido (si no fue calculado previamente)
  async actualizarMontoTotalPedido(pedidoId: string, montoTotal: number): Promise<void> {
    return this.firestore.collection('pedidosPendientes').doc(pedidoId).update({
      montoTotal: montoTotal
    });
  }

  // Método para obtener pedidos por rango de fechas
  getPedidosPorRangoFechasEntrega(fechaInicio: string, fechaFin: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>('pedidosPendientes', ref =>
      ref.where('estadoPedido', '==', EstadoPedido.ENTREGADO)
         .where('fechaEntrega', '>=', fechaInicio)
         .where('fechaEntrega', '<=', fechaFin)
    ).valueChanges({ idField: 'id' });
  }


// Notificar al vendedor de un pago confirmado por el contador
async notificarPagoConfirmadoAlVendedor(pedido: Pedido): Promise<void> {
  if (!pedido || !pedido.id) return;

  // Actualizar el pedido para indicar que ahora está listo para que lo procese el vendedor
  await this.firestore.collection('pedidosPendientes').doc(pedido.id).update({
    estadoPago: EstadoPago.PAGADO,
    estadoPedido: EstadoPedido.PENDIENTE // Mantenerlo como pendiente para que el vendedor lo vea
  });

  // Obtener vendedores
  const vendedoresSnap = await this.firestore.collection('usuarios', ref =>
    ref.where('rol', '==', 'vendedor')
  ).get().toPromise();

  // Crear un resumen simple del pedido (evitando enviar toda la información)
  const productosResumen = pedido.productos && Array.isArray(pedido.productos) && pedido.productos.length > 0
    ? `${pedido.productos.length} producto(s)`
    : 'Sin productos';

  for (const doc of vendedoresSnap.docs) {
    const vendedor = doc.data() as Usuario;
    if (vendedor && vendedor.fcmToken) {
      try {
        await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: vendedor.fcmToken,
            title: '💰 Pago Confirmado',
            body: `Orden ${pedido.ordenCompra || 'sin número'}: Pago por transferencia verificado`,
            data: {
              pedidoId: pedido.id || '',  // Solo enviar IDs y datos esenciales
              ordenCompra: pedido.ordenCompra || '',
              tipo: 'pago_confirmado'
              // No enviar productos ni detalles completos
            }
          }),
          signal: AbortSignal.timeout(10000) // 10 segundos máximo
        });
      } catch (error) {
        console.error(`Error enviando notificación a vendedor ${vendedor.uid}:`, error);
        // Continuar con otros vendedores aunque uno falle
      }
    }
  }

  // Registrar notificación en la colección para que los vendedores la vean en la app
  await this.firestore.collection('notificacionesVendedor').add({
    titulo: '💰 Pago Confirmado',
    mensaje: `Orden ${pedido.ordenCompra || 'sin número'}: Pago por transferencia verificado por contabilidad`,
    fecha: new Date().toISOString(),
    leido: false,
    pedidoId: pedido.id || '',
    ordenCompra: pedido.ordenCompra || '',
    tipo: 'pago_confirmado'
  });

  // También guardar los detalles BÁSICOS del pedido en Firestore (no los productos completos)
  await this.firestore.collection('detallesPedidos').doc(pedido.ordenCompra || pedido.id).set({
    ordenCompra: pedido.ordenCompra || '',
    metodoPago: pedido.metodoPago || '',
    estadoPago: EstadoPago.PAGADO,
    cantidadProductos: pedido.productos?.length || 0,
    fechaConfirmacion: new Date().toISOString()
    // No guardar productos completos aquí
  });
}

  // Método para notificar al vendedor cuando un pedido está preparado
  async notificarPedidoPreparado(pedido: Pedido) {
    // Si el pedido tiene un vendedorId asignado, usarlo para enviar la notificación
    if (pedido.vendedorId) {
      const vendedorSnap = await this.firestore.collection('usuarios')
        .doc(pedido.vendedorId).get().toPromise();

      const vendedor = vendedorSnap.data() as Usuario;

      if (vendedor && vendedor.fcmToken) {
        await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: vendedor.fcmToken,
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
        if (vendedor.fcmToken) {
          await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: vendedor.fcmToken,
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

  getPedidosPendientes() {
    return this.firestore.collection('pedidosPendientes').valueChanges({ idField: 'id' });
  }

  getSucursales(): Observable<any[]> {
    return this.firestore.collection('sucursales', ref =>
      ref.where('activo', '==', true)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
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
  try {
    const vendedoresSnap = await this.firestore.collection('usuarios', ref =>
      ref.where('rol', '==', 'vendedor')
    ).get().toPromise();

    // Create a simplified version of products to avoid payload size issues
    const productosSimplificados = pedido.productos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      cantidad: p.cantidad || 1
    }));

    // Guardar en colección de notificaciones
    await this.firestore.collection('notificacionesVendedor').add({
      titulo: '🛒 Nuevo Pedido',
      mensaje: `Orden: ${pedido.ordenCompra} - Método: ${pedido.metodoPago}`,
      fecha: new Date().toISOString(),
      leido: false,
      ordenCompra: pedido.ordenCompra,
      tipo: 'nuevo_pedido'
    });

    let notificacionesEnviadas = 0;

    for (const doc of vendedoresSnap.docs) {
      const vendedor = doc.data() as Usuario;
      if (vendedor.fcmToken) {
        // Create a brief summary text instead of listing all products
        const productosResumen = pedido.productos.length === 1
          ? pedido.productos[0].nombre
          : `${pedido.productos[0].nombre} y ${pedido.productos.length - 1} producto(s) más`;

        const tipoEntrega = pedido.retiro === 'domicilio' ? 'Despacho a domicilio' : 'Retiro en tienda';

        try {
          const response = await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: vendedor.fcmToken,
              title: '🛒 Nuevo Pedido',
              body: `${tipoEntrega} - Orden: ${pedido.ordenCompra}`,
              data: {
                ordenCompra: pedido.ordenCompra,
                metodoPago: pedido.metodoPago,
                retiro: pedido.retiro,
                itemCount: String(pedido.productos.length),
                tipo: 'nuevo_pedido'
                // No longer sending the full products array
              }
            }),
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000) // 10 seconds maximum
          });

          const result = await response.json();
          if (result.success) {
            notificacionesEnviadas++;
          }

          console.log(`Notificación enviada a vendedor ${vendedor.nombreCompleto}:`, result);
        } catch (error) {
          console.error(`Error enviando notificación a vendedor ${vendedor.uid}:`, error);
          // Continue with other vendors even if one fails
        }
      }
    }

    // Also store the full order data in Firestore for access from the app
    await this.firestore.collection('detallesPedidos').doc(pedido.ordenCompra).set({
      productos: pedido.productos,
      metodoPago: pedido.metodoPago,
      retiro: pedido.retiro,
      direccion: pedido.direccion,
      fecha: new Date().toISOString()
    });

    return notificacionesEnviadas > 0;
  } catch (error) {
    console.error('Error al enviar notificación al vendedor:', error);
    return false;
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

// Método para notificar al cliente que su pedido está listo para despacho
async notificarClientePedidoListo(pedido: Pedido): Promise<boolean> {
  try {
    // Si el pedido no tiene clienteId, intentamos encontrar al cliente por otros medios
    if (!pedido.clienteId) {
      // Buscar en las compras para identificar al cliente que realizó esta orden
      const comprasRef = this.firestore.collection('usuarios').get().toPromise();
      const usuarios = (await comprasRef).docs;

      let clienteEncontrado = null;

      // Revisar las colecciones de compras de cada usuario
      for (const usuario of usuarios) {
        const compras = await this.firestore.collection(`usuarios/${usuario.id}/compras`, ref =>
          ref.where('ordenCompra', '==', pedido.ordenCompra)
        ).get().toPromise();

        if (!compras.empty) {
          clienteEncontrado = usuario.id;
          // Actualizar el pedido con el ID del cliente para futuras referencias
          await this.registrarClienteEnPedido(pedido.id, clienteEncontrado);
          break;
        }
      }

      if (clienteEncontrado) {
        pedido.clienteId = clienteEncontrado;
      } else {
        console.warn('No se pudo identificar al cliente para la orden:', pedido.ordenCompra);
        return false;
      }
    }

    // Crear una notificación en la colección de notificaciones del cliente
    await this.firestore.collection('notificacionesCliente').add({
      titulo: '🎉 Tu pedido está listo',
      mensaje: `Tu pedido con orden ${pedido.ordenCompra} está listo para ser entregado o retirado.`,
      leido: false,
      fecha: new Date().toISOString(),
      pedidoId: pedido.id,
      ordenCompra: pedido.ordenCompra,
      clienteId: pedido.clienteId,
      tipo: 'pedido_listo'
    });

    // Si el cliente tiene token de notificación push, enviar notificación
    if (pedido.clienteId) {
      const clienteSnap = await this.firestore.collection('usuarios')
        .doc(pedido.clienteId).get().toPromise();

      const cliente = clienteSnap.data() as Usuario;

      if (cliente && cliente.fcmToken) {
        // Validar token antes de enviar
        const tokenValido = await this.validarTokenFCM(cliente.fcmToken);

        if (!tokenValido) {
          console.warn('Token FCM inválido para el cliente:', pedido.clienteId);
          // Si el token es inválido, actualizar el registro del usuario
          await this.firestore.collection('usuarios').doc(pedido.clienteId).update({
            fcmToken: null // Eliminar token inválido
          });
          // Aún así, la notificación se guardó en la colección
          return true;
        }

        try {
          const response = await fetch('https://integracion-7xjk.onrender.com/api/notificar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: cliente.fcmToken,
              title: '🎉 Tu pedido está listo',
              body: `Tu pedido con orden ${pedido.ordenCompra} está listo para ser entregado o retirado.`,
              data: {
                pedidoId: pedido.id,
                ordenCompra: pedido.ordenCompra,
                tipo: 'pedido_listo'
              }
            }),
            // Agregar timeout para evitar esperas excesivas
            signal: AbortSignal.timeout(10000) // 10 segundos máximo
          });

          const result = await response.json();
          console.log('Resultado notificación cliente:', result);

          if (!result.success) {
            console.warn('Error al enviar push al cliente:', result.error);
            // Registrar el error para diagnóstico
            await this.registrarErrorNotificacion(pedido.clienteId, cliente.fcmToken, result.error);
          }

          return result.success;
        } catch (error) {
          console.error('Error en la solicitud de notificación:', error);
          // Registrar el error para diagnóstico
          await this.registrarErrorNotificacion(pedido.clienteId, cliente.fcmToken, error.message);
          return false;
        }
      }
    }

    // Si llegamos aquí, no hay token FCM pero la notificación se guardó en la colección
    return true;
  } catch (error) {
    console.error('Error al notificar al cliente:', error);
    return false;
  }
}

// Método para obtener notificaciones de un cliente
getNotificacionesCliente(clienteId: string) {
  return this.firestore.collection('notificacionesCliente', ref =>
    ref.where('clienteId', '==', clienteId)
    .orderBy('fecha', 'desc')
  ).valueChanges({ idField: 'id' });
}

// Método para marcar una notificación como leída
marcarNotificacionComoLeida(notificacionId: string) {
  return this.firestore.collection('notificacionesCliente').doc(notificacionId).update({
    leido: true
  });
}

// Método para actualizar el modelo de pedido con el ID del cliente al crear un pedido
async registrarClienteEnPedido(pedidoId: string, clienteId: string) {
  return this.firestore.collection('pedidosPendientes').doc(pedidoId).update({
    clienteId: clienteId
  });
}

async enviarPedidoAlContador(pedido: any) {
  try {
    // Guardamos el pedido en la colección general pero marcamos que está pendiente de verificación del contador
    return this.firestore.collection('pedidosPendientes').add({
      ...pedido,
      estadoPago: EstadoPago.PENDIENTE,
      estadoPedido: EstadoPedido.PENDIENTE,
      verificadoPorContador: false
    });
  } catch (error) {
    console.error('Error al enviar pedido al contador:', error);
    throw error;
  }
}
async notificarPagoPendienteAContador(pedido: any) {
  if (
    !pedido.ordenCompra ||
    !pedido.metodoPago ||
    !pedido.fecha ||
    !pedido.estadoPago ||
    !pedido.estadoPedido ||
    !pedido.clienteId ||
    !Array.isArray(pedido.productos)
  ) {
    throw new Error('Datos incompletos del pedido');
  }

  pedido.verificadoPorContador = false;
  pedido.montoTotal = pedido.montoTotal || this.calcularMontoTotalPedido(pedido);

  return this.firestore.collection('pedidosPendientes').add(pedido);
}

updateUserData(userId: string, userData: any) {
  return this.firestore.collection('usuarios').doc(userId).update(userData);
}

guardarTokenDispositivo(uid: string, token: string): Promise<void> {
  return this.firestore.collection('usuarios').doc(uid).set(
    { fcmToken: token },
    { merge: true }
  );
}

async registrarTokenPush(token: string, uid: string): Promise<boolean> {
  if (!uid || !token) return false;

  try {
    await this.firestore.collection('usuarios').doc(uid).update({
      pushToken: token
    });

    await this.firestore.collection('tokens_push').add({
      token,
      userId: uid,
      platform: this.getPlatform(),
      date: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    console.log('Token push registrado correctamente para usuario:', uid);
    return true;
  } catch (error) {
    console.error('Error al registrar token push:', error);
    return false;
  }
}

getPlatform(): string {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  if (/android/i.test(userAgent)) {
    return 'android';
  }
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }
  return 'web';
}

async validarTokenFCM(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const response = await fetch('https://integracion-7xjk.onrender.com/api/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000) // 5 segundos máximo
    });

    if (!response.ok) return false;

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error validando token FCM:', error);
    return false;
  }
}

async registrarErrorNotificacion(usuarioId: string, token: string, error: any): Promise<void> {
  try {
    await this.firestore.collection('errores_push').add({
      usuarioId,
      token,
      error: typeof error === 'object' ? JSON.stringify(error) : error,
      fecha: new Date().toISOString(),
      plataforma: this.getPlatform()
    });
  } catch (err) {
    console.error('Error registrando diagnóstico de push:', err);
  }
}

// Método para registrar notificación cuando falla el envío push
async registrarNotificacionSinPush(pedido: Pedido): Promise<void> {
  if (!pedido.id || !pedido.clienteId) return;

  try {
    // Actualizar el estado del pedido para indicar que está listo para retiro
    await this.firestore.collection('pedidosPendientes').doc(pedido.id).update({
      notificadoCliente: true,
      fechaNotificacion: new Date().toISOString()
    });

    // Registrar en el log del sistema
    await this.firestore.collection('log_sistema').add({
      tipo: 'notificacion_fallida',
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      ordenCompra: pedido.ordenCompra,
      fecha: new Date().toISOString(),
      mensaje: 'Notificación guardada en sistema pero no enviada por push'
    });
  } catch (error) {
    console.error('Error registrando notificación sin push:', error);
  }
}

}

