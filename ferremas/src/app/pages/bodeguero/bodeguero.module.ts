import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BodegueroPageRoutingModule } from './bodeguero-routing.module';

import { BodegueroPage } from './bodeguero.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BodegueroPageRoutingModule
  ],
  declarations: [BodegueroPage]
})
export class BodegueroPageModule {}
