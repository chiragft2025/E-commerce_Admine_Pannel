import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPassword implements OnDestroy {
  email = '';
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    this.error = null;

    if (!this.email) {
      this.error = 'Email address is required';
      return;
    }

    this.loading = true;

    this.auth
      .forgotPassword(this.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;

          // store email for reset-password step
          sessionStorage.setItem(
            'resetEmail',
            this.email.trim().toLowerCase()
          );

          Swal.fire({
            icon: 'success',
            title: 'OTP Sent',
            text: 'A one-time password has been sent to your email address.',
            confirmButtonText: 'Continue',
          }).then(() => {
            this.router.navigate(['/reset-password']);
          });
        },
        error: (err: any) => {
          this.loading = false;

          // backend intentionally hides user existence
          Swal.fire({
            icon: 'error',
            title: 'Request Failed',
            text: err?.error?.message || 'Unable to process request',
          });
        },
      });
  }
}
