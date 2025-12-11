import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Auth } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  form!: FormGroup;
  loading = false;
  passwordmismatch = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: Auth, private router: Router) {
    // initialize the form here - using "username" to match register.html
    this.form = this.fb.group(
      {
        username: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatch } // validator function
    );
  }

  // validator: returns null when OK, error object when mismatch
  passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    return p === c ? null : { passwordMismatch: true };
  }

  submit() {
    // clear previous error state
    this.error = null;
    this.passwordmismatch = false;

    if (this.form.invalid) {
      // If the form-level validator flagged a mismatch, set flags for template
      const hasMismatch = !!this.form.errors?.['passwordMismatch'];
      if (hasMismatch) {
        this.passwordmismatch = true;
        this.error = 'Passwords do not match';
      }

      this.form.markAllAsTouched();
      // show a warning modal to guide the user
      Swal.fire({
        icon: 'warning',
        title: 'Invalid form',
        // pass a non-null string (fallback) so TS won't complain
        text: this.error ?? 'Please fill in all required fields correctly.',
      });
      return;
    }

    const { username, email, password, confirmPassword } = this.form.value;

    // Double-check mismatch guard (extra safety)
    if (password !== confirmPassword) {
      this.passwordmismatch = true;
      this.error = 'Passwords do not match';
      Swal.fire({
        icon: 'error',
        title: 'Password mismatch',
        text: 'Passwords do not match. Please correct and try again.',
      });
      return;
    }

    // show loading modal and prevent outside click
    Swal.fire({
      title: 'Registering...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.loading = true;

    this.auth.register({ userName: username, email, password }).subscribe({
      next: () => {
        // On success, navigate then show success; keep loading modal visible until navigation completes
        this.router.navigate(['/login']).then(
          () => {
            // close loading and show success toast/modal
            Swal.close();
            Swal.fire({
              icon: 'success',
              title: 'Registration successful',
              text: 'You can now login with your credentials',
              timer: 1500,
              showConfirmButton: false,
            });
            this.loading = false;
          },
          (navErr) => {
            // navigation failed - still close loading and show success message and log navigation error
            Swal.close();
            Swal.fire({
              icon: 'success',
              title: 'Registration successful',
              text: 'Registration succeeded but navigation failed. Please go to login manually.',
              confirmButtonText: 'OK',
            });
            console.error('Navigation error after register:', navErr);
            this.loading = false;
          }
        );
      },
      error: (err) => {
        // Close loading and show error modal
        Swal.close();
        this.loading = false;

        // try to extract a friendly message from server response
        const serverMsgRaw = err?.error?.message ?? err?.message ?? undefined;
        const serverMsg: string | undefined = serverMsgRaw ?? undefined;
        this.error = serverMsg ?? 'Registration failed';

        // check for password mismatch returned from server or other validations
        if (err?.status === 400 && serverMsg?.toLowerCase().includes('password')) {
          this.passwordmismatch = true;
        }

        Swal.fire({
          icon: 'error',
          title: 'Registration failed',
          // pass serverMsg or a fallback string; never pass `null`
          text: serverMsg ?? 'Registration failed. Please try again.',
          confirmButtonText: 'Try Again',
        });
      },
    });
  }
}
