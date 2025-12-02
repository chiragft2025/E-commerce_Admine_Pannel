import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/UserService';
import { RoleService } from '../../services/role.service';
import { User } from '../../models/User.model';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import {RoleDto} from '../../models/role.model';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private us: UserService,
    private roleService: RoleService,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    // permissions
    this.canManageUsers = this.auth.hasPermission ? this.auth.hasPermission('User.Manage') : false;

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
    // ensure id is a number (defensive)
    return { ...r, id: r.id != null ? Number(r.id) : r.id } as RoleDto;
  }

  private loadData() {
    this.loading = true;
    this.error = null;

    const roles$ = this.roleService.list().pipe(
      catchError(err => {
        console.error('Failed to load roles', err);
        // return empty array so UI can still show user info
        return of([] as RoleDto[]);
      })
    );

    const user$ = this.us.get(this.userId).pipe(
      catchError(err => {
        console.error('Failed to load user', err);
        // bubble error by returning null
        return of(null as User | null);
      })
    );

    forkJoin([roles$, user$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([roles, user]) => {
          // normalize role ids to numbers to avoid string/number mismatch
          this.availableRoles = (roles || []).map(r => this.normalizeRole(r));

          if (!user) {
            this.error = 'User not found.';
            this.loading = false;
            return;
          }
          this.user = user;

          // prefill selection from roleIds or roles[]
          this.selectedRoleIdsSet.clear();
          if (user.roleIds && user.roleIds.length) {
            user.roleIds.forEach(id => this.selectedRoleIdsSet.add(Number(id)));
          } else if (Array.isArray(user.roles)) {
            (user.roles as RoleDto[]).forEach(r => {
              if (r && r.id != null) this.selectedRoleIdsSet.add(Number(r.id));
            });
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
      alert('You do not have permission to change roles.');
      return;
    }

    if (!this.user) {
      this.error = 'No user to update.';
      return;
    }

    this.saving = true;
    this.error = null;

    const roleIds = Array.from(this.selectedRoleIdsSet);

    this.us.assignRoles(this.userId, roleIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          // refresh user (optional)
          this.us.get(this.userId).pipe(takeUntil(this.destroy$)).subscribe(u => {
            this.user = u;
            // keep UI selection in sync (rebuild set)
            this.selectedRoleIdsSet.clear();
            if (u?.roleIds?.length) u.roleIds.forEach(id => this.selectedRoleIdsSet.add(Number(id)));
          });

          // navigate back to users list or show a message
          alert('Roles updated.');
          this.router.navigateByUrl('/users');
        },
        error: (err) => {
          console.error('Assign roles failed', err);
          this.error = 'Failed to assign roles. See console for details.';
          this.saving = false;
        }
      });
  }

  cancel() {
    this.router.navigateByUrl('/users');
  }
}
