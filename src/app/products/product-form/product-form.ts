import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
// <-- updated import path (adjust relative path if your file layout differs)
import { Category } from '../../models/categories.model';
import { Product } from '../../models/product.model';

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
    // Build form
    this.form = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      categoryId: ['', Validators.required],
      tags: this.fb.array([]) // [{"name":""},...]
    });

    // Load categories in a defensive way (accept plain array or paged response)
    // If your CategoryService.list supports pagination, call it with params, otherwise
    // this will still work because we detect the shape of the response.
    this.cs.list?.(1, 100, '').subscribe({
      next: (res: any) => {
        // res can be: Category[]  OR  { items: Category[], page, totalPages, ... }
        if (!res) {
          this.categories = [];
        } else if (Array.isArray(res)) {
          this.categories = res;
        } else if (Array.isArray(res.items)) {
          this.categories = res.items;
        } else {
          // fallback: try to coerce common property names (robust)
          this.categories = Array.isArray(res.data) ? res.data : [];
        }
      },
      error: (e) => console.error('Failed to load categories', e),
    });

    // Check if edit mode
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr && idStr !== 'new') {
      this.id = Number(idStr);
      this.isEdit = true;
      this.loadProduct(this.id);
    }
  }

  // Accessor for tags FormArray
  get tagsArray() {
    return this.form.get('tags') as FormArray;
  }

  addTag(name = '') {
    this.tagsArray.push(
      this.fb.group({
        name: [name, Validators.required],
      })
    );
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
          // support both p.category (object) or p.categoryId (id)
          categoryId: (p as any).category?.id ?? (p as any).categoryId ?? ''
        });

        // Load tags
        this.tagsArray.clear();
        if (p.tags && p.tags.length) {
          p.tags.forEach((t) => this.addTag(t.name));
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      },
    });
  }

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

    if (this.isEdit && this.id) {
      this.ps.update(this.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigateByUrl('/products');
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message ?? 'Failed to update product';
        },
      });
    } else {
      this.ps.create(payload).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigateByUrl('/products');
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message ?? 'Failed to create product';
        },
      });
    }
  }

  cancel() {
    this.router.navigateByUrl('/products');
  }
}
