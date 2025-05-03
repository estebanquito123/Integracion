import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendedorPage } from './vendedor.page';

describe('VendedorPage', () => {
  let component: VendedorPage;
  let fixture: ComponentFixture<VendedorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VendedorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
