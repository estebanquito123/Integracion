import { Component, inject, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Usuario } from 'src/app/models/bd.models';
import { AuthService } from 'src/app/servicios/auth.service';
import { AddUpdateUserComponent } from 'src/app/shared/add-update-user/add-update-user.component';

@Component({
  selector: 'app-crud-usuarios',
  templateUrl: './crud-usuarios.page.html',
  styleUrls: ['./crud-usuarios.page.scss'],
})
export class CrudUsuariosPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  authSvc = inject(AuthService);
  utilsSvc = inject(UtilsService);

  usuarios: Usuario[] = [];

  ngOnInit() {
    this.cargarUsuarios();
  }

  async cargarUsuarios() {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  this.firebaseSvc.getUsuariosPorRol(['vendedor', 'bodeguero', 'contador']).subscribe({
    next: (usuarios) => {
      this.usuarios = usuarios as Usuario[];
      loading.dismiss();
    },
    error: (err) => {
      console.error('Error al cargar usuarios:', err);
      loading.dismiss();
    }
  });
}

async eliminarUsuario(uid: string) {
  try {
    await this.firebaseSvc.eliminarUsuario(uid);
    this.utilsSvc.presentToast({
      message: 'Usuario eliminado correctamente',
      color: 'success',
      duration: 2000
    });
  } catch (error) {
    this.utilsSvc.presentToast({
      message: 'Error al eliminar usuario',
      color: 'danger',
      duration: 2000
    });
  }
}


// Agregar
async agregarUsuario() {
  const result = await this.utilsSvc.presentModal({
    component: AddUpdateUserComponent
  });
  if (result?.success) {
    this.cargarUsuarios();
  }
}

// Editar
async editarUsuario(usuario: Usuario) {
  const result = await this.utilsSvc.presentModal({
    component: AddUpdateUserComponent,
    componentProps: { usuario }
  });
  if (result?.success) {
    this.cargarUsuarios();
  }
}
}
