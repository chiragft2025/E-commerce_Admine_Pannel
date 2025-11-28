import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdersDetails } from './orders-details';

describe('OrdersDetails', () => {
  let component: OrdersDetails;
  let fixture: ComponentFixture<OrdersDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdersDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
