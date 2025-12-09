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

    // call delete and handle success/error separately
    this.cs.delete(c.id!).pipe(
      // if you have a destroy$ in this component, uncomment next line:
      // takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // success path: close spinner, reload and toast
        try { Swal.close(); } catch {}
        this.loading = false;

        // reload current page (preserves your original behavior)
        this.load(this.q, this.page);

        // show toast
        this.Toast.fire({ icon: 'success', title: 'Customer deleted' });
      },
      error: (err: any) => {
        console.error('DELETE CUSTOMER ERROR', err);

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
        let msg = String(rawMsg || 'Failed to delete customer');
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
          // keep current list view; reload to ensure consistent state
          this.load(this.q, this.page);
        });
      },
      complete: () => {
        // nothing else needed here — next/error already handled state
      }
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
