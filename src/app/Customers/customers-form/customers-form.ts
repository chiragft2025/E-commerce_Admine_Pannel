import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService, Paged } from '../../services/customer.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

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

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    timer: 1800,
    showConfirmButton: false,
    timerProgressBar: true
  });

  constructor(
    private fb: FormBuilder,
    private cs: CustomerService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', [Validators.required,Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['',[Validators.required,Validators.maxLength(12),Validators.minLength(10)]],
      address: ['',[ Validators.required]]
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.isEdit = true;
      this.load();
    }
  }

  load() {
    if (!this.id) return;
    this.cs.get(this.id).subscribe({
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

    if (typeof err.error === 'string') {
      return err.error;
    }

    if (err.error && typeof err.error === 'object') {
      if (err.error.message && typeof err.error.message === 'string') {
        return err.error.message;
      }

      if (err.error.errors && typeof err.error.errors === 'object') {
        const errorsObj = err.error.errors;
        const fullNameKey = Object.keys(errorsObj).find(k => k.toLowerCase() === 'fullname' || k.toLowerCase() === 'fullName' || k.toLowerCase() === 'full name');
        if (fullNameKey && Array.isArray(errorsObj[fullNameKey]) && errorsObj[fullNameKey].length > 0) {
          return errorsObj[fullNameKey][0];
        }
        const emailKey = Object.keys(errorsObj).find(k => k.toLowerCase() === 'email');
        if (emailKey && Array.isArray(errorsObj[emailKey]) && errorsObj[emailKey].length > 0) {
          return errorsObj[emailKey][0];
        }
        try {
          return JSON.stringify(err.error);
        } catch {
          return 'An unexpected error occurred';
        }
      }

      try {
        return JSON.stringify(err.error);
      } catch {
        return 'An unexpected error occurred';
      }
    }

    return err.message || 'An unexpected error occurred';
  }

  /**
   * Confirmation + save entry point
   */
  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    // reset previous server errors
    this.clearControlDuplicateError('fullName');
    this.clearControlDuplicateError('email');
    this.error = null;

    const verb = this.isEdit ? 'Update' : 'Create';
    const namePreview = this.form.value.fullName || '(no name)';

    Swal.fire({
      title: `${verb} customer?`,
      html: `<div style="text-align:left"><div><strong>Name:</strong> ${this.escapeHtml(namePreview)}</div><div style="margin-top:8px"><strong>Email:</strong> ${this.escapeHtml(this.form.value.email || '')}</div></div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: verb,
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.performSave();
    });
  }

  private performSave() {
    const payload = this.form.value;

    // show loader
    this.saving = true;
    Swal.fire({
      title: this.isEdit ? 'Updating customer...' : 'Creating customer...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // choose observable and normalize to boolean
    const op$ = (this.isEdit && this.id)
      ? this.cs.update(this.id!, payload).pipe(map(() => true))
      : this.cs.create(payload).pipe(map(() => true));

    op$.pipe(
      catchError((err: HttpErrorResponse) => {
        // Normalize message
        const msg = this.normalizeServerMessage(err).toString();

        // Duplicate full name
        if (err.status === 400 && msg && msg.toLowerCase().includes('full') && msg.toLowerCase().includes('name') && msg.toLowerCase().includes('exist')) {
          this.setControlDuplicateError('fullName');
          return of(false);
        }

        // Duplicate email
        if (err.status === 400 && msg && msg.toLowerCase().includes('email') && msg.toLowerCase().includes('exist')) {
          this.setControlDuplicateError('email');
          return of(false);
        }

        // Other 400 messages like "Customer full name already exists" etc.
        if (err.status === 400 && msg) {
          const lower = msg.toLowerCase();
          if (lower.includes('full name') && lower.includes('exist')) {
            this.setControlDuplicateError('fullName');
            return of(false);
          }
          if (lower.includes('email') && lower.includes('exist')) {
            this.setControlDuplicateError('email');
            return of(false);
          }
        }

        // Otherwise show error modal and set error for template
        const display = msg || 'An unexpected error occurred';
        Swal.fire({ title: 'Error', html: this.escapeHtml(display), icon: 'error' });
        this.error = display;
        return of(false);
      }),
      finalize(() => {
        this.saving = false;
        try { Swal.close(); } catch {}
      })
    ).subscribe({
      next: async (ok: boolean) => {
        if (!ok) return;

        // success toast
        this.Toast.fire({ icon: 'success', title: this.isEdit ? 'Customer updated' : 'Customer created' });

        // ensure modal closed then navigate and await result
        try { Swal.close(); } catch {}

        try {
          const nav = await this.router.navigateByUrl('/customers');
          if (!nav) {
            Swal.fire({
              title: 'Saved',
              text: 'Customer saved but navigation was blocked by a guard.',
              icon: 'info'
            });
          }
        } catch (navErr) {
          console.error('Navigation error after save', navErr);
          Swal.fire({
            title: 'Saved',
            text: 'Customer saved but navigation failed. Check console.',
            icon: 'info'
          });
        }
      },
      error: (e) => {
        // defensive: catchError should handle known errors
        console.error('Unexpected error in save subscribe', e);
        Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error' });
      }
    });
  }

  cancel() { this.router.navigateByUrl('/customers'); }

  // small helper to escape HTML in messages (prevents markup injection)
  private escapeHtml(s: string | undefined | null): string {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
