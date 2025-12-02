import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './category-list.html',
  styleUrls: ['./category-list.scss']
})
export class CategoryList implements OnInit, OnDestroy {
  categories: Category[] = [];
  loading = false;
  error: string | null = null;

  // pagination / search state
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;
  pages: number[] = [];

  q = '';

  private sub: Subscription | null = null;

  constructor(private cs: CategoryService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  /**
   * Load categories.
   * Works with both:
   *  - Category[] (legacy service)
   *  - { items: Category[], page, pageSize, totalCount, totalPages } (paginated)
   */
  load(q?: string, page = this.page): void {
    this.error = null;
    this.loading = true;

    // Defensive: if the service exposes list(page,pageSize,q) use it,
    // otherwise fall back to list() that returns Category[]
    try {
      // attempt to call with pagination parameters (if service supports it)
      const maybeObs = (this.cs as any).list?.(page, this.pageSize, q ?? this.q);
      if (!maybeObs || typeof maybeObs.subscribe !== 'function') {
        // fallback: older service signature list()
        this.sub = (this.cs as any).list().subscribe({
          next: (res: any) => {
            // res could be Category[] or a paged object
            if (res && Array.isArray(res)) {
              this.categories = res;
              this.total = res.length;
              this.totalPages = 1;
              this.pages = [1];
            } else if (res && Array.isArray(res.items)) {
              this.categories = res.items;
              this.page = res.page ?? 1;
              this.pageSize = res.pageSize ?? this.pageSize;
              this.total = res.totalCount ?? (res.items?.length ?? 0);
              this.totalPages = res.totalPages ?? 1;
              this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
            } else {
              // unknown shape: try to coerce
              this.categories = Array.isArray(res) ? res : [];
              this.total = this.categories.length;
              this.totalPages = 1;
              this.pages = [1];
            }
            this.loading = false;
          },
          error: (err: any) => {
            console.error('Failed to load categories (fallback)', err);
            this.error = 'Failed to load categories';
            this.loading = false;
          }
        });
        return;
      }

      // Standard path: service returns an observable
      this.sub = maybeObs.subscribe({
        next: (res: any) => {
          if (!res) {
            this.categories = [];
            this.total = 0;
            this.totalPages = 0;
            this.pages = [];
          } else if (Array.isArray(res)) {
            // service returned plain array
            this.categories = res;
            this.total = res.length;
            this.totalPages = 1;
            this.pages = [1];
            this.page = 1;
          } else if (Array.isArray(res.items)) {
            // paginated response
            this.categories = res.items;
            this.page = res.page ?? page;
            this.pageSize = res.pageSize ?? this.pageSize;
            this.total = res.totalCount ?? (res.items?.length ?? 0);
            this.totalPages = res.totalPages ?? Math.ceil(this.total / this.pageSize);
            this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
          } else {
            // unknown shape - try to treat as array
            this.categories = Array.isArray(res) ? res : [];
            this.total = this.categories.length;
            this.totalPages = 1;
            this.pages = [1];
          }
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to load categories', err);
          this.error = 'Failed to load categories';
          this.loading = false;
        }
      });
    } catch (err) {
      console.error('Unexpected error when calling category service', err);
      this.error = 'Failed to load categories';
      this.loading = false;
    }
  }

  onSearch(): void {
    this.page = 1;
    this.load(this.q, 1);
  }

  add(): void {
    this.router.navigateByUrl('/categories/new').catch(() => {});
  }

  edit(cat: Category): void {
    this.router.navigateByUrl(`/categories/${cat.id}`).catch(() => {});
  }

  remove(cat: Category): void {
    if (!confirm(`Delete "${cat.title}"? This action cannot be undone.`)) return;
    this.loading = true;
    this.cs.delete(cat.id!).subscribe({
      next: () => {
        // if we removed the last item on the page and page > 1, go back a page
        if (this.categories.length === 1 && this.page > 1) {
          this.page = this.page - 1;
        }
        this.load(undefined, this.page);
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.error = 'Delete failed';
        this.loading = false;
      }
    });
  }

  prev(): void {
    if (this.page > 1) {
      this.page--;
      this.load(undefined, this.page);
    }
  }

  next(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.load(undefined, this.page);
    }
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.load(undefined, p);
  }
}
