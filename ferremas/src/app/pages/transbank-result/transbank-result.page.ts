
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-transbank-result',
  templateUrl: './transbank-result.page.html',
  styleUrls: ['./transbank-result.page.scss'],
})
export class TransbankResultPage implements OnInit {
  estado: 'exito' | 'fallo' | 'desconocido' = 'desconocido';
  datos: any = {};
  detallesTransaccion: any = null;
  cargando: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      console.log('Parámetros Transbank:', params);
      this.datos = params;

      // Si TBK_TOKEN existe, usamos eso para verificar estado
      if (params['TBK_TOKEN']) {
        this.verificarEstadoTransaccion(params['TBK_TOKEN']);
      }
      // Si token_ws existe, probablemente es resultado directo y exitoso
      else if (params['token_ws']) {
        this.verificarEstadoTransaccion(params['token_ws']);
      }
      // Modo fallback o desconocido
      else {
        this.estado = 'desconocido';
        this.cargando = false;
      }
    });
  }

  verificarEstadoTransaccion(token: string) {
    this.cargando = true;

    // Llamar al backend para verificar el estado real de la transacción
    this.http.get(`http://localhost:3000/api/pagos/verificar/${token}`)
      .subscribe(
        (response: any) => {
          console.log('Respuesta de verificación:', response);
          this.detallesTransaccion = response;

          // Verificar si la transacción fue exitosa según la respuesta
          if (response.status === 'AUTHORIZED') {
            this.estado = 'exito';
            this.datos.token_ws = token; // Asegurar que token_ws exista para la vista
          } else {
            this.estado = 'fallo';
            this.datos.TBK_TOKEN = token;
            this.datos.TBK_ORDEN_COMPRA = response.buy_order || 'No disponible';
          }
          this.cargando = false;
        },
        (error) => {
          console.error('Error al verificar estado:', error);
          this.estado = 'fallo';
          this.datos.TBK_TOKEN = token;
          this.datos.TBK_ORDEN_COMPRA = 'Error en verificación';
          this.cargando = false;
        }
      );
  }
}
