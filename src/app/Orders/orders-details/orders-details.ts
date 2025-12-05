import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './orders-details.html',
  styleUrls: ['./orders-details.scss']
})
export class OrderDetail implements OnInit {
  id?: number;
  order: any = null;
  loading = false;

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true
  });

  constructor(private route: ActivatedRoute, private os: OrderService, private router: Router) {}

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) return;
    this.id = Number(idStr);
    this.load();
  }

  load() {
    if (!this.id) return;
    this.loading = true;
    this.os.get(this.id!).subscribe({
      next: o => { this.order = o; this.loading = false; },
      error: e => { console.error(e); this.loading = false; }
    });
  }

  back() { this.router.navigateByUrl('/orders'); }

  /**
   * Cancel order with SweetAlert2 confirmation, loader, and toast.
   * On success we navigate back to /orders (awaited). If navigation is blocked,
   * we still reload the current order view to reflect the change.
   */
  cancel() {
    if (!this.id) return;

    Swal.fire({
      title: 'Cancel this order?',
      text: 'This action will cancel the order and cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel order',
      cancelButtonText: 'No, keep order',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      // show blocking loading modal
      Swal.fire({
        title: 'Cancelling order...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.os.cancel(this.id!).pipe(
        map(() => true),
        catchError(err => {
          console.error('Cancel failed', err);
          const msg = err?.error?.message ?? 'Failed to cancel order';
          Swal.fire({ title: 'Cancel failed', text: msg, icon: 'error' });
          return of(false);
        }),
        finalize(() => {
          try { Swal.close(); } catch {}
        })
      ).subscribe(async ok => {
        if (!ok) return;

        // success -> toast
        this.Toast.fire({ icon: 'success', title: 'Order cancelled' });

        // attempt to navigate back to /orders (await), if blocked show info and reload current view
        try {
          const nav = await this.router.navigateByUrl('/orders');
          if (!nav) {
            // navigation blocked by guard/resolver — refresh current order to show updated state
            Swal.fire({
              title: 'Cancelled',
              text: 'Order cancelled but navigation was blocked. Refreshing the current view.',
              icon: 'info'
            });
            this.load();
          }
        } catch (navErr) {
          console.error('Navigation error after cancel', navErr);
          // still reload current order so UI reflects cancellation
          this.load();
          Swal.fire({
            title: 'Cancelled',
            text: 'Order cancelled but navigation failed. Check console for details.',
            icon: 'info'
          });
        }
      });
    });
  }
}
