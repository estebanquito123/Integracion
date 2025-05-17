import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SucursalesClientePage } from './sucursales-cliente.page';

describe('SucursalesClientePage', () => {
  let component: SucursalesClientePage;
  let fixture: ComponentFixture<SucursalesClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SucursalesClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
