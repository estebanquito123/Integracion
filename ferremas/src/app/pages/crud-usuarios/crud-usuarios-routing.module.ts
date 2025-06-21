import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CrudUsuariosPage } from './crud-usuarios.page';

const routes: Routes = [
  {
    path: '',
    component: CrudUsuariosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrudUsuariosPageRoutingModule {}
