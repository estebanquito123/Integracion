//firebase.service.ts
import { Injectable, inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Producto, Usuario, EstadoPedido, Pedido, EstadoPago, ReporteFinanciero} from '../models/bd.models';
import { getAuth, updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, getFirestore, collectionData, query, doc, deleteDoc, updateDoc, where } from '@angular/fire/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

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

        await fetch('https://integracion-7xjk.onrender.com/api/notificar-bodeguero', {
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

  for (const doc of vendedoresSnap.docs) {
    const vendedor = doc.data() as Usuario;
    if (vendedor && vendedor.pushToken) {
      const productosTexto = pedido.productos && Array.isArray(pedido.productos) ?
        pedido.productos.map(p => p.nombre || 'Producto').join(', ') :
        'Sin productos';

      await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: vendedor.pushToken,
          title: '💰 Pago Confirmado',
          body: `Orden ${pedido.ordenCompra || 'sin número'}: Pago por transferencia verificado por contabilidad`,
          data: {
            ordenCompra: pedido.ordenCompra || '',
            metodoPago: pedido.metodoPago || '',
            productos: JSON.stringify(pedido.productos || [])
          }
        })
      });
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
}

  // Método para notificar al vendedor cuando un pedido está preparado
  async notificarPedidoPreparado(pedido: Pedido) {
    // Si el pedido tiene un vendedorId asignado, usarlo para enviar la notificación
    if (pedido.vendedorId) {
      const vendedorSnap = await this.firestore.collection('usuarios')
        .doc(pedido.vendedorId).get().toPromise();

      const vendedor = vendedorSnap.data() as Usuario;

      if (vendedor && vendedor.pushToken) {
        await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
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
          await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
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
    const vendedoresSnap = await this.firestore.collection('usuarios', ref =>
      ref.where('rol', '==', 'vendedor')
    ).get().toPromise();

    for (const doc of vendedoresSnap.docs) {
      const vendedor = doc.data() as Usuario;
      if (vendedor.pushToken) {
        const productosTexto = pedido.productos?.map(p => p.nombre).join(', ') || 'Sin productos';
        const tipoEntrega = pedido.retiro === 'domicilio' ? 'Despacho a domicilio' : 'Retiro en tienda';

        await fetch('https://integracion-7xjk.onrender.com/api/notificar-vendedor', {
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

// Método para notificar al cliente que su pedido está listo para despacho
async notificarClientePedidoListo(pedido: Pedido) {
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
      clienteId: pedido.clienteId || 'desconocido',
      tipo: 'pedido_listo'
    });

    // Si el cliente tiene token de notificación push, enviar notificación
    if (pedido.clienteId) {
      const clienteSnap = await this.firestore.collection('usuarios')
        .doc(pedido.clienteId).get().toPromise();

      const cliente = clienteSnap.data() as Usuario;

      if (cliente && cliente.pushToken) {
        await fetch('https://integracion-7xjk.onrender.com/notificar-cliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: cliente.pushToken,
            title: '🎉 Tu pedido está listo',
            body: `Tu pedido con orden ${pedido.ordenCompra} está listo para ser entregado o retirado.`,
            data: {
              pedidoId: pedido.id,
              ordenCompra: pedido.ordenCompra,
              tipo: 'pedido_listo'
            }
          })
        });
      }
    }

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







}

