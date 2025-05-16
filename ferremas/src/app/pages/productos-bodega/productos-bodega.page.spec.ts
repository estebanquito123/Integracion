import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductosBodegaPage } from './productos-bodega.page';

describe('ProductosBodegaPage', () => {
  let component: ProductosBodegaPage;
  let fixture: ComponentFixture<ProductosBodegaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductosBodegaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
