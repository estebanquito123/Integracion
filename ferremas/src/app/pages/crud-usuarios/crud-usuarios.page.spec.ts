import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrudUsuariosPage } from './crud-usuarios.page';

describe('CrudUsuariosPage', () => {
  let component: CrudUsuariosPage;
  let fixture: ComponentFixture<CrudUsuariosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CrudUsuariosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
