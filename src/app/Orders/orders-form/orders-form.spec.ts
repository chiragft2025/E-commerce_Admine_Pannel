import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdersForm } from './orders-form';

describe('OrdersForm', () => {
  let component: OrdersForm;
  let fixture: ComponentFixture<OrdersForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdersForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
