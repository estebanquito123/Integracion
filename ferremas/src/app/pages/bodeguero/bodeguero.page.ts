// bodeguero.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { EstadoPedido, Pedido } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-bodeguero',
  templateUrl: './bodeguero.page.html',
  styleUrls: ['./bodeguero.page.scss'],
})
export class BodegueroPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  alertCtrl = inject(AlertController);

  segmento: string = 'pendientes';
  pedidosPorPreparar: Pedido[] = [];
  pedidosEnPreparacion: Pedido[] = [];
  pedidosPreparados: Pedido[] = [];

  ngOnInit() {
    this.cargarPedidos();
  }

  ionViewWillEnter() {
    this.cargarPedidos();
  }

  cargarPedidos() {
    this.firebaseSvc.getPedidosBodega().subscribe(data => {
      // Filtrar los pedidos según su estado
      this.pedidosPorPreparar = data.filter(p => p.estadoPedido === EstadoPedido.ACEPTADO);
      this.pedidosEnPreparacion = data.filter(p => p.estadoPedido === EstadoPedido.EN_PREPARACION);
      this.pedidosPreparados = data.filter(p => p.estadoPedido === EstadoPedido.PREPARADO);
    });
  }

  cambiarSegmento() {
    // Este método se llama cuando el usuario cambia de segmento
    // No necesita implementación adicional
  }

  async iniciarPreparacion(pedido: Pedido) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Actualizar el estado del pedido a EN_PREPARACION
      await this.firebaseSvc.actualizarEstadoPedido(
        pedido.id,
        EstadoPedido.EN_PREPARACION
      );

      this.utilsSvc.presentToast({
        message: 'Pedido marcado como "En preparación"',
        duration: 2000,
        color: 'success'
      });
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      this.utilsSvc.presentToast({
        message: 'Error al procesar el pedido',
        duration: 2000,
        color: 'danger'
      });
    } finally {
      loading.dismiss();
    }
  }

  async marcarComoPedidoListo(pedido: Pedido) {
    const alert = await this.alertCtrl.create({
      header: 'Finalizar Preparación',
      message: '¿Confirmas que el pedido está listo para entregar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            const loading = await this.utilsSvc.loading();
            await loading.present();

            try {
              // Actualizar el estado del pedido a PREPARADO
              await this.firebaseSvc.actualizarEstadoPedido(
                pedido.id,
                EstadoPedido.PREPARADO
              );

              // Notificar al vendedor que el pedido está listo
              await this.firebaseSvc.notificarPedidoPreparado(pedido);

              this.utilsSvc.presentToast({
                message: 'Pedido marcado como preparado',
                duration: 2000,
                color: 'success'
              });
            } catch (error) {
              console.error('Error al completar pedido:', error);
              this.utilsSvc.presentToast({
                message: 'Error al marcar pedido como preparado',
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
}
