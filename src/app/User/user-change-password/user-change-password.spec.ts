import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserChangePassword } from './user-change-password';

describe('UserChangePassword', () => {
  let component: UserChangePassword;
  let fixture: ComponentFixture<UserChangePassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserChangePassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserChangePassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
