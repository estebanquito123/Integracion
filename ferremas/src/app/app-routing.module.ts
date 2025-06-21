import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'reset-password',
    loadChildren: () => import('./pages/reset-password/reset-password.module').then( m => m.ResetPasswordPageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'registrar',
    loadChildren: () => import('./pages/registrar/registrar.module').then( m => m.RegistrarPageModule)
  },
  {
    path: 'logout',
    loadChildren: () => import('./pages/logout/logout.module').then( m => m.LogoutPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.module').then( m => m.AdminPageModule)
  },
  {
    path: 'cliente',
    loadChildren: () => import('./pages/cliente/cliente.module').then( m => m.ClientePageModule)
  },
  {
    path: 'vendedor',
    loadChildren: () => import('./pages/vendedor/vendedor.module').then( m => m.VendedorPageModule)
  },
  {
    path: 'carro',
    loadChildren: () => import('./pages/carro/carro.module').then( m => m.CarroPageModule)
  },  {
    path: 'transbank-result',
    loadChildren: () => import('./pages/transbank-result/transbank-result.module').then( m => m.TransbankResultPageModule)
  },
  {
    path: 'bodeguero',
    loadChildren: () => import('./pages/bodeguero/bodeguero.module').then( m => m.BodegueroPageModule)
  },
  {
    path: 'contador',
    loadChildren: () => import('./pages/contador/contador.module').then( m => m.ContadorPageModule)
  },
  {
    path: 'crud-usuarios',
    loadChildren: () => import('./pages/crud-usuarios/crud-usuarios.module').then( m => m.CrudUsuariosPageModule)
  },
  {
    path: 'notificaciones',
    loadChildren: () => import('./pages/notificaciones/notificaciones.module').then( m => m.NotificacionesPageModule)
  },
  {
    path: 'productos-bodega',
    loadChildren: () => import('./pages/productos-bodega/productos-bodega.module').then( m => m.ProductosBodegaPageModule)
  },
  {
    path: 'sucursales',
    loadChildren: () => import('./pages/sucursales/sucursales.module').then( m => m.SucursalesPageModule)
  },
  {
    path: 'sucursales-cliente',
    loadChildren: () => import('./pages/sucursales-cliente/sucursales-cliente.module').then( m => m.SucursalesClientePageModule)
  },


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
