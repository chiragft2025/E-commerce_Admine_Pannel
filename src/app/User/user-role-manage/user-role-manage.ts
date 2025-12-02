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

  private loadData() {
    this.loading = true;
    this.error = null;

    const roles$ = this.roleService.list().pipe(
      catchError(err => {
        console.error('Failed to load roles', err);
        // return empty array so UI can still show user info
        return of([]);
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
          this.availableRoles = roles;
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
    if (selected) this.selectedRoleIdsSet.add(roleId);
    else this.selectedRoleIdsSet.delete(roleId);
  }

  isSelected(roleId: number): boolean {
    return this.selectedRoleIdsSet.has(roleId);
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
