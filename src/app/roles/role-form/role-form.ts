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
  id?: number;
  isEdit = false;
  loading = false;
  saving = false;
  error: string | null = null;

  // small helper: SweetAlert2 toast instance
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  });

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
      permissionIds: [[] as number[]] // empty by default
    });

    // Load all permissions first
    this.ps.list().subscribe({
      next: (p) => {
        this.permissions = p;
        this.setupForRoute(); // after permissions are loaded
      },
      error: (e) => {
        console.error('Failed to load permissions', e);
        this.setupForRoute();
      }
    });
  }

  /** Detect if editing or creating */
  private setupForRoute() {
    const idStr = this.route.snapshot.paramMap.get('id');

    if (idStr && idStr !== 'new') {
      // EDIT MODE
      this.id = Number(idStr);
      this.isEdit = true;
      this.loadRole(this.id);
    } else {
      // CREATE MODE → leave permissionIds empty (all unchecked)
      this.isEdit = false;
      this.form.patchValue({ permissionIds: [] });
    }
  }

  /** Load existing role and its permissions */
  private loadRole(id: number) {
    this.loading = true;

    this.rs.get(id).subscribe({
      next: (r) => {
        this.form.patchValue({
          name: r.name,
          description: r.description,
          isActive: r.isActive ?? true
        });

        // Existing permissions → take ids
        const ids = (r.permissions ?? []).map((p: any) => Number(p.id));
        this.form.patchValue({ permissionIds: ids });

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load role', err);
        this.loading = false;
        // show an error alert
        Swal.fire({
          title: 'Failed to load role',
          text: 'An error occurred while loading the role. Please try again.',
          icon: 'error'
        });
      }
    });
  }

  /** Checkbox handler */
  togglePermission(pid: number, checked: boolean) {
    const current: number[] = this.form.value.permissionIds || [];
    const set = new Set(current);

    if (checked) set.add(pid);
    else set.delete(pid);

    this.form.patchValue({ permissionIds: Array.from(set) });
  }

  isChecked(pid: number): boolean {
    return (this.form.value.permissionIds || []).includes(pid);
  }

  /** Save (create or update) with SweetAlert2 feedback */
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    // Show a blocking loading modal
    Swal.fire({
      title: this.isEdit ? 'Updating role...' : 'Creating role...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const payload: CreateRoleRequest | UpdateRoleRequest = {
      name: this.form.value.name,
      description: this.form.value.description,
      isActive: this.form.value.isActive
    };

    const permIds = (this.form.value.permissionIds || []).map((x: any) => Number(x));

    if (this.isEdit && this.id) {
      // UPDATE ROLE THEN PERMISSIONS
      this.rs.update(this.id, payload as UpdateRoleRequest).subscribe({
        next: () => {
          this.rs.replaceRolePermissions(this.id!, permIds).subscribe({
            next: () => {
              this.saving = false;
              Swal.close(); // close loading
              this.Toast.fire({ icon: 'success', title: 'Role updated' });
              // navigate after a short delay so toast shows (toast auto-closes)
              setTimeout(() => this.router.navigateByUrl('/roles'), 300);
            },
            error: (err) => {
              this.saving = false;
              Swal.close();
              this.error = 'Failed to update permissions';
              console.error(err);
              Swal.fire({
                title: 'Failed to update permissions',
                text: 'There was an error updating role permissions. Please try again.',
                icon: 'error'
              });
            }
          });
        },
        error: (err) => {
          this.saving = false;
          Swal.close();
          this.error = 'Failed to update role';
          console.error(err);
          Swal.fire({
            title: 'Failed to update role',
            text: 'There was an error updating the role. Please check your input and try again.',
            icon: 'error'
          });
        }
      });

    } else {
      // CREATE ROLE THEN ASSIGN PERMISSIONS
      this.rs.create(payload as CreateRoleRequest).subscribe({
        next: (created) => {
          const newId = (created as any).id ?? (created as any).Id;

          if (newId) {
            this.rs.replaceRolePermissions(newId, permIds).subscribe({
              next: () => {
                this.saving = false;
                Swal.close();
                this.Toast.fire({ icon: 'success', title: 'Role created' });
                setTimeout(() => this.router.navigateByUrl('/roles'), 300);
              },
              error: (err) => {
                this.saving = false;
                Swal.close();
                this.error = 'Failed to assign permissions';
                console.error(err);
                Swal.fire({
                  title: 'Failed to assign permissions',
                  text: 'Role was created but assigning permissions failed. Please try again.',
                  icon: 'warning'
                }).then(() => {
                  // still navigate back because role exists; optional
                  this.router.navigateByUrl('/roles');
                });
              }
            });
          } else {
            // fallback
            this.saving = false;
            Swal.close();
            this.Toast.fire({ icon: 'success', title: 'Role created' });
            setTimeout(() => this.router.navigateByUrl('/roles'), 300);
          }
        },
        error: (err) => {
          this.saving = false;
          Swal.close();
          this.error = 'Failed to create role';
          console.error(err);
          Swal.fire({
            title: 'Failed to create role',
            text: 'An error occurred while creating the role. Please try again.',
            icon: 'error'
          });
        }
      });
    }
  }

  /** Cancel with confirmation if form is dirty */
  cancel() {
    if (this.form.dirty) {
      Swal.fire({
        title: 'Discard changes?',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'No, stay'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigateByUrl('/roles');
        }
      });
    } else {
      this.router.navigateByUrl('/roles');
    }
  }
}
