import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User.model';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth'; // <<-- your Auth service
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { HasPermissionDirective } from '../../directives/has-permission.directive'; // adjust path as needed
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss']
})
export class UserList implements OnInit, OnDestroy {
  // full dataset returned from API (kept for client-side pagination)
  private allUsers: User[] = [];

  // currently displayed page slice (your template iterates this.users)
  users: User[] = [];

  // pagination
  page = 1;
  pageSize = 10; // 9 items per page as requested
  total = 0;

  // UI & search
  loading = false;
  search = '';

  // permissions tracking
  canManageUsers = false;
  currentUserId: number | null = null;

  private destroy$ = new Subject<void>();

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true
  });

  constructor(
    private us: UserService,
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    // reactively update permission state
    this.auth.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // helper methods on your Auth service: hasPermission and getUserId
        //this.canManageUsers = this.auth.hasPermission(['User.Create'|'User.Edit'|'User.Delete');
        this.currentUserId = this.auth.getUserId ? this.auth.getUserId() : null;
      });

    // bootstrap list
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load users from API and initialize pagination.
   * If pageArg is provided, loads that page after fetch.
   */
  load(term?: string, pageArg?: number) {
    const q = (typeof term === 'string') ? term : this.search;
    this.loading = true;

    this.us.list(q).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('USER LIST ERROR', err);
        return of([] as User[]);
      }),
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: (res: any) => {
        // support both shapes: array or paged { items: [...] }
        const returned = Array.isArray(res) ? res : (res?.items ?? []);
        this.allUsers = returned as User[];
        this.total = this.allUsers.length;
        // if caller provided pageArg use it; otherwise keep current page (or reset to 1 if search changed)
        if (pageArg != null) this.page = pageArg;
        // ensure page is within bounds
        this.page = Math.max(1, Math.min(this.page, this.pageCount));
        this.applyPagination();
      },
      error: (err) => {
        // handled above in catchError, but keep defensive logging
        console.error('USER LIST SUBSCRIBE ERROR', err);
        this.allUsers = [];
        this.users = [];
        this.total = 0;
      }
    });
  }

  onEnter() {
    // when user presses Enter, reset to page 1 and reload
    this.page = 1;
    this.load(this.search, 1);
  }

  // add only allowed if user has permission
  add() {
    this.router.navigateByUrl('/users/new');
  }

  // edit allowed if manager OR editing own profile
  edit(u: User) {
    const isSelf = !!(this.currentUserId && u.id === this.currentUserId);
    this.router.navigateByUrl(`/users/${u.id}`);
  }

  /**
   * Delete user with SweetAlert2 confirmation + loading modal, toast on success.
   */
  remove(u: User) {
    if (!u || u.id == null) {
      console.warn('remove called with invalid user', u);
      return;
    }

    // confirmation dialog
    Swal.fire({
      title: `Delete user "${u.userName}"?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      // show blocking loading modal
      Swal.fire({
        title: 'Deleting user...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // call delete API
      this.us.delete(u.id!).pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('DELETE USER ERROR', err);
          // return observable with null to indicate failure
          return of(null);
        }),
        finalize(() => {
          // always close loading modal
          Swal.close();
          this.load();
        })
      ).subscribe({
        next: (res) => {
          if (res === null) {
            // failed
            Swal.fire({ title: 'Failed', text: 'Could not delete the user. Please try again.', icon: 'error' });
            return;
          }

          // success: reload or remove from cache
          // Option A: re-fetch current page
          this.load(this.search, this.page);

          // Option B (alternative): remove from allUsers and re-apply pagination
          // this.allUsers = this.allUsers.filter(x => x.id !== u.id);
          // this.total = this.allUsers.length;
          // if (this.page > this.pageCount) this.page = this.pageCount;
          // this.applyPagination();

          // success toast
          this.Toast.fire({ icon: 'success', title: 'User deleted' });
        },
        error: (err) => {
          // defensive; should be handled by catchError above
          console.error('DELETE SUBSCRIBE ERROR', err);
          Swal.fire({ title: 'Error', text: 'An unexpected error occurred while deleting.', icon: 'error' });
        }
      });
    });
  }

  changeRoles(u: User) {

    if (!u || u.id == null) {
      console.warn('changeRoles called with invalid user', u);
      return;
    }

    // navigate to /users/:id/roles — adjust if your route path differs
    this.router.navigateByUrl(`/users/${u.id}/roles`);
  }

  // helper used in template to normalize roles display
  displayRoles(u: User): string {
    if (!u) return '—';
    // If roles are strings: ["Admin","Manager"]
    if (Array.isArray(u.roles) && u.roles.length && typeof u.roles[0] === 'string') {
      return (u.roles as unknown as string[]).join(', ');
    }
    // If roles are objects: [{id:1, name:'Admin'}]
    if (Array.isArray(u.roles) && u.roles.length && typeof (u.roles[0] as any).name === 'string') {
      return (u.roles as any[]).map(r => r.name).join(', ');
    }
    // If roleIds only (no names), show placeholder
    if ((u as any).roleIds && (u as any).roleIds.length) {
      return (u as any).roleIds.join(', ');
    }
    return '—';
  }

  /* --------------------- Pagination helpers --------------------- */

  // apply pagination: slice allUsers into users for current page
  private applyPagination() {
    const start = (this.page - 1) * this.pageSize;
    this.users = this.allUsers.slice(start, start + this.pageSize);
  }

  // computed page count
  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  // navigate to previous page
  prev() {
    if (this.page > 1) {
      this.page--;
      this.applyPagination();
    }
  }

  // navigate to next page
  next() {
    if (this.page < this.pageCount) {
      this.page++;
      this.applyPagination();
    }
  }

  // go to specific page (1-based)
  goTo(p: number) {
    if (p < 1) p = 1;
    if (p > this.pageCount) p = this.pageCount;
    this.page = p;
    this.applyPagination();
  }
}
