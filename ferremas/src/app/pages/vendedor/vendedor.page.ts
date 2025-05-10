import { Component, OnInit, inject } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';

@Component({
  selector: 'app-vendedor',
  templateUrl: './vendedor.page.html',
  styleUrls: ['./vendedor.page.scss'],
})
export class VendedorPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  pedidos: any[] = [];

  ngOnInit() {
    this.firebaseSvc.getPedidosPendientes().subscribe(data => {
      this.pedidos = data;
    });
  }
}
