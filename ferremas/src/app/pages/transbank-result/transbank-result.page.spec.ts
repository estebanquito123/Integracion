import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransbankResultPage } from './transbank-result.page';

describe('TransbankResultPage', () => {
  let component: TransbankResultPage;
  let fixture: ComponentFixture<TransbankResultPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TransbankResultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
