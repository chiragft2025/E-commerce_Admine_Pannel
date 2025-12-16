import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductService, Paged } from '../../services/product';
import { Product } from '../../models/product.model';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './products-list.html',
  styleUrls: ['./products-list.scss']
})
export class ProductsList implements OnInit {
  products: Product[] = [];
  loading = false;
  q = '';

  // pagination state
  total = 0;
  page = 1;
  pageSize = 10;
  pages: number[] = [];

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    timer: 1800,
    showConfirmButton: false,
    timerProgressBar: true
  });
authService: Auth=null as any;

  constructor(private ps: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(search?: string, page?: number) {
    const s = typeof search === 'string' ? search : this.q;
    const p = page ?? this.page;

    console.log('Load products', { search: s, page: p, pageSize: this.pageSize });
    this.loading = true;

    this.ps.listPaged(s, p, this.pageSize).subscribe({
      next: (res: Paged<Product>) => {
        this.products = res.items;
        this.total = res.total;
        this.page = res.page;
        this.pageSize = res.pageSize;
        this.computePages();
        this.loading = false;
      },
      error: (e) => {
        console.error('PRODUCTS API ERROR:', e);
        this.loading = false;
      }
    });
  }

  computePages() {
    const pageCount = Math.max(1, Math.ceil(this.total / this.pageSize));
    const arr: number[] = [];
    for (let i = 1; i <= pageCount; i++) arr.push(i);
    this.pages = arr;
  }

  goToPage(p: number) {
    if (p === this.page) return;
    this.load(this.q, p);
  }

  prev() {
    if (this.page > 1) this.goToPage(this.page - 1);
  }

  next() {
    const pageCount = Math.ceil(this.total / this.pageSize);
    if (this.page < pageCount) this.goToPage(this.page + 1);
  }

  onSearch() {
    this.page = 1;
    this.load(this.q, 1);
  }

  add() { this.router.navigateByUrl('/products/new'); }
  edit(p: Product) { this.router.navigateByUrl(`/products/${p.id}`); }
  show(p: Product) { this.router.navigateByUrl(`/products/view/${p.id}`); }

 remove(p: Product) {
  // SweetAlert2 confirmation + loading + toast; preserves original reload behavior
  Swal.fire({
    title: `Delete product "${this.escapeHtml(p.name)}"?`,
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  }).then(result => {
    if (!result.isConfirmed) return;

    // show blocking loading modal
    this.loading = true;
    Swal.fire({
      title: 'Deleting...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // call delete and handle success/error paths separately
    this.ps.delete(p.id!).pipe(
      // ensure we clean up if you use a destroy$ (optional),
      // otherwise remove takeUntil if not available in this component
      // takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // success path: close spinner, reload and toast
        try { Swal.close(); } catch {}
        this.loading = false;

        // reload current page (preserves your original behavior)
        this.load(this.q, this.page);

        // show toast
        this.Toast.fire({ icon: 'success', title: 'Product deleted' });
      },
      error: (err: any) => {
        console.error('DELETE PRODUCT ERROR', err);

        // ensure loading modal is closed before showing our alert
        try { Swal.close(); } catch {}
        this.loading = false;

        // === Extract and sanitize a compact message ===
        let rawMsg: any = null;

        if (err && typeof err === 'object') {
          if (err.error && typeof err.error === 'object' && err.error.message) {
            rawMsg = err.error.message;
          } else if (err.error && typeof err.error === 'string') {
            rawMsg = err.error;
          } else if (err.message) {
            rawMsg = err.message;
          } else {
            // last resort: stringify error body
            try { rawMsg = JSON.stringify(err.error ?? err); } catch { rawMsg = String(err); }
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

        // Convert to string, strip HTML tags, take first useful line, trim and limit length
        let msg = String(rawMsg || 'Failed to delete product');
        msg = msg.replace(/<\/?[^>]+(>|$)/g, ''); // strip HTML
        msg = msg.split(/\r?\n/).map(s => s.trim()).find(s => s.length > 0) ?? msg; // first non-empty line
        if (msg.length > 300) msg = msg.slice(0, 297) + '...';

        // Show a compact error dialog with only the cleaned message
        Swal.fire({
          title: 'Delete failed',
          text: msg,
          icon: 'error',
          confirmButtonText: 'OK'
        }).then(() => {
          // keep current list view; if you prefer redirecting to /products, call:
          // this.router.navigateByUrl('/products').catch(() => {});
          // otherwise just reload current list to ensure consistent state
          this.load(this.q, this.page);
        });
      },
      complete: () => {
        // nothing special here — next/error already handled state
      }
    });
  });
}


  // helper to show category title safely
  catTitle(p: Product) {
    return p.category?.title ?? '—';
  }

  tagsList(p: Product) {
    return (p.tags ?? []).map(t => t.name).join(', ');
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
