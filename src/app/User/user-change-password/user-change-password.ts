import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from '../../services/UserService';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-change-password.html',
  styleUrls: ['./user-change-password.scss'],
})
export class UserChangePassword implements OnDestroy {
  loading = false;
  error: string | null = null;
  sucess: boolean = false;

  model = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  private destroy$ = new Subject<void>();

  constructor(private userService: UserService, private router: Router) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    this.error = null;
    this.sucess=false

    if (!this.model.currentPassword) {
      this.error = 'Current password is required';
      return;
    }

    if (!this.model.newPassword) {
      this.error = 'New password is required';
      return;
    }

    if (this.model.newPassword.length < 6) {
      this.error = 'New password must be at least 6 characters long';
      return;
    }

    if (this.model.newPassword !== this.model.confirmPassword) {
      this.error = 'New password and confirmation do not match';
      return;
    }

    this.loading = true;

    this.userService
    .changePassword(this.model)
    .subscribe({
      next: () => {
        this.loading = false;
        this.sucess = true;
        // SweetAlert success stays
         setTimeout(() => {
            localStorage.removeItem('access_token');
            this.router.navigate(['/login']);
          }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to change password';
      },
    });
  }

  /**
   * Frontend validation (mirrors backend rules)
   */
  private validate(): boolean {
    if (!this.model.currentPassword) {
      this.showError('Current password is required');
      return false;
    }

    if (!this.model.newPassword) {
      this.showError('New password is required');
      return false;
    }

    if (this.model.newPassword.length < 6) {
      this.showError('New password must be at least 6 characters long');
      return false;
    }

    if (!this.model.confirmPassword) {
      this.showError('Confirm password is required');
      return false;
    }

    if (this.model.newPassword !== this.model.confirmPassword) {
      this.showError('New password and confirmation do not match');
      return false;
    }

    return true;
  }

  private showError(message: string): void {
    Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: message,
      confirmButtonText: 'OK',
    });
  }
}
