// vendedor.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { EstadoPedido, Pedido } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-vendedor',
  templateUrl: './vendedor.page.html',
  styleUrls: ['./vendedor.page.scss'],
})
export class VendedorPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  alertCtrl = inject(AlertController);

  segmento: string = 'pendientes';
  pedidosPendientes: Pedido[] = [];
  pedidosAceptados: Pedido[] = [];
  pedidosListoDespacho: Pedido[] = [];
  pedidosRechazados: Pedido[] = [];

  ngOnInit() {
    this.cargarPedidos();
  }

  ionViewWillEnter() {
    this.cargarPedidos();
  }

  cargarPedidos() {
    this.firebaseSvc.getPedidosPorEstado().subscribe(data => {
      // Filtrar los pedidos según su estado
      this.pedidosPendientes = data.filter(p => p.estadoPedido === EstadoPedido.PENDIENTE);
      this.pedidosAceptados = data.filter(p =>
        p.estadoPedido === EstadoPedido.ACEPTADO ||
        p.estadoPedido === EstadoPedido.EN_PREPARACION
      );
      this.pedidosListoDespacho = data.filter(p => p.estadoPedido === EstadoPedido.PREPARADO);
      this.pedidosRechazados = data.filter(p => p.estadoPedido === EstadoPedido.RECHAZADO);
    });
  }

  cambiarSegmento() {
    // Este método se llama cuando el usuario cambia de segmento
    // No necesita implementación adicional ya que el ngModel se actualiza automáticamente
  }

  obtenerEstadoTexto(estado: EstadoPedido): string {
    switch (estado) {
      case EstadoPedido.PENDIENTE:
        return 'Pendiente';
      case EstadoPedido.ACEPTADO:
        return 'Aceptado - Enviado a bodega';
      case EstadoPedido.RECHAZADO:
        return 'Rechazado';
      case EstadoPedido.EN_PREPARACION:
        return 'En preparación';
      case EstadoPedido.PREPARADO:
        return 'Listo para entrega';
      case EstadoPedido.ENTREGADO:
        return 'Entregado';
      default:
        return 'Desconocido';
    }
  }

  async aceptarPedido(pedido: Pedido) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Actualizar el estado del pedido a ACEPTADO
      await this.firebaseSvc.actualizarEstadoPedido(pedido.id, EstadoPedido.ACEPTADO);

      // Notificar al bodeguero
      await this.firebaseSvc.notificarPedidoABodeguero(pedido);

      this.utilsSvc.presentToast({
        message: 'Pedido aceptado y enviado a bodega',
        duration: 2000,
        color: 'success'
      });
    } catch (error) {
      console.error('Error al aceptar pedido:', error);
      this.utilsSvc.presentToast({
        message: 'Error al procesar el pedido',
        duration: 2000,
        color: 'danger'
      });
    } finally {
      loading.dismiss();
    }
  }

  async rechazarPedido(pedido: Pedido) {
    const alert = await this.alertCtrl.create({
      header: 'Rechazar Pedido',
      message: '¿Estás seguro de que quieres rechazar este pedido?',
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
              await this.firebaseSvc.actualizarEstadoPedido(pedido.id, EstadoPedido.RECHAZADO);

              // Opcionalmente, notificar al cliente que su pedido fue rechazado
              // await this.firebaseSvc.notificarRechazoAlCliente(pedido);

              this.utilsSvc.presentToast({
                message: 'Pedido rechazado correctamente',
                duration: 2000,
                color: 'success'
              });
            } catch (error) {
              console.error('Error al rechazar pedido:', error);
              this.utilsSvc.presentToast({
                message: 'Error al rechazar el pedido',
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

  async marcarComoEntregado(pedido: Pedido) {
    const alert = await this.alertCtrl.create({
      header: 'Entregar Pedido',
      message: '¿Confirmas que el pedido ha sido entregado al cliente?',
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
              await this.firebaseSvc.actualizarEstadoPedido(pedido.id, EstadoPedido.ENTREGADO);

              // Opcionalmente, también podríamos actualizar el inventario aquí si no se hizo antes
              await this.firebaseSvc.actualizarInventarioDespuesDeCompra(pedido.productos);

              this.utilsSvc.presentToast({
                message: 'Pedido marcado como entregado',
                duration: 2000,
                color: 'success'
              });
            } catch (error) {
              console.error('Error al marcar pedido como entregado:', error);
              this.utilsSvc.presentToast({
                message: 'Error al procesar la entrega',
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

async notificarClientePedidoListo(pedido: Pedido) {
  const alert = await this.alertCtrl.create({
    header: 'Notificar al Cliente',
    message: '¿Deseas enviar una notificación al cliente informando que su pedido está listo para ser entregado?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Enviar Notificación',
        handler: async () => {
          const loading = await this.utilsSvc.loading();
          await loading.present();

          try {
            // Verificar si tenemos el ID del cliente
            if (!pedido.clienteId) {
              this.utilsSvc.presentToast({
                message: 'No se pudo identificar el cliente para este pedido. Intentando buscar...',
                duration: 2000,
                color: 'warning'
              });
            }
            
            // Verificar si el pedido tiene información completa
            if (!pedido.id || !pedido.ordenCompra) {
              throw new Error('Información del pedido incompleta');
            }

            // Intentar enviar la notificación al cliente
            const result = await this.firebaseSvc.notificarClientePedidoListo(pedido);

            if (result) {
              this.utilsSvc.presentToast({
                message: 'Notificación enviada al cliente correctamente',
                duration: 2000,
                color: 'success'
              });
            } else {
              // Método alternativo si falla la notificación push
              await this.firebaseSvc.registrarNotificacionSinPush(pedido);
              
              this.utilsSvc.presentToast({
                message: 'No se pudo enviar notificación push, pero se guardó en el sistema',
                duration: 3000,
                color: 'warning'
              });
            }
          } catch (error) {
            console.error('Error al notificar al cliente:', error);
            this.utilsSvc.presentToast({
              message: 'Error al enviar la notificación. Intente más tarde.',
              duration: 3000,
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

async validarPushToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://integracion-7xjk.onrender.com/api/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error validando token push:', error);
    return false;
  }
}
}