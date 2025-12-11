import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Form',
        text: 'Please fill in all required fields.'
      });
      return;
    }

    // ⏳ Show Loading Modal
    Swal.fire({
      title: 'Logging in...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.auth.login(this.form.value).subscribe({
      next: (res) => {
        console.log('Login successful:', res);

        // Navigation after login
        this.router.navigateByUrl('/home').then(() => {
          // ✔ Close loading & show success after redirect
          Swal.fire({
            icon: 'success',
            title: 'Welcome!',
            timer: 1500,
            showConfirmButton: false
          });
        });
      },

      error: (err) => {
        console.error('Login failed', err);

        // ❌ Close loading spinner and show error
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'Invalid username or password',
          confirmButtonText: 'Try Again'
        });
      }
    });
  }
}
