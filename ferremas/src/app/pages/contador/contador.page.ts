//contador.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { EstadoPago, EstadoPedido, Pedido } from 'src/app/models/bd.models';
import { AlertController } from '@ionic/angular';
import { formatDate, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es'

@Component({
  selector: 'app-contador',
  templateUrl: './contador.page.html',
  styleUrls: ['./contador.page.scss'],
})
export class ContadorPage implements OnInit {
  // Inyecciones
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  alertCtrl = inject(AlertController);

  // Variables de estado
  segmento: string = 'transferencias';
  pedidosPendientesPago: Pedido[] = [];
  pedidosEntregados: Pedido[] = [];

  // Estadísticas
  totalPedidosEntregados: number = 0;
  totalIngresos: number = 0;
  ingresosPorTransferencia: number = 0;
  ingresosPorWebpay: number = 0;

  constructor() {
    registerLocaleData(localeEs, 'es');
  }

  ngOnInit() {
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  cargarDatos() {
    // Cargar pedidos pendientes de pago por transferencia
    this.firebaseSvc.getPedidosPorTransferenciaPendientes().subscribe(pedidos => {
      this.pedidosPendientesPago = pedidos;
    });

    // Cargar pedidos entregados
    this.firebaseSvc.getPedidosEntregados().subscribe(pedidos => {
      this.pedidosEntregados = pedidos;

      // Calcular estadísticas
      this.calcularEstadisticas(pedidos);
    });
  }

  calcularEstadisticas(pedidos: Pedido[]) {
  this.totalPedidosEntregados = pedidos.length;

  // Reiniciar variables
  this.totalIngresos = 0;
  this.ingresosPorTransferencia = 0;
  this.ingresosPorWebpay = 0;

  // Calcular totales con método más robusto
  pedidos.forEach(pedido => {
    let montoTotal = 0;

    // Si el monto total ya está calculado, usarlo
    if (pedido.montoTotal && typeof pedido.montoTotal === 'number') {
      montoTotal = pedido.montoTotal;
    }
    // Si no, calcularlo a partir de los productos
    else if (pedido.productos && Array.isArray(pedido.productos)) {
      montoTotal = pedido.productos.reduce((total, producto) => {
        // Verificar si el producto tiene cantidad especificada
        const cantidad = producto.cantidad || 1;
        return total + (producto.precio * cantidad);
      }, 0);
    }

    this.totalIngresos += montoTotal;

    if (pedido.metodoPago === 'transferencia') {
      this.ingresosPorTransferencia += montoTotal;
    } else if (pedido.metodoPago === 'webpay') {
      this.ingresosPorWebpay += montoTotal;
    }
  });
}

  calcularMontoTotalPedido(pedido: Pedido): number {
    if (!pedido.productos || !Array.isArray(pedido.productos)) {
      return 0;
    }

    return pedido.productos.reduce((total, producto) => {
      return total + (producto.precio || 0);
    }, 0);
  }

  cambiarSegmento() {
    // Este método se llama cuando el usuario cambia de segmento
    // No necesita implementación adicional ya que el ngModel se actualiza automáticamente
  }

  async confirmarPagoTransferencia(pedido: Pedido) {
  const alert = await this.alertCtrl.create({
    header: 'Confirmar Pago',
    message: '¿Has verificado que el pago por transferencia fue recibido correctamente?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Confirmar Pago',
        handler: async () => {
          const loading = await this.utilsSvc.loading();
          await loading.present();

          try {
            // Actualizar el estado del pago a PAGADO
            await this.firebaseSvc.actualizarEstadoPago(pedido.id, EstadoPago.PAGADO);

            // Si no tiene monto total calculado, calcularlo y guardarlo
            if (!pedido.montoTotal) {
              const montoTotal = this.calcularMontoTotalPedido(pedido);
              await this.firebaseSvc.actualizarMontoTotalPedido(pedido.id, montoTotal);
            }

            // Marcar como verificado por el contador
            await this.firebaseSvc.marcarPedidoVerificado(pedido.id, true);

            // Notificar al vendedor sobre el pago confirmado
            // Este método debe asegurarse de que el vendedor reciba el pedido para procesarlo
            await this.firebaseSvc.notificarPagoConfirmadoAlVendedor(pedido);

            this.utilsSvc.presentToast({
              message: 'Pago confirmado correctamente',
              duration: 2000,
              color: 'success'
            });

            // Recargar datos
            this.cargarDatos();
          } catch (error) {
            console.error('Error al confirmar pago:', error);
            this.utilsSvc.presentToast({
              message: 'Error al confirmar el pago',
              duration: 2000,
              color: 'danger'
            });
          } finally {
            loading.dismiss();
          }
        }
      }
    ]
  });

  await alert.present();
}


  async rechazarPagoTransferencia(pedido: Pedido) {
    const alert = await this.alertCtrl.create({
      header: 'Rechazar Pago',
      message: '¿Estás seguro de que quieres rechazar este pago? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Rechazar',
          handler: async () => {
            const loading = await this.utilsSvc.loading();
            await loading.present();

            try {
              // Actualizar el estado del pago a RECHAZADO
              await this.firebaseSvc.actualizarEstadoPago(pedido.id, EstadoPago.RECHAZADO);

              // Marcar como verificado por el contador
              await this.firebaseSvc.marcarPedidoVerificado(pedido.id, true);

              this.utilsSvc.presentToast({
                message: 'Pago rechazado',
                duration: 2000,
                color: 'success'
              });

              // Recargar datos
              this.cargarDatos();
            } catch (error) {
              console.error('Error al rechazar pago:', error);
              this.utilsSvc.presentToast({
                message: 'Error al rechazar el pago',
                duration: 2000,
                color: 'danger'
              });
            } finally {
              loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async generarReporte() {
  const alert = await this.alertCtrl.create({
    header: 'Generar Reporte',
    message: '¿Deseas generar un reporte del periodo actual?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Generar',
        handler: async () => {
          const loading = await this.utilsSvc.loading();
          await loading.present();

          try {
            const ahora = new Date();
            // Usamos una alternativa más simple para obtener el nombre del mes
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const nombreMes = meses[ahora.getMonth()] + ' ' + ahora.getFullYear();

            // Primer día del mes actual
            const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            // Último día del mes actual
            const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

            const reporte = {
              periodo: nombreMes,
              fechaInicio: primerDiaMes.toISOString(),
              fechaFin: ultimoDiaMes.toISOString(),
              totalVentas: this.totalIngresos,
              totalPedidos: this.totalPedidosEntregados,
              pedidosEntregados: this.totalPedidosEntregados,
              ventasPorMetodoPago: {
                webpay: this.ingresosPorWebpay,
                transferencia: this.ingresosPorTransferencia
              },
              fechaGeneracion: new Date().toISOString(),
              generadoPor: JSON.parse(localStorage.getItem('usuario') || '{}').uid || ''
            };

            await this.firebaseSvc.generarReporteFinanciero(reporte);

            this.utilsSvc.presentToast({
              message: 'Reporte generado correctamente',
              duration: 2000,
              color: 'success'
            });
          } catch (error) {
            console.error('Error al generar reporte:', error);
            this.utilsSvc.presentToast({
              message: 'Error al generar el reporte',
              duration: 2000,
              color: 'danger'
            });
          } finally {
            loading.dismiss();
          }
        }
      }
    ]
  });

  await alert.present();
}

// SOLUCIÓN 6: Actualiza el método formatearFecha en contador.page.ts
// para que funcione sin depender de formatDate con locale
formatearFecha(fecha: string): string {
  if (!fecha) return 'N/A';

  try {
    const date = new Date(fecha);

    // Formatear la fecha manualmente sin depender de formatDate
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();
    const hora = date.getHours().toString().padStart(2, '0');
    const minutos = date.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
  } catch (e) {
    return fecha;
  }
}
}
