import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BodegueroPage } from './bodeguero.page';

const routes: Routes = [
  {
    path: '',
    component: BodegueroPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BodegueroPageRoutingModule {}
