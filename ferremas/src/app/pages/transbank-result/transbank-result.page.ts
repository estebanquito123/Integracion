// ✅ transbank-result.page.ts actualizado para recuperar datos desde transacciones si localStorage está vacío
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';

@Component({
  selector: 'app-transbank-result',
  templateUrl: './transbank-result.page.html',
  styleUrls: ['./transbank-result.page.scss'],
})
export class TransbankResultPage implements OnInit {
  estado: 'exito' | 'fallo' | 'desconocido' | null = null;
  datos: any = {};
  detallesTransaccion: any = null;
  cargando: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private firebaseSvc: FirebaseService,
    private router: Router,
    private utilsSvc: UtilsService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tokenWs = params['token_ws'];
      const tbkToken = params['TBK_TOKEN'];

      if (tbkToken) {
        this.estado = 'fallo';
        this.datos.TBK_TOKEN = tbkToken;
        this.datos.TBK_ORDEN_COMPRA = params['TBK_ORDEN_COMPRA'];
      } else if (tokenWs) {
        this.verificarEstadoTransaccion(tokenWs);
      } else {
        this.estado = 'desconocido';
      }
    });
  }

  verificarEstadoTransaccion(token: string) {
    this.cargando = true;

    this.http.get(`${environment.backendApiUrl}/pagos/verificar/${token}`)
      .subscribe(
        (response: any) => {
          this.detallesTransaccion = response;

          if (response.status === 'AUTHORIZED') {
            this.estado = 'exito';
            this.datos.token_ws = token;
            this.registrarPedidoYNotificar(response);
          } else {
            this.estado = 'fallo';
            this.datos.TBK_TOKEN = token;
            this.datos.TBK_ORDEN_COMPRA = response.buy_order || 'No disponible';
          }

          this.cargando = false;
        },
        (error) => {
          this.estado = 'fallo';
          this.datos.TBK_TOKEN = token;
          this.datos.TBK_ORDEN_COMPRA = 'Error en verificación';
          this.cargando = false;
        }
      );
  }

  async registrarPedidoYNotificar(transaccion: any) {
  const ordenCompra = transaccion.buy_order;
  const metodoPago = 'webpay';

  // First, try to get data from localStorage
  let productos = JSON.parse(localStorage.getItem('carritoWebpay') || '[]');
  let direccion = localStorage.getItem('direccionWebpay') || '';
  let retiro = localStorage.getItem('retiroWebpay') || '';

  // Debug logs
  console.log('Datos de localStorage:', { productos, direccion, retiro });

  // If data is missing, try to get from Firestore
  if (!productos.length || !direccion || !retiro) {
    console.log('Intentando recuperar datos desde Firestore para orden:', ordenCompra);
    const transData = await this.firebaseSvc.obtenerTransaccionPorOrden(ordenCompra);
    console.log('Datos recuperados de Firestore:', transData);

    if (transData) {
      productos = transData.productos || productos;
      direccion = transData.direccion || direccion;
      retiro = transData.retiro || retiro;
    }
  }

  // If we still don't have products, use a fallback
  if (!productos.length) {
    console.error('No se pudieron recuperar los productos del pedido');
    this.utilsSvc.presentToast({
      message: 'Error al procesar el pago: datos incompletos',
      duration: 3000,
      color: 'danger'
    });
    return;
  }

  // Register purchase in user's collection
  try {
    for (const producto of productos) {
      await this.firebaseSvc.guardarCompra({
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        fecha: new Date().toISOString(),
        ordenCompra,
        estadoPago: 'pagado',
        metodoPago,
        direccion,
        retiro
      });
    }

    // Notify the seller (save to pedidosPendientes collection)
    const pedidoData = {
      productos,
      ordenCompra,
      metodoPago,
      direccion,
      retiro,
      fecha: new Date().toISOString(),
      estadoPago: 'pagado'
    };

    await this.firebaseSvc.notificarPedidoAVendedor(pedidoData);
    console.log('Pedido guardado correctamente en pedidosPendientes');

    // Send push notification to seller
    await this.firebaseSvc.enviarNotificacionAlVendedor(pedidoData);
    console.log('Notificación push enviada al vendedor');

    // Clean up localStorage
    localStorage.removeItem('carritoWebpay');
    localStorage.removeItem('direccionWebpay');
    localStorage.removeItem('retiroWebpay');
    localStorage.removeItem('currentTransaction');

    this.utilsSvc.presentToast({
      message: 'Pago procesado correctamente',
      duration: 2000,
      color: 'success'
    });

  } catch (error) {
    console.error('Error al registrar el pedido:', error);
    this.utilsSvc.presentToast({
      message: 'Error al registrar el pedido',
      duration: 3000,
      color: 'danger'
    });
  }
}
}
