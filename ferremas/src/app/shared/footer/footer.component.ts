//footer.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/servicios/auth.service';
import { Usuario } from 'src/app/models/bd.models';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {

  usuario: Usuario | null = null; // Objeto que contendrá los datos del usuario, incluido el rol
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    // Suscribirse al observable para obtener los datos completos del usuario (incluido el rol)
    this.authService.usuarioCompleto$.subscribe(usuario => {
      this.usuario = usuario;
    });
  }

  redirigirHome() {
    // Verifica el rol del usuario y redirige a la página correspondiente
    if (this.usuario?.rol === 'administrador') {
      this.router.navigate(['/admin']);
    } else if (this.usuario?.rol === 'cliente') {
      this.router.navigate(['/cliente']);
    }
    else if (this.usuario?.rol === 'bodeguero') {
      this.router.navigate(['/bodeguero']);
    }
    else if (this.usuario?.rol === 'vendedor') {
      this.router.navigate(['/vendedor']);
    }
  }

  logout() {
    // Llama a logout en AuthService y redirige al inicio de sesión
    this.authService.logout();
    this.router.navigate(['/']); // Redirige al inicio de sesión después de cerrar sesión
  }
}
