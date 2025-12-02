import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserRoleManage } from './user-role-manage';

describe('UserRoleManage', () => {
  let component: UserRoleManage;
  let fixture: ComponentFixture<UserRoleManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserRoleManage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserRoleManage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
