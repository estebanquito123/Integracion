//header.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/servicios/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  usuario: string; // Campo para almacenar el nombre completo del usuario
  private authService = inject(AuthService);
  subscriptionAuthService: Subscription;

  ngOnInit() {
    this.subscriptionAuthService = this.authService.usuarioCompleto$.subscribe(usuarioCompleto => {
      if (usuarioCompleto) {
        this.usuario = usuarioCompleto.nombreCompleto; // Muestra el nombre completo del usuario
      }
    });
  }

  ngOnDestroy() {
    this.subscriptionAuthService?.unsubscribe(); // Desuscribirse del observable del estado de autenticación
  }
}

