import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TransbankResultPageRoutingModule } from './transbank-result-routing.module';

import { TransbankResultPage } from './transbank-result.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TransbankResultPageRoutingModule,
    SharedModule
  ],
  declarations: [TransbankResultPage]
})
export class TransbankResultPageModule {}
