import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import Swal from 'sweetalert2';
import { catchError, finalize, map } from 'rxjs/operators';

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

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true
  });

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
  show(cat: Category): void {
    this.router.navigateByUrl(`/categories/show/${cat.id}`).catch(() => {});
  }

remove(cat: Category): void {
  Swal.fire({
    title: `Delete "${this.escapeHtml(cat.title)}"?`,
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  }).then(result => {
    if (!result.isConfirmed) return;

    this.loading = true;
    Swal.fire({
      title: 'Deleting...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    (this.cs.delete(cat.id!) as any).subscribe({
      next: () => {
        // success path
        this.loading = false;
        try { Swal.close(); } catch {}

        if (this.categories.length === 1 && this.page > 1) {
          this.page = this.page - 1;
        }
        this.load(undefined, this.page);
        this.Toast.fire({ icon: 'success', title: 'Category deleted' });
      },
      error: (err: any) => {
        console.error('Delete failed', err);

        // stop loading and close the "Deleting..." modal first
        this.loading = false;
        try { Swal.close(); } catch {}

        // === Extract and sanitize a compact message ===
        let rawMsg: any = null;

        // prefer structured message
        if (err && typeof err === 'object') {
          if (err.error && typeof err.error === 'object' && err.error.message) {
            rawMsg = err.error.message;
          } else if (err.error && typeof err.error === 'string') {
            rawMsg = err.error;
          } else if (err.error && typeof err.error === 'object') {
            // fallback to JSON-stringify then try to find a message
            rawMsg = JSON.stringify(err.error);
          } else if (err.message) {
            rawMsg = err.message;
          } else {
            rawMsg = String(err);
          }
        } else {
          rawMsg = String(err);
        }

        // If rawMsg is JSON text containing a message property, try to parse it
        try {
          if (typeof rawMsg === 'string') {
            const parsed = JSON.parse(rawMsg);
            if (parsed && parsed.message) rawMsg = parsed.message;
          }
        } catch (e) {
          // ignore parse errors
        }

        // Convert to string, strip HTML tags, take first line, trim and limit length
        let msg = String(rawMsg || 'Delete failed');
        // strip HTML tags if any
        msg = msg.replace(/<\/?[^>]+(>|$)/g, '');
        // take first non-empty line (avoid stack traces)
        msg = msg.split(/\r?\n/).map(s => s.trim()).find(s => s.length > 0) ?? msg;
        // truncate to ~300 chars to avoid huge dialogs
        if (msg.length > 300) msg = msg.slice(0, 297) + '...';

        // Show a compact warning with only the cleaned message.
        Swal.fire({
          title: 'Cannot delete category',
          text: msg,
          icon: 'warning',
          confirmButtonText: 'OK'
        }).then(() => {
          // after user clicks OK, go back to list page
          // if you're already on the list, this simply refreshes / keeps UX consistent
          this.router.navigateByUrl('/categories').catch(() => {});
        });
      }
    });
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
