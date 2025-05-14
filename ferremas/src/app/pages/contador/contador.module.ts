import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ContadorPageRoutingModule } from './contador-routing.module';

import { ContadorPage } from './contador.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContadorPageRoutingModule,
    SharedModule
  ],
  declarations: [ContadorPage]
})
export class ContadorPageModule {}
