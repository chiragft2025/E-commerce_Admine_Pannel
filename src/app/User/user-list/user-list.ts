import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.css']
})
export class UserList implements OnInit {
  users: User[] = [];
  loading = false;
  search = '';

  constructor(private us: UserService, private router: Router) {}

  ngOnInit(): void {
    this.load();
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
  add() { this.router.navigateByUrl('/users/new'); }
  edit(u: User) { this.router.navigateByUrl(`/users/${u.id}`); }
  remove(u: User) {
    if (!confirm(`Delete user ${u.userName}?`)) return;
    this.us.delete(u.id!).subscribe({
      next: () => this.load(),
      error: (e) => console.error(e)
    });
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
