import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
})
export class ResetPassword implements OnInit, OnDestroy {
  loading = false;
  verifyingOtp = false;
  otpVerified = false;
  error: string | null = null;

  email: string | null = null;

  model = {
    otp: '',
    newPassword: '',
    confirmPassword: '',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    // get email stored from forgot-password step
    this.email = sessionStorage.getItem('resetEmail');

    if (!this.email) {
      // invalid flow → redirect
      this.router.navigate(['/forgot-password']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Phase 1: Verify OTP */
  verifyOtp(): void {
    this.error = null;

    if (!this.model.otp) {
      this.error = 'OTP is required';
      return;
    }

    this.verifyingOtp = true;

    this.auth
      .verifyOtp(this.email!, this.model.otp)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.verifyingOtp = false;
          this.otpVerified = true;

          Swal.fire({
            icon: 'success',
            title: 'OTP Verified',
            text: 'You can now set a new password.',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err: any) => {
          this.verifyingOtp = false;
          this.error = err?.error?.message || 'Invalid or expired OTP';
        },
      });
  }

  /** Phase 2: Reset Password */
  submit(): void {
    if (!this.otpVerified) return;

    this.error = null;

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

    this.auth
      .resetPassword({
        email: this.email!,
        otp: this.model.otp,
        newPassword: this.model.newPassword,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;

          // cleanup
          sessionStorage.removeItem('resetEmail');

          Swal.fire({
            icon: 'success',
            title: 'Password Reset Successful',
            text: 'You can now log in with your new password.',
            confirmButtonText: 'Go to Login',
          }).then(() => {
            this.router.navigate(['/login']);
          });
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to reset password';
        },
      });
  }
}
