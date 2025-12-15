import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/UserService';
import { RoleService } from '../../services/role.service';
import { User, CreateUserRequest, UpdateUserRequest, Role } from '../../models/User.model';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
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

    this.form = this.fb.group({
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // required only when creating
      isActive: [true],
      roleIds: [[], Validators.required] // required only in create mode!
    });

    // detect edit mode early
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr && idStr !== 'new') {
      this.id = Number(idStr);
      this.isEdit = true;

      // ⭐ FIX: roleIds must NOT be required in edit mode because input is hidden
      const roleCtrl = this.form.get('roleIds');
      roleCtrl?.clearValidators();
      roleCtrl?.updateValueAndValidity();
    } else {
      // create mode password required
      this.form.get('password')?.setValidators([
        Validators.required,
        Validators.minLength(6)
      ]);
      this.form.get('password')?.updateValueAndValidity();
    }

    // enforce single role
    this.form.get('roleIds')?.valueChanges.subscribe((val: number[]) => {
      if (Array.isArray(val) && val.length > 1) {
        this.form.get('roleIds')?.setValue([val[val.length - 1]], {
          emitEvent: false
        });
      }
    });

    // load roles then load user (if edit mode)
    this.rs.list().subscribe({
      next: (roles) => {
        this.roles = roles ?? [];
        if (this.isEdit && this.id) {
          this.loadUser(this.id);
        }
      },
      error: (err) => {
        console.error("Failed to load roles", err);
        if (this.isEdit && this.id) {
          this.loadUser(this.id);
        }
      }
    });
  }

  loadUser(id: number) {
    this.loading = true;
    this.us.get(id)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (u) => {
          const roleIds = this.getNormalizedRoleIds(u);

          this.form.patchValue({
            userName: u.userName,
            email: u.email,
            isActive: u.isActive,
            roleIds: roleIds
          });

          this.form.get('roleIds')?.updateValueAndValidity();
        },
        error: (err) => console.error("Failed to load user", err)
      });
  }

  private getNormalizedRoleIds(u: User): number[] {
    if (u.roleIds?.length) return [u.roleIds[0]];

    if (Array.isArray(u.roles) && u.roles.length) {
      if (typeof u.roles[0] === "string") {
        const mapped = (u.roles as unknown as string[])
          .map(n => this.roles.find(r => r.name === n))
          .filter(Boolean)
          .map(r => r!.id);

        return mapped.length ? [mapped[0]] : [];
      }

      return [(u.roles as any[])[0].id];
    }

    return [];
  }

  save() {
    this.errorList = [];

    console.log("Save invoked, Valid:", this.form.valid);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;  // ❗ update API would not be called without fix above
    }

    const roleIds = this.isEdit
      ? this.form.value.roleIds.length ? [this.form.value.roleIds[0]] : []
      : this.form.value.roleIds;

    const actionVerb = this.isEdit ? "Update" : "Create";

    Swal.fire({
      title: `${actionVerb} user?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: actionVerb
    }).then(res => {
      if (res.isConfirmed) this.performSave(roleIds);
    });
  }

  private performSave(roleIds: number[]) {
    this.saving = true;

    Swal.fire({
      title: this.isEdit ? "Updating user..." : "Creating user...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    let op$;

    if (this.isEdit && this.id) {
      const payload: UpdateUserRequest = {
        userName: this.form.value.userName,
        email: this.form.value.email,
        ...(this.form.value.password ? { password: this.form.value.password } : {}),
        isActive: this.form.value.isActive,
        roleIds: roleIds
      };

      op$ = this.us.update(this.id, payload).pipe(
        map(() => true),
        catchError(err => this.handleError(err, "Failed to update user"))
      );
    } else {
      const payload: CreateUserRequest = {
        userName: this.form.value.userName,
        email: this.form.value.email,
        password: this.form.value.password,
        isActive: this.form.value.isActive,
        roleIds: roleIds
      };

      op$ = this.us.create(payload).pipe(
        map(() => true),
        catchError(err => this.handleError(err, "Failed to create user"))
      );
    }

    op$
      .pipe(finalize(() => {
        this.saving = false;
        Swal.close();
      }))
      .subscribe(ok => {
        if (!ok) return;

        Swal.fire({
          icon: "success",
          title: this.isEdit ? "User updated" : "User created",
          timer: 1500
        });

        setTimeout(() => this.router.navigateByUrl("/users"), 250);
      });
  }

  private handleError(err: any, title: string) {
    const parsed = this.parseServerError(err);
    this.errorList = parsed;

    Swal.fire({
      title,
      html: `<ul style="text-align:left">${parsed.map(e => `<li>${e}</li>`).join("")}</ul>`,
      icon: "error"
    });

    return of(false);
  }

  private parseServerError(err: any): string[] {
    const out: string[] = [];
    const body = err?.error ?? err;

    if (typeof body === "string") return [body];

    if (body?.message) out.push(body.message);

    if (Array.isArray(body?.errors)) {
      out.push(...body.errors.map((e: any) => String(e)));
    }

    if (typeof body?.errors === "object") {
      Object.values(body.errors).forEach(v => {
        if (Array.isArray(v)) out.push(...v.map(String));
        else out.push(String(v));
      });
    }

    if (!out.length) out.push("Unexpected server error");

    return out;
  }

  cancel() {
    if (this.form.dirty) {
      Swal.fire({
        title: "Discard changes?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Discard"
      }).then(res => {
        if (res.isConfirmed) this.router.navigateByUrl("/users");
      });
    } else {
      this.router.navigateByUrl("/users");
    }
  }
}
