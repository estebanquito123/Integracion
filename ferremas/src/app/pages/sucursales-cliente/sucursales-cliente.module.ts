import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SucursalesClientePageRoutingModule } from './sucursales-cliente-routing.module';

import { SucursalesClientePage } from './sucursales-cliente.page';
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SucursalesClientePageRoutingModule,
    SharedModule
],
  declarations: [SucursalesClientePage]
})
export class SucursalesClientePageModule {}
