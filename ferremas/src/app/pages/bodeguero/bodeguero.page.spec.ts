import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BodegueroPage } from './bodeguero.page';

describe('BodegueroPage', () => {
  let component: BodegueroPage;
  let fixture: ComponentFixture<BodegueroPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BodegueroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
