import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import { Product } from '../../models/product.model';
import { HttpErrorResponse } from '@angular/common/http';

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
  // SAVE with duplicate-name error
  // -----------------------------
  save() {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const payload = {
      ...this.form.value,
      categoryId: Number(this.form.value.categoryId),
      tags: this.form.value.tags.map((t: any) => ({ name: t.name?.trim() }))
    };

    const handleError = (err: HttpErrorResponse) => {
      this.saving = false;

      const msg: string =
        typeof err?.error === 'string'
          ? err.error
          : err?.error?.message || err.message || 'Error occurred';

      // 🔥 Detect duplicate product name from backend
      if (msg.toLowerCase().includes('product name') && msg.toLowerCase().includes('exist')) {
        this.error = 'A product with this name already exists.';
        return;
      }

      // fallback: generic error
      this.error = msg || 'Failed to save product';
    };

    if (this.isEdit && this.id) {
      this.ps.update(this.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigateByUrl('/products');
        },
        error: handleError
      });
    } else {
      this.ps.create(payload).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigateByUrl('/products');
        },
        error: handleError
      });
    }
  }

  cancel() {
    this.router.navigateByUrl('/products');
  }
}
