import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomersForm } from './customers-form';

describe('CustomersForm', () => {
  let component: CustomersForm;
  let fixture: ComponentFixture<CustomersForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomersForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomersForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
