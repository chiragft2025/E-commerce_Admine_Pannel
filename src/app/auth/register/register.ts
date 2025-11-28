import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Route, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {

  form!: FormGroup;
  loading = false;
  passwordmismatch = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: Auth, private router: Router) {
    // initialize the form here
    this.form = this.fb.group({
      userName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { userName, email, password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.error = 'Passwords do not match';
      this.passwordmismatch = true;
      return;
    }

    this.loading = true;
    this.auth.register({ userName, email, password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Registration failed';
      }
    });
  }

}
