import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import { Product } from '../../models/product.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './product-form.html',
  styleUrls: ['./product-form.scss'],
})
export class ProductForm implements OnInit {
  form!: FormGroup;
  id?: number;
  isEdit = false;

  categories: Category[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

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
    private ps: ProductService,
    private cs: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      categoryId: ['', Validators.required],
      tags: this.fb.array([])
    });

    this.cs.list?.(1, 100, '').subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) this.categories = res;
        else if (Array.isArray(res?.items)) this.categories = res.items;
        else this.categories = [];
      },
      error: (e) => console.error('Failed to load categories', e),
    });

    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr && idStr !== 'new') {
      this.id = Number(idStr);
      this.isEdit = true;
      this.loadProduct(this.id);
    }
  }

  get tagsArray() {
    return this.form.get('tags') as FormArray;
  }

  addTag(name = '') {
    this.tagsArray.push(this.fb.group({ name: [name, Validators.required] }));
  }

  removeTag(index: number) {
    this.tagsArray.removeAt(index);
  }

  loadProduct(id: number) {
    this.loading = true;
    this.ps.get(id).subscribe({
      next: (p: Product) => {
        this.form.patchValue({
          name: p.name,
          sku: p.sku,
          description: p.description,
          price: p.price,
          stock: p.stock,
          isActive: p.isActive,
          categoryId: (p as any).category?.id ?? (p as any).categoryId ?? ''
        });

        this.tagsArray.clear();
        if (p.tags?.length) {
          p.tags.forEach((t) => this.addTag(t.name));
        }

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // -----------------------------
  // SAVE with SweetAlert2 (confirmation, loader, toast)
  // -----------------------------
  save() {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const verb = this.isEdit ? 'Update' : 'Create';
    const summary = `<div style="text-align:left">
      <div><strong>Name:</strong> ${this.escapeHtml(this.form.value.name || '(no name)')}</div>
      <div><strong>SKU:</strong> ${this.escapeHtml(this.form.value.sku || '(no sku)')}</div>
      <div style="margin-top:6px"><strong>Price:</strong> ${this.form.value.price}</div>
    </div>`;

    Swal.fire({
      title: `${verb} product?`,
      html: summary,
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
    this.error = null;
    this.saving = true;

    const payload = {
      ...this.form.value,
      categoryId: Number(this.form.value.categoryId),
      tags: this.form.value.tags.map((t: any) => ({ name: t.name?.trim() }))
    };

    // show blocking loader
    Swal.fire({
      title: this.isEdit ? 'Updating product...' : 'Creating product...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const op$ = (this.isEdit && this.id)
      ? this.ps.update(this.id, payload).pipe(map(() => true))
      : this.ps.create(payload).pipe(map(() => true));

    op$.pipe(
      catchError((err: HttpErrorResponse) => {
        this.saving = false;

        const msg: string =
          typeof err?.error === 'string'
            ? err.error
            : err?.error?.message || err.message || 'Error occurred';

        // Detect duplicate product name from backend (preserve original behavior)
        if (msg && msg.toLowerCase().includes('product name') && msg.toLowerCase().includes('exist')) {
          this.error = 'A product with this name already exists.';
          return of(false);
        }

        // show modal for other errors
        Swal.fire({ title: 'Error', text: msg || 'Failed to save product', icon: 'error' });
        this.error = msg || 'Failed to save product';
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
        this.Toast.fire({ icon: 'success', title: this.isEdit ? 'Product updated' : 'Product created' });

        // ensure modal closed then navigate
        try { Swal.close(); } catch {}

        try {
          const nav = await this.router.navigateByUrl('/products');
          if (!nav) {
            Swal.fire({
              title: 'Saved',
              text: 'Product saved but navigation was blocked by a guard.',
              icon: 'info'
            });
          }
        } catch (navErr) {
          console.error('Navigation error after save', navErr);
          Swal.fire({
            title: 'Saved',
            text: 'Product saved but navigation failed. Check console.',
            icon: 'info'
          });
        }
      },
      error: (e) => {
        console.error('Unexpected subscribe error', e);
        Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error' });
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/products');
  }

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
