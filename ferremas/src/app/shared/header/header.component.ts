//header.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/servicios/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  usuario: any;
  private authService = inject(AuthService);
  private router = inject(Router);
  subscriptionAuthService: Subscription;

  ngOnInit() {
    this.subscriptionAuthService = this.authService.usuarioCompleto$.subscribe(usuarioCompleto => {
      if (usuarioCompleto) {
        this.usuario = usuarioCompleto;
      }
    });
  }

  irAlCarrito() {
    this.router.navigate(['/carro']);
  }

  ngOnDestroy() {
    this.subscriptionAuthService?.unsubscribe();
  }
}
