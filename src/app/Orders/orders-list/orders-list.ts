import { HasPermissionDirective } from './../../directives/has-permission.directive';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
  takeUntil,
  catchError
} from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './orders-list.html',
  styleUrls: ['./orders-list.scss']
})
export class OrdersList implements OnInit, OnDestroy {
  orders: any[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = false;

  Orderstatus: any = {
    0: 'Pending',
    1: 'Processing',
    2: 'Shipped',
    3: 'Delivered',
    4: 'Cancelled'
  };

  // search-related
  searchText = '';
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private os: OrderService, private router: Router) {}

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => (this.page = 1)),
        switchMap(q => {
          this.loading = true;
          return this.os.list(this.page, this.pageSize, q).pipe(
            catchError(err => {
              console.error('Search error', err);
              return of({
                items: [],
                total: 0,
                page: this.page,
                pageSize: this.pageSize
              } as any);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(res => this.applyResult(res));

    this.load(this.page);
  }

  load(p = 1) {
    this.loading = true;
    this.os
      .list(p, this.pageSize, this.searchText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => this.applyResult(res),
        error: e => {
          console.error(e);
          this.loading = false;
          this.orders = [];
          this.total = 0;
        }
      });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  view(o: any) {
    this.router.navigateByUrl(`/orders/${o.id}`);
  }

  create() {
    this.router.navigateByUrl('/orders/new');
  }

  /** 🔴 Delete order */
  remove(order: any) {
    Swal.fire({
      title: 'Delete order?',
      html: `<strong>Order:</strong> OD_2025_${order.id}<br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.os.delete(order.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            timer: 1200,
            showConfirmButton: false
          });

          // reload current page safely
          if (this.orders.length === 1 && this.page > 1) {
            this.load(this.page - 1);
          } else {
            this.load(this.page);
          }
        },
        error: err => {
          console.error('Delete failed', err);
          Swal.close();
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || 'Failed to delete order',
            icon: 'error'
          });
        }
      });
    });
  }

  prev() {
    if (this.page > 1) this.load(this.page - 1);
  }

  next() {
    if (this.page < this.pageCount) this.load(this.page + 1);
  }

  onSearchChange(value: string) {
    this.searchText = value?.trim() ?? '';
    this.search$.next(this.searchText);
  }

  clearSearch() {
    if (this.searchText) {
      this.searchText = '';
      this.search$.next('');
    }
  }

  private applyResult(res: any) {
    this.orders = res.items || [];
    this.total = res.total ?? 0;
    this.page = res.page ?? this.page;
    this.pageSize = res.pageSize ?? this.pageSize;
    this.loading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }
}
