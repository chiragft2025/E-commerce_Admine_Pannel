import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomerService, Paged } from '../../services/customer.service';
import { Customer } from '../../models/customers.model';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './customers-list.html',
  styleUrls: ['./customers-list.scss']
})
export class CustomerList implements OnInit {
  customers: Customer[] = [];
  loading = false;
  q = '';

  // paging
  page = 1;
  pageSize = 10;
  total = 0;

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    timer: 1800,
    showConfirmButton: false,
    timerProgressBar: true
  });

  constructor(private cs: CustomerService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(search?: string, page?: number) {
    const s = typeof search === 'string' ? search : this.q;
    const p = page ?? this.page;
    this.loading = true;
    this.cs.listPaged(s, p, this.pageSize).subscribe({
      next: (res: Paged<Customer>) => {
        this.customers = res.items;
        this.total = res.total;
        this.page = res.page;
        this.pageSize = res.pageSize;
        this.loading = false;
      },
      error: (e) => {
        console.error('CUSTOMERS LOAD ERROR', e);
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.page = 1;
    this.load(this.q, 1);
  }

  goToPage(p: number) {
    if (p === this.page) return;
    this.load(this.q, p);
  }

  add() { this.router.navigateByUrl('/customers/new'); }
  edit(c: Customer) { this.router.navigateByUrl(`/customers/${c.id}`); }
  view(c: Customer) { this.router.navigateByUrl(`/customers/view/${c.id}`); }

  remove(c: Customer) {
    // SweetAlert2 confirmation + loading + toast; preserves original reload behavior
    Swal.fire({
      title: `Delete customer "${this.escapeHtml(c.fullName)}"?`,
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

      this.cs.delete(c.id!).pipe(
        map(() => true),
        catchError(err => {
          console.error('DELETE CUSTOMER ERROR', err);
          const msg = err?.error?.message ?? 'Failed to delete customer';
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
        this.Toast.fire({ icon: 'success', title: 'Customer deleted' });
      });
    });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
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
