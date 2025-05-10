import { MetodoRetiroModal } from './metodo-retiro-modal/metodo-retiro-modal.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { AddUpdateProductComponent } from './add-update-product/add-update-product.component';
import { ReactiveFormsModule } from '@angular/forms';




@NgModule({
  declarations: [
    FooterComponent,
    HeaderComponent,
    AddUpdateProductComponent,
    MetodoRetiroModal
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterLink,
    ReactiveFormsModule
  ],
  exports: [
    FooterComponent,
    HeaderComponent,
    AddUpdateProductComponent,
    MetodoRetiroModal

  ]
})
export class SharedModule { }
