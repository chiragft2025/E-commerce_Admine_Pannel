import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/UserService';
import { RoleService } from '../../services/role.service';
import { User, CreateUserRequest, UpdateUserRequest, Role } from '../../models/User.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.css']
})
export class UserForm implements OnInit {
  form!: FormGroup;
  roles: Role[] = [];
  id?: number;
  isEdit = false;
  loading = false;
  saving = false;
  errorList: string[] = [];

  constructor(
    private fb: FormBuilder,
    private us: UserService,
    private rs: RoleService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize the form
    this.form = this.fb.group({
      userName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // required only on create
      isActive: [true],
      roleIds: [[] as number[]]
    });

    // load roles first, then load user if editing
    this.rs.list().subscribe({
      next: (r) => {
        // roles list must contain objects { id, name }
        this.roles = r ?? [];

        // now check route for id and load user if necessary
        const idStr = this.route.snapshot.paramMap.get('id');
        if (idStr && idStr !== 'new') {
          this.id = Number(idStr);
          this.isEdit = true;
          this.loadUser(this.id);
        } else {
          // create mode -> require password
          this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
          this.form.get('password')?.updateValueAndValidity();
        }
      },
      error: (e) => {
        console.error('Failed to load roles', e);
        // still try to load user (if editing) even if roles failed
        const idStr = this.route.snapshot.paramMap.get('id');
        if (idStr && idStr !== 'new') {
          this.id = Number(idStr);
          this.isEdit = true;
          this.loadUser(this.id);
        }
      }
    });
  }

  loadUser(id: number) {
    this.loading = true;
    this.us.get(id).subscribe({
      next: (u) => {
        // Determine roleIds:
        // Case A: backend returns roleIds (number[])
        if (u.roleIds && u.roleIds.length) {
          this.form.patchValue({
            userName: u.userName,
            email: u.email,
            isActive: u.isActive,
            roleIds: u.roleIds.map(x => Number(x))
          });
        } else if (Array.isArray(u.roles) && u.roles.length) {
          // Case B: backend returns roles as strings ["Admin","Manager"] OR as objects [{name, id}]
          const incoming = u.roles;

          // If roles are strings -> map role name -> id using loaded this.roles
          if (typeof incoming[0] === 'string') {
            const names = (incoming as unknown as string[]).map(s => s?.toString()?.trim()).filter(s => !!s);
            const mappedIds = names
              .map(name => this.roles.find(r => r.name === name))
              .filter(r => !!r)
              .map(r => r!.id);
            this.form.patchValue({
              userName: u.userName,
              email: u.email,
              isActive: u.isActive,
              roleIds: mappedIds
            });
          } else {
            // roles are objects with { id, name }
            const mappedIds = (incoming as any[]).map(x => Number(x.id)).filter(n => !isNaN(n));
            this.form.patchValue({
              userName: u.userName,
              email: u.email,
              isActive: u.isActive,
              roleIds: mappedIds
            });
          }
        } else {
          // No role info returned -> leave roleIds empty
          this.form.patchValue({
            userName: u.userName,
            email: u.email,
            isActive: u.isActive,
            roleIds: []
          });
        }

        this.loading = false;
      },
      error: (e) => { console.error('Failed to load user', e); this.loading = false; }
    });
  }

  private parseServerError(err: any): string[] {
    const out: string[] = [];
    const body = err?.error ?? err;
    if (!err) return ['Unknown error'];
    if (typeof body === 'string') { out.push(body); return out; }
    if (body?.message && typeof body.message === 'string') out.push(body.message);
    if (Array.isArray(body?.errors)) out.push(...body.errors.map((x:any)=>String(x)));
    if (body?.errors && typeof body.errors === 'object') {
      for (const k of Object.keys(body.errors)) {
        const v = body.errors[k];
        if (Array.isArray(v)) out.push(...v.map((x:any)=>String(x)));
        else out.push(String(v));
      }
    }
    if (!out.length) {
      if (err?.statusText) out.push(err.statusText);
      else if (err?.message) out.push(err.message);
      else out.push('An unexpected error occurred');
    }
    return out;
  }

  save() {
    this.errorList = [];
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;

    const roleIds = (this.form.value.roleIds || []).map((v: any) => Number(v)).filter((n: number) => !isNaN(n));

    if (this.isEdit && this.id) {
      const payload: UpdateUserRequest = {
        userName: this.form.value.userName,
        email: this.form.value.email,
        ...(this.form.value.password ? { password: this.form.value.password } : {}),
        isActive: this.form.value.isActive,
        roleIds: roleIds
      };
      this.us.update(this.id, payload).subscribe({
        next: () => { this.saving = false; this.router.navigateByUrl('/users'); },
        error: (err) => { this.saving = false; this.errorList = this.parseServerError(err); console.error(err); }
      });
    } else {
      const payload: CreateUserRequest = {
        userName: this.form.value.userName,
        email: this.form.value.email,
        password: this.form.value.password,
        isActive: this.form.value.isActive,
        roleIds: roleIds
      };
      this.us.create(payload).subscribe({
        next: () => { this.saving = false; this.router.navigateByUrl('/users'); },
        error: (err) => { this.saving = false; this.errorList = this.parseServerError(err); console.error(err); }
      });
    }
  }

  cancel() { this.router.navigateByUrl('/users'); }
}
