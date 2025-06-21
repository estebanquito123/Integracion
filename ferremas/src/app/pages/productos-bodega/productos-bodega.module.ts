import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProductosBodegaPageRoutingModule } from './productos-bodega-routing.module';

import { ProductosBodegaPage } from './productos-bodega.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProductosBodegaPageRoutingModule,
    SharedModule
  ],
  declarations: [ProductosBodegaPage]
})
export class ProductosBodegaPageModule {}
