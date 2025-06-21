import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProductosBodegaPage } from './productos-bodega.page';

const routes: Routes = [
  {
    path: '',
    component: ProductosBodegaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProductosBodegaPageRoutingModule {}
