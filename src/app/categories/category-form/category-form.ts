import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './category-form.html',
  styleUrls: ['./category-form.scss']
})
export class CategoryForm implements OnInit {
  form!: FormGroup;
  id?: number;
  isEdit = false;
  saving = false;
  serverErrorMessage = ''; // general error

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true
  });

  constructor(
    private fb: FormBuilder,
    private cs: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: ['']
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = idParam ? Number(idParam) : undefined;
    this.isEdit = !!this.id;

    if (this.isEdit && this.id) {
      this.cs.get(this.id).subscribe({
        next: (cat: Category) => {
          if (cat) this.form.patchValue(cat);
        },
        error: (err) => {
          console.error('Failed to load category', err);
          // optionally show a modal, but keep behavior unchanged
        }
      });
    }
  }

  /**
   * Save with confirmation -> show loader -> call API -> handle duplicate-title specially -> toast + navigate
   */
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // confirmation summary (simple)
    const verb = this.isEdit ? 'Update' : 'Create';
    const titlePreview = this.form.value.title || '(no title)';
    Swal.fire({
      title: `${verb} category?`,
      html: `<div style="text-align:left"><div><strong>Title:</strong> ${this.escapeHtml(titlePreview)}</div></div>`,
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
    this.serverErrorMessage = '';
    this.saving = true;

    // show blocking loader
    Swal.fire({
      title: this.isEdit ? 'Updating category...' : 'Creating category...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const model = this.form.value as Category;

    // choose observable and normalize to boolean
    const op$ = (this.isEdit && this.id)
      ? this.cs.update(this.id!, model).pipe(map(() => true))
      : this.cs.create(model).pipe(map(() => true));

    op$.pipe(
      catchError((err: HttpErrorResponse) => {
        // Try to normalize message
        const raw = err?.error;
        const msg = (typeof raw === 'string') ? raw : (raw?.message || JSON.stringify(raw));

        // If duplicate-title error pattern: set title control error and show no modal
        if (err.status === 400 && msg && msg.toLowerCase().includes('title') && msg.toLowerCase().includes('exists')) {
          this.form.get('title')?.setErrors({ duplicate: true });
          this.form.get('title')?.markAsTouched();
          // keep serverErrorMessage empty (original behavior)
          return of(false);
        }

        // Otherwise show error modal (preserve original server message)
        Swal.fire({
          title: 'Error',
          html: this.escapeHtml(String(msg || 'An unexpected error occurred')),
          icon: 'error'
        });

        // also set serverErrorMessage for template if used
        this.serverErrorMessage = msg || 'An unexpected error occurred';
        return of(false);
      }),
      finalize(() => {
        this.saving = false;
        try { Swal.close(); } catch (e) { /* ignore */ }
      })
    ).subscribe({
      next: async (ok: boolean) => {
        if (!ok) return; // error already handled above (either duplicate or modal)

        // success toast
        this.Toast.fire({ icon: 'success', title: this.isEdit ? 'Category updated' : 'Category created' });

        // ensure modal is closed before navigation (defensive)
        try { Swal.close(); } catch {}

        // navigate to list and await result
        try {
          const nav = await this.router.navigateByUrl('/categories');
          if (!nav) {
            // navigation blocked by guard/resolver; inform user but keep flow unchanged
            Swal.fire({
              title: 'Saved',
              text: 'Category saved, but navigation was blocked by a route guard.',
              icon: 'info'
            });
          }
        } catch (navErr) {
          console.error('Navigation error after save', navErr);
          // still consider the save successful; show info to user
          Swal.fire({
            title: 'Saved',
            text: 'Category saved, but navigation failed. Check console for details.',
            icon: 'info'
          });
        }
      },
      error: (e) => {
        // defensive; catchError should have handled known errors
        console.error('Unexpected error in save subscription', e);
        Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error' });
      }
    });
  }

  cancel() {
    // preserve original behavior: immediate navigate
    this.router.navigateByUrl('/categories');
  }

  // escape HTML helper
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
