import { Component, OnInit, inject } from '@angular/core';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { Producto } from 'src/app/models/bd.models';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Router } from '@angular/router';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { TransbankService } from 'src/app/servicios/transbank.service';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/servicios/auth.service';
import { firstValueFrom } from 'rxjs'; // Importamos firstValueFrom para manejar observables como promesas

@Component({
  selector: 'app-carro',
  templateUrl: './carro.page.html',
  styleUrls: ['./carro.page.scss'],
})
export class CarroPage implements OnInit {
  productos: Producto[] = [];
  total = 0;

  // Inyección de servicios
  carritoService = inject(CarritoService);
  utilsSvc = inject(UtilsService);
  router = inject(Router);
  firebaseSvc = inject(FirebaseService);
  transbankService = inject(TransbankService);
  alertController = inject(AlertController);
  authService = inject(AuthService);

  ngOnInit() {
    this.actualizarCarrito();
  }

  ionViewWillEnter() {
    this.actualizarCarrito();
  }

  actualizarCarrito() {
    this.productos = this.carritoService.getItems();
    this.total = this.carritoService.getTotal();
  }

  eliminarProducto(index: number) {
    this.carritoService.removeItem(index);
    this.actualizarCarrito();
    this.utilsSvc.presentToast({
      message: 'Producto eliminado del carrito',
      duration: 1500,
      color: 'success',
      position: 'bottom'
    });
  }

  vaciarCarrito() {
    this.carritoService.clearCart();
    this.productos = [];
    this.total = 0;
    this.utilsSvc.presentToast({
      message: 'Carrito vaciado correctamente',
      duration: 1500,
      color: 'success',
      position: 'bottom'
    });
  }

  finalizarCompra() {
    const body = {
      amount: 1000,
      buyOrder: 'orden_' + Math.floor(Math.random() * 1000000),
      sessionId: 'sesion_' + Math.floor(Math.random() * 1000000),
      returnUrl: 'http://localhost:3000/public/retorno.html'
    };

    fetch('http://localhost:3000/api/pagos/iniciar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      if (data.token && data.url) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'token_ws';
        input.value = data.token;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      } else {
        console.error('No se recibió token ni URL');
      }
    })
    .catch(err => {
      console.error('Error al iniciar transacción:', err);
    });
  }

  async pagarConTransbank() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Verificar si hay productos
      if (this.productos.length === 0) {
        throw new Error('No hay productos en el carrito');
      }

      // El total debe ser un número positivo
      if (this.total <= 0) {
        throw new Error('El monto a pagar debe ser mayor a cero');
      }

      console.log('Iniciando pago con Transbank por:', this.total);

      // Procesar el pago con Transbank
      await this.transbankService.procesarPago(
        this.total,
        this.productos
      );

      // La redirección a Webpay se maneja en el servicio de Transbank
      // El loading se cerrará en el catch o en el servicio

    } catch (error) {
      console.error('Error al procesar el pago con Transbank:', error);
      loading.dismiss();

      this.utilsSvc.presentToast({
        message: 'Error al iniciar el proceso de pago: ' + (error.message || 'Error desconocido'),
        duration: 3000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    }
  }

  async pagarAlRetirar() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Crear orden con identificador único
      const ordenCompra = this.transbankService.generarOrdenCompra();

      // Guardar cada producto como una compra con estado pendiente
      for (const producto of this.productos) {
        const compra = {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          fecha: new Date().toISOString(),
          ordenCompra: ordenCompra,
          estadoPago: 'pendiente',
          metodoPago: 'efectivo_al_retirar'
        };
        await this.firebaseSvc.guardarCompra(compra);
      }

      // Vaciamos el carrito después de registrar la compra
      this.carritoService.clearCart();
      this.productos = [];
      this.total = 0;

      this.utilsSvc.presentToast({
        message: '¡Pedido registrado con éxito! Paga al retirar tu compra.',
        duration: 3000,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });

      // Redirigimos al cliente a la página principal
      this.router.navigate(['/cliente']);

    } catch (error) {
      console.error('Error al procesar pago al retirar:', error);
      this.utilsSvc.presentToast({
        message: 'Error al registrar la compra: ' + (error.message || 'Error desconocido'),
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    } finally {
      loading.dismiss();
    }
  }
}
