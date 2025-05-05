import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TransbankResultPage } from './transbank-result.page';

const routes: Routes = [
  {
    path: '',
    component: TransbankResultPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TransbankResultPageRoutingModule {}
