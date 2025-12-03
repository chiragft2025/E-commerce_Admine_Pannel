import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './customers-form.html',
  styleUrls: ['./customers-form.scss']
})
export class CustomerForm implements OnInit {

  form!: FormGroup;
  id: number | null = null;
  isEdit = false;
  saving = false;
  error: string | null = null; // global / non-field server error

  constructor(
    private fb: FormBuilder,
    private cs: CustomerService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: ['']
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.isEdit = true;
      this.load();
    }
  }

  load() {
    this.cs.get(this.id!).subscribe({
      next: (c) => this.form.patchValue(c),
      error: (e) => console.error(e)
    });
  }

  private clearControlDuplicateError(controlName: string) {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;
    const errs = { ...(ctrl.errors || {}) };
    if (errs['duplicate']) {
      delete errs['duplicate'];
    }
    ctrl.setErrors(Object.keys(errs).length ? errs : null);
  }

  private setControlDuplicateError(controlName: string) {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;
    const existing = ctrl.errors || {};
    ctrl.setErrors({ ...existing, duplicate: true });
    ctrl.markAsTouched();
  }

  private normalizeServerMessage(err: HttpErrorResponse): string {
    if (!err) return 'An unexpected error occurred';

    // If backend returned a plain string
    if (typeof err.error === 'string') {
      return err.error;
    }

    // If backend returned an object
    if (err.error && typeof err.error === 'object') {
      // Common shapes: { message: "..." } or { errors: { FullName: ["..."], Email: ["..."] } }
      if (err.error.message && typeof err.error.message === 'string') {
        return err.error.message;
      }

      if (err.error.errors && typeof err.error.errors === 'object') {
        // Prefer FullName or Email specific messages if present
        const errorsObj = err.error.errors;
        const fullNameKey = Object.keys(errorsObj).find(k => k.toLowerCase() === 'fullname' || k.toLowerCase() === 'fullName' || k.toLowerCase() === 'full name');
        if (fullNameKey && Array.isArray(errorsObj[fullNameKey]) && errorsObj[fullNameKey].length > 0) {
          return errorsObj[fullNameKey][0];
        }
        const emailKey = Object.keys(errorsObj).find(k => k.toLowerCase() === 'email');
        if (emailKey && Array.isArray(errorsObj[emailKey]) && errorsObj[emailKey].length > 0) {
          return errorsObj[emailKey][0];
        }

        // fallback: try to stringify a small portion
        try {
          return JSON.stringify(err.error);
        } catch {
          return 'An unexpected error occurred';
        }
      }

      // fallback: try to stringify
      try {
        return JSON.stringify(err.error);
      } catch {
        return 'An unexpected error occurred';
      }
    }

    // fallback to HttpErrorResponse.message
    return err.message || 'An unexpected error occurred';
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    // reset previous server errors
    this.saving = true;
    this.error = null;
    this.clearControlDuplicateError('fullName');
    this.clearControlDuplicateError('email');

    const payload = this.form.value;

    const handleError = (err: HttpErrorResponse) => {
      this.saving = false;

      const msg = this.normalizeServerMessage(err).toString();

      // if the server indicates duplicate full name
      if (err.status === 400 && msg && msg.toLowerCase().includes('full') && msg.toLowerCase().includes('name') && msg.toLowerCase().includes('exist')) {
        this.setControlDuplicateError('fullName');
        return;
      }

      // if the server indicates duplicate email
      if (err.status === 400 && msg && msg.toLowerCase().includes('email') && msg.toLowerCase().includes('exist')) {
        this.setControlDuplicateError('email');
        return;
      }

      // If server returned a direct "Customer full name already exists" or "Customer email already exists"
      if (err.status === 400 && msg) {
        // handle cases like "Customer full name already exists" or "Customer email already exists"
        const lower = msg.toLowerCase();
        if (lower.includes('full name') && lower.includes('exist')) {
          this.setControlDuplicateError('fullName');
          return;
        }
        if (lower.includes('email') && lower.includes('exist')) {
          this.setControlDuplicateError('email');
          return;
        }
      }

      // otherwise show global error (used by your template)
      this.error = msg || 'An unexpected error occurred';
    };

    const onSuccessCreate = () => {
      this.saving = false;
      this.router.navigateByUrl('/customers');
    };

    const onSuccessUpdate = () => {
      this.saving = false;
      this.router.navigateByUrl('/customers');
    };

    if (this.isEdit) {
      this.cs.update(this.id!, payload).subscribe({
        next: onSuccessUpdate,
        error: handleError
      });
    } else {
      this.cs.create(payload).subscribe({
        next: onSuccessCreate,
        error: handleError
      });
    }
  }

  cancel() { this.router.navigateByUrl('/customers'); }
}
