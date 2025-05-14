import { Component, OnInit, inject } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notificaciones-cliente',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
})
export class NotificacionesPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  router = inject(Router);

  notificaciones: any[] = [];
  cargando: boolean = true;

  constructor() { }

  ngOnInit() {
    this.cargarNotificaciones();
  }

  ionViewWillEnter() {
    this.cargarNotificaciones();
  }

  async cargarNotificaciones() {
    this.cargando = true;

    try {
      // Obtener el ID del usuario actual del localStorage
      const usuario = JSON.parse(localStorage.getItem('usuario'));
      if (!usuario || !usuario.uid) {
        throw new Error('No hay usuario autenticado');
      }

      // Suscribirse a las notificaciones del cliente
      this.firebaseSvc.getNotificacionesCliente(usuario.uid).subscribe(
        (notificaciones) => {
          this.notificaciones = notificaciones;
          this.cargando = false;
        },
        (error) => {
          console.error('Error al cargar notificaciones:', error);
          this.cargando = false;
          this.utilsSvc.presentToast({
            message: 'Error al cargar notificaciones',
            duration: 2000,
            color: 'danger'
          });
        }
      );
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      this.cargando = false;
      this.utilsSvc.presentToast({
        message: 'Debes iniciar sesión para ver tus notificaciones',
        duration: 2000,
        color: 'warning'
      });
      this.router.navigate(['/login']);
    }
  }

  async marcarComoLeida(notificacion: any) {
    try {
      await this.firebaseSvc.marcarNotificacionComoLeida(notificacion.id);

      // Actualizar la notificación en la lista local
      const index = this.notificaciones.findIndex(n => n.id === notificacion.id);
      if (index !== -1) {
        this.notificaciones[index].leido = true;
      }

    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      this.utilsSvc.presentToast({
        message: 'Error al actualizar la notificación',
        duration: 2000,
        color: 'danger'
      });
    }
  }

  // Método para formatear la fecha en un formato más amigable
  formatearFecha(fechaIso: string): string {
    if (!fechaIso) return 'Fecha desconocida';

    const fecha = new Date(fechaIso);
    return fecha.toLocaleString();
  }

  // Método para navegar a los detalles del pedido si se necesitara implementar después
  verDetallesPedido(ordenCompra: string) {
    // Implementar navegación a la página de detalles del pedido
    this.router.navigate(['/mis-pedidos'], { queryParams: { orden: ordenCompra } });
  }
}
