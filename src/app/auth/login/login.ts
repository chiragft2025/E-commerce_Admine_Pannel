import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Router, RouterLinkActive, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,                // <-- required for imports to work in Angular 20+
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  form!: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: Auth, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    this.auth.login(this.form.value).subscribe({
      next: res => {
        console.log('Login observable next:', res);
        console.log('Stored token now ->', localStorage.getItem('access_token'));
        this.router.navigateByUrl('/home').then(ok => console.log('navigation success:', ok));
      },
      error: err => { console.error('Login failed', err); this.error="login fail invalid credential"; }
    });
  }
}
