import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SucursalesClientePage } from './sucursales-cliente.page';

const routes: Routes = [
  {
    path: '',
    component: SucursalesClientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SucursalesClientePageRoutingModule {}
