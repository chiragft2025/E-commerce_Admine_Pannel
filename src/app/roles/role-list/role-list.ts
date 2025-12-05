import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/role.model';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  switchMap,
  catchError,
  tap,
  finalize
} from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './role-list.html',
  styleUrls: ['./role-list.scss']
})
export class RoleList implements OnInit, OnDestroy {
  // raw data & filtered/page slice
  private allRoles: RoleDto[] = [];
  roles: RoleDto[] = [];

  // ui state
  loading = false;
  search = '';

  // pagination
  page = 1;
  pageSize = 10; // change if you prefer different page size
  total = 0;

  // search stream + teardown
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true
  });

  constructor(private rs: RoleService, private router: Router) {}

  ngOnInit(): void {
    // subscribe to debounced search input
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => (this.page = 1)), // reset to first page on new search
        switchMap(q => {
          // apply client-side filter on already fetched roles; if not fetched yet, load first
          if (!this.allRoles.length) {
            this.loading = true;
            return this.rs.list().pipe(
              catchError(err => {
                console.error('Failed to load roles for search', err);
                return of([] as RoleDto[]);
              }),
              tap(() => (this.loading = false))
            );
          }
          return of(this.allRoles);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list: RoleDto[]) => {
        // update cache if we received fresh list
        if (Array.isArray(list) && list.length) {
          this.allRoles = list;
        }
        this.applyFilterAndPagination();
      });

    // initial load
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }

  load(): void {
    this.loading = true;
    this.rs.list().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('ROLE LIST ERROR', err);
        return of([] as RoleDto[]);
      })
    ).subscribe({
      next: (r: RoleDto[]) => {
        this.allRoles = Array.isArray(r) ? r : [];
        this.total = this.allRoles.length;
        // ensure page is in range
        this.page = Math.max(1, Math.min(this.page, this.pageCount));
        this.applyFilterAndPagination();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // called from template input (ngModelChange or button)
  onSearchChange(q: string) {
    this.search = q?.trim() ?? '';
    this.search$.next(this.search);
  }

  // when user presses enter (optional)
  onEnter() {
    this.search$.next(this.search);
  }

  add() {
    this.router.navigateByUrl('/roles/new');
  }

  edit(r: RoleDto) {
    this.router.navigateByUrl(`/roles/${r.id}`);
  }

  /**
   * Delete with SweetAlert2 confirmation + loading modal.
   * Replaces native confirm(...) and shows toast on success.
   */
  remove(r: RoleDto) {
    // Ask for confirmation first
    Swal.fire({
      title: `Delete role "${r.name}"?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      // Show blocking loading modal
      Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // Call delete API
      this.rs.delete(r.id).pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('DELETE ROLE ERROR', err);
          // convert to a null result so finalize runs and subscribe error handler receives it
          return of(null);
        }),
        finalize(() => {
          // ensure the loading modal is closed
          Swal.close();
          this.load();
        })
      ).subscribe({
        next: (res) => {
          // If API returned null because of error, res === null
          // You might want to inspect server response; here we treat null as failure
          if (res === null) {
            Swal.fire({
              title: 'Failed',
              text: 'Could not delete the role. Please try again.',
              icon: 'error'
            });
            return;
          }

          // success: remove from cache and update UI
          this.allRoles = this.allRoles.filter(x => x.id !== r.id);
          this.total = this.allRoles.length;
          if (this.page > this.pageCount) this.page = this.pageCount;
          this.applyFilterAndPagination();

          // success toast
          this.Toast.fire({ icon: 'success', title: 'Role deleted' });
          this.load();
        },
        error: (err) => {
          // defensive: should be handled by catchError above, but keep this for completeness
          console.error('DELETE SUBSCRIBE ERROR', err);
          Swal.fire({
            title: 'Error',
            text: 'An unexpected error occurred while deleting.',
            icon: 'error'
          });
        }
      });
    });
  }

  /* ---------- Filtering & Pagination ---------- */

  private applyFilterAndPagination() {
    const term = (this.search || '').toLowerCase();
    const filtered = this.allRoles.filter(r =>
      (r.name ?? '').toLowerCase().includes(term) ||
      (r.description ?? '').toLowerCase().includes(term)
    );

    this.total = filtered.length;
    // clamp page
    if (this.page > this.pageCount) this.page = this.pageCount;
    if (this.page < 1) this.page = 1;

    const start = (this.page - 1) * this.pageSize;
    this.roles = filtered.slice(start, start + this.pageSize);
  }

  // pagination helpers
  get pageCount(): number {
    return Math.max(1, Math.ceil((this.total || 0) / this.pageSize));
  }

  prev() {
    if (this.page > 1) {
      this.page--;
      this.applyFilterAndPagination();
    }
  }

  next() {
    if (this.page < this.pageCount) {
      this.page++;
      this.applyFilterAndPagination();
    }
  }

  goTo(p: number) {
    if (p < 1) p = 1;
    if (p > this.pageCount) p = this.pageCount;
    this.page = p;
    this.applyFilterAndPagination();
  }
}
