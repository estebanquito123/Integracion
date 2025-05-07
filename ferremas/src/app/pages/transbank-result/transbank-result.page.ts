import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

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
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      console.log('Parámetros Transbank recibidos:', params);
      const tokenWs = params['token_ws'];
      const tbkToken = params['TBK_TOKEN'];

      if (tbkToken) {
        // Transacción fallida o cancelada
        this.estado = 'fallo';
        this.datos.TBK_TOKEN = tbkToken;
        this.datos.TBK_ORDEN_COMPRA = params['TBK_ORDEN_COMPRA'];
      } else if (tokenWs) {
        // Transacción posiblemente exitosa, verificar con backend
        console.log('Verificando estado con token:', tokenWs);
        this.verificarEstadoTransaccion(tokenWs);
      } else {
        // No se recibió ningún token válido
        this.estado = 'desconocido';
      }
    });
  }

  verificarEstadoTransaccion(token: string) {
    this.cargando = true;

    this.http.get(`${environment.backendApiUrl}/pagos/verificar/${token}`)
      .subscribe(
        (response: any) => {
          console.log('Respuesta de verificación:', response);
          this.detallesTransaccion = response;

          if (response.status === 'AUTHORIZED') {
            this.estado = 'exito';
            this.datos.token_ws = token;
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
