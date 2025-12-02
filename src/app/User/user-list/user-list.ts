import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User.model';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth'; // <<-- your Auth service
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HasPermissionDirective } from '../../directives/has-permission.directive'; // adjust path as needed


@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,HasPermissionDirective],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss']
})
export class UserList implements OnInit, OnDestroy {
  users: User[] = [];
  loading = false;
  search = '';

  // permissions tracking
  canManageUsers = false;
  currentUserId: number | null = null;

  private destroy$ = new Subject<void>();

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
        this.canManageUsers = this.auth.hasPermission('User.Manage');
        this.currentUserId = this.auth.getUserId ? this.auth.getUserId() : null;
      });

    // bootstrap list
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(term?: string) {
    const q = (typeof term === 'string') ? term : this.search;
    this.loading = true;
    this.us.list(q).subscribe({
      next: (res:any) => {
        // If API returns paged { items: [...] } support both shapes
        this.users = Array.isArray(res) ? res : (res?.items ?? []);
        this.loading = false;
      },
      error: (err) => { console.error('USER LIST ERROR', err); this.loading = false; }
    });
  }

  onEnter() { this.load(this.search); }

  // add only allowed if user has permission
  add() {
    if (!this.canManageUsers) {
      alert('You do not have permission to add users.');
      return;
    }
    this.router.navigateByUrl('/users/new');
  }

  // edit allowed if manager OR editing own profile
  edit(u: User) {
    const isSelf = !!(this.currentUserId && u.id === this.currentUserId);
    if (!this.canManageUsers && !isSelf) {
      alert('You do not have permission to edit this user.');
      return;
    }
    this.router.navigateByUrl(`/users/${u.id}`);
  }

  remove(u: User) {
    if (!this.canManageUsers) {
      alert('You do not have permission to delete users.');
      return;
    }

    if (!confirm(`Delete user ${u.userName}?`)) return;
    this.us.delete(u.id!).subscribe({
      next: () => this.load(),
      error: (e) => console.error(e)
    });
  }

  changeRoles(u: User) {
    if (!this.canManageUsers) {
      alert('You do not have permission to change roles.');
      return;
    }

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
    if (u.roleIds && u.roleIds.length) {
      return u.roleIds.join(', ');
    }
    return '—';
  }
}
