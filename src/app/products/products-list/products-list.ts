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

      this.ps.delete(p.id!).pipe(
        map(() => true),
        catchError(err => {
          console.error('DELETE PRODUCT ERROR', err);
          const msg = err?.error?.message ?? 'Failed to delete product';
          Swal.fire({ title: 'Delete failed', text: msg, icon: 'error' });
          return of(false);
        }),
        finalize(() => {
          this.loading = false;
          try { Swal.close(); } catch {}
        })
      ).subscribe(ok => {
        if (!ok) return;
        // reload current page (preserves your original behavior)
        this.load(this.q, this.page);
        // show toast
        this.Toast.fire({ icon: 'success', title: 'Product deleted' });
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
