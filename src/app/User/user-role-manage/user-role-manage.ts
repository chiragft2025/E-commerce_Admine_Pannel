

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/UserService';
import { RoleService } from '../../services/role.service';
import { User } from '../../models/User.model';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { RoleDto } from '../../models/role.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-role-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-role-manage.html',
  styleUrls: ['./user-role-manage.scss']
})
export class UserRoleManage implements OnInit, OnDestroy {
  userId!: number;
  user: User | null = null;
  availableRoles: RoleDto[] = [];

  loading = false;
  saving = false;
  error: string | null = null;

  // selected role ids stored in a Set for efficient toggle
  selectedRoleIdsSet = new Set<number>();

  // permission
  canManageUsers = false;

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
    private route: ActivatedRoute,
    private router: Router,
    private us: UserService,
    private roleService: RoleService,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    // permissions
    this.canManageUsers = this.auth.hasPermission ? this.auth.hasPermission('User.Edit') : false;

    // get id from route
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.error = 'Missing user id in route.';
      return;
    }

    this.userId = Number(idParam);
    if (isNaN(this.userId)) {
      this.error = 'Invalid user id.';
      return;
    }

    // load user + roles in parallel
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalizeRole(r: RoleDto): RoleDto {
    // ensure id is a number (defensive) and keep name normalized for fallback matching
    return {
      ...r,
      id: r.id != null ? Number(r.id) : r.id,
      name: r.name ? String(r.name).trim() : r.name
    } as RoleDto;
  }

  private loadData() {
    this.loading = true;
    this.error = null;

    const roles$ = this.roleService.list().pipe(
      catchError(err => {
        console.error('Failed to load roles', err);
        return of([] as RoleDto[]);
      })
    );

    const user$ = this.us.get(this.userId).pipe(
      catchError(err => {
        console.error('Failed to load user', err);
        return of(null as User | null);
      })
    );

    forkJoin([roles$, user$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([roles, user]) => {
          // Normalize available roles and build fast lookup maps
          this.availableRoles = (roles || []).map(r => this.normalizeRole(r));

          // Build helper maps: id -> role, lower-name -> role
          const roleById = new Map<number, RoleDto>();
          const roleByNameLower = new Map<string, RoleDto>();
          this.availableRoles.forEach(r => {
            if (r.id != null && !Number.isNaN(Number(r.id))) roleById.set(Number(r.id), r);
            if (r.name) roleByNameLower.set(String(r.name).toLowerCase(), r);
          });

          if (!user) {
            this.error = 'User not found.';
            this.loading = false;
            return;
          }

          this.user = user;

          // Clear previous selection
          this.selectedRoleIdsSet.clear();

          // 1) If user.roleIds is an array of ids (numbers or strings), prefer that
          if (Array.isArray((user as any).roleIds) && (user as any).roleIds.length) {
            (user as any).roleIds.forEach((rid: any) => {
              const n = Number(rid);
              if (!Number.isNaN(n) && roleById.has(n)) this.selectedRoleIdsSet.add(n);
            });
          }
          // 2) Else if user.roles is an array of objects, try to pull id/roleId/name
          else if (Array.isArray((user as any).roles) && (user as any).roles.length) {
            (user as any).roles.forEach((rObj: any) => {
              if (rObj == null) return;
              // try several common property names for id
              const maybeId = rObj.id ?? rObj.roleId ?? rObj.RoleId ?? null;
              if (maybeId != null) {
                const n = Number(maybeId);
                if (!Number.isNaN(n) && roleById.has(n)) {
                  this.selectedRoleIdsSet.add(n);
                  return;
                }
              }
              // if no id, try to match by name (case-insensitive)
              const maybeName = rObj.name ?? rObj.roleName ?? rObj.title ?? null;
              if (maybeName) {
                const found = roleByNameLower.get(String(maybeName).toLowerCase());
                if (found && found.id != null) this.selectedRoleIdsSet.add(Number(found.id));
              }
            });
          }
          // 3) Else if user.roles is array of strings (role names)
          else if (Array.isArray((user as any).roles) && (user as any).roles.length && typeof (user as any).roles[0] === 'string') {
            (user as any).roles.forEach((name: string) => {
              const found = roleByNameLower.get(String(name).toLowerCase());
              if (found && found.id != null) this.selectedRoleIdsSet.add(Number(found.id));
            });
          }

          // 4) As a final attempt: if selection is still empty but user contains a single roleId-like prop
          if (this.selectedRoleIdsSet.size === 0) {
            const singleRid = (user as any).roleId ?? (user as any).defaultRoleId ?? null;
            if (singleRid != null) {
              const n = Number(singleRid);
              if (!Number.isNaN(n) && roleById.has(n)) this.selectedRoleIdsSet.add(n);
            }
          }

          // DEBUG: if nothing matched, log to console to aid diagnosis
          if (this.selectedRoleIdsSet.size === 0) {
            console.debug('ManageRoles: no selected roles initialized. user payload:', user, 'availableRoles:', this.availableRoles);
          }

          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.error = 'Failed to load data.';
          this.loading = false;
        }
      });
  }

  toggleRoleSelection(roleId: number, selected: boolean) {
    // coerce roleId to number just in case
    const id = Number(roleId);
    if (selected) this.selectedRoleIdsSet.add(id);
    else this.selectedRoleIdsSet.delete(id);
  }

  isSelected(roleId: number): boolean {
    // coerce to number for comparison
    return this.selectedRoleIdsSet.has(Number(roleId));
  }

  // Save selected roles
  submitRoles() {
    if (!this.canManageUsers) {
      Swal.fire({ title: 'No permission', text: 'You do not have permission to change roles.', icon: 'warning' });
      return;
    }

    if (!this.user) {
      this.error = 'No user to update.';
      return;
    }

    const roleIds = Array.from(this.selectedRoleIdsSet);

    // Prepare a short summary for confirmation
    const selectedNames = this.availableRoles
      .filter(r => roleIds.includes(r.id as number))
      .map(r => r.name)
      .filter(Boolean)
      .join(', ') || '—';

    Swal.fire({
      title: 'Confirm role changes',
      html: `<div style="text-align:left">
               <div><strong>User:</strong> ${this.escapeHtml(this.user!.userName ?? String(this.user!.id))}</div>
               <div style="margin-top:6px"><strong>Selected roles:</strong> ${this.escapeHtml(selectedNames)}</div>
             </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // show blocking loading modal
      this.saving = true;
      Swal.fire({
        title: 'Saving roles...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.us.assignRoles(this.userId, roleIds)
        .pipe(
          takeUntil(this.destroy$),
          catchError(err => {
            console.error('Assign roles failed', err);
            const msg = (err?.error?.message) ? err.error.message : 'Failed to assign roles. Please try again.';
            Swal.fire({ title: 'Failed', text: msg, icon: 'error' });
            return of(null);
          }),
          finalize(() => {
            this.saving = false;
            Swal.close();
            this.router.navigateByUrl('/users');
          })
        )
        .subscribe({
          next: (res) => {
            if (res == null) {
              // error already displayed
              return;
            }

            // refresh user (optional) and keep UI in sync
            this.us.get(this.userId).pipe(takeUntil(this.destroy$), catchError(() => of(null))).subscribe(u => {
              if (u) {
                this.user = u;
                this.selectedRoleIdsSet.clear();
                if (u?.roleIds?.length) u.roleIds.forEach((id: any) => this.selectedRoleIdsSet.add(Number(id)));
              }
            });

            // success toast + navigate
            this.Toast.fire({ icon: 'success', title: 'Roles updated' });
            setTimeout(() => this.router.navigateByUrl('/users'), 250);
          },
          error: (err) => {
            // defensive: should be caught earlier
            console.error('Unexpected subscribe error', err);
            Swal.fire({ title: 'Error', text: 'An unexpected error occurred while assigning roles.', icon: 'error' });
          }
        });
    });
  }

  cancel() {
    this.router.navigateByUrl('/users');
  }

  // helper to escape HTML in messages
  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
