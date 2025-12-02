import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/role.model';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './role-list.html',
  styleUrls: ['./role-list.scss']
})
export class RoleList implements OnInit {
  roles: RoleDto[] = [];
  loading = false;

  constructor(private rs: RoleService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.rs.list().subscribe({
      next: (r) => { this.roles = r; this.loading = false; },
      error: (e) => { console.error(e); this.loading = false; }
    });
  }

  add() { this.router.navigateByUrl('/roles/new'); }
  edit(r: RoleDto) { this.router.navigateByUrl(`/roles/${r.id}`); }

  remove(r: RoleDto) {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    this.rs.delete(r.id).subscribe({
      next: () => this.load(),
      error: (e) => console.error(e)
    });
  }
}
