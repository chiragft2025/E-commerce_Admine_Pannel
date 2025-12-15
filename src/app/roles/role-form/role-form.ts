import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';
import { CreateRoleRequest, UpdateRoleRequest } from '../../models/role.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './role-form.html',
  styleUrls: ['./role-form.scss']
})
export class RoleForm implements OnInit {

  form!: FormGroup;

  permissions: Permission[] = [];
  groupedPermissions: Record<string, any[]> = {}; // children
  parentPermission: Record<string, number> = {}; // module -> viewID
  permissionEntries: { key: string; value: any[] }[] = [];

  id?: number;
  isEdit = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private rs: RoleService,
    private ps: PermissionService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
      permissionIds: [[] as number[]]
    });

    this.ps.list().subscribe({
      next: p => {
        this.permissions = p;
        this.groupPermissions();
        this.loadRoleIfEdit();
      },
      error: () => this.loadRoleIfEdit()
    });
  }

  /** GROUP PERMISSIONS: VIEW becomes parent, NOT shown as child */
  private groupPermissions() {
    const groups: Record<string, any[]> = {};

    this.permissions.forEach(perm => {
      const [module, action] = perm.name.split(".");

      if (action === "View") {
        this.parentPermission[module] = perm.id; // save parent = view
        return; // DO NOT include View as child
      }

      if (!groups[module]) groups[module] = [];
      groups[module].push({
        id: perm.id,
        action
      });
    });

    this.groupedPermissions = groups;
    this.permissionEntries = Object.entries(groups).map(([key, value]) => ({
      key,
      value
    }));
  }

  /** LOAD ROLE IF EDIT MODE */
  private loadRoleIfEdit() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id || id === "new") return;

    this.id = Number(id);
    this.isEdit = true;

    this.rs.get(this.id).subscribe(role => {
      const ids = (role.permissions ?? []).map((p: any) => Number(p.id));

      this.form.patchValue({
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        permissionIds: ids
      });
    });
  }

  /** CHILD TOGGLE (Create/Edit/Delete/...) */
  togglePermission(id: number, checked: boolean, module: string) {
    const ids = new Set(this.form.value.permissionIds);

    if (checked) ids.add(id);
    else ids.delete(id);

    const parentId = this.parentPermission[module];
    const children = this.groupedPermissions[module];

    // If any child checked → parent auto-checks
    const anyChildChecked = children.some(c => ids.has(c.id));
    if (anyChildChecked) ids.add(parentId);

    // IMPORTANT: Do NOT uncheck parent when children empty → parent stays as user choice

    this.form.patchValue({ permissionIds: [...ids] });
  }

  isChecked(id: number): boolean {
    return this.form.value.permissionIds.includes(id);
  }

  /** PARENT TOGGLE (module header acts as View) */
  toggleModule(module: string, checked: boolean) {
    const ids = new Set(this.form.value.permissionIds);

    const parentId = this.parentPermission[module];
    const children = this.groupedPermissions[module];

    if (checked) {
      ids.add(parentId); // parent
      children.forEach(c => ids.add(c.id)); // all children
    } else {
      ids.delete(parentId);
      children.forEach(c => ids.delete(c.id));
    }

    this.form.patchValue({ permissionIds: [...ids] });
  }

  /** PARENT CHECKED IF: parent ID checked OR any child checked */
  isModuleChecked(module: string): boolean {
    const ids = this.form.value.permissionIds;
    const parentId = this.parentPermission[module];
    const children = this.groupedPermissions[module];

    if (ids.includes(parentId)) return true;

    return children.some(c => ids.includes(c.id));
  }

  /** SAVE ROLE */
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      name: this.form.value.name,
      description: this.form.value.description,
      isActive: this.form.value.isActive
    };

    const permIds = this.form.value.permissionIds.map(Number);

    if (this.isEdit && this.id) {
      this.rs.update(this.id, payload).subscribe(() => {
        this.rs.replaceRolePermissions(this.id!, permIds).subscribe(() => {
          Swal.fire("Updated!", "", "success");
          this.router.navigateByUrl('/roles');
        });
      });
      return;
    }

    this.rs.create(payload).subscribe((created: any) => {
      this.rs.replaceRolePermissions(created.id, permIds).subscribe(() => {
        Swal.fire("Created!", "", "success");
        this.router.navigateByUrl('/roles');
      });
    });
  }

  cancel() {
    this.router.navigateByUrl('/roles');
  }
}
