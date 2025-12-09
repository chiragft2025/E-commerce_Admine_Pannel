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

  // toast helper
  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true
  });

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
      roleIds: [[] as number[], Validators.required]
    });

    // --- Enforce single role immediately when user changes selection (keep last selected)
    this.form.get('roleIds')?.valueChanges.subscribe((val: any) => {
      if (Array.isArray(val) && val.length > 1) {
        const last = val[val.length - 1];
        // set as single-element array; don't re-emit event to avoid loops
        this.form.get('roleIds')?.setValue([last], { emitEvent: false });
      }
    });

    // load roles first, then load user if editing
    this.rs.list().subscribe({
      next: (r) => {
        this.roles = r ?? [];
        const idStr = this.route.snapshot.paramMap.get('id');
        if (idStr && idStr !== 'new') {
          this.id = Number(idStr);
          this.isEdit = true;
          this.loadUser(this.id);
        } else {
          this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
          this.form.get('password')?.updateValueAndValidity();
        }
      },
      error: (e) => {
        console.error('Failed to load roles', e);
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
    this.us.get(id).pipe(
      finalize(() => (this.loading = false))
    ).subscribe({
      next: (u) => {
        if (u.roleIds && u.roleIds.length) {
          // ensure numeric and keep only first (single)
          const mapped = u.roleIds.map(x => Number(x)).filter(n => !isNaN(n));
          const single = mapped.length ? [mapped[0]] : [];
          this.form.patchValue({
            userName: u.userName,
            email: u.email,
            isActive: u.isActive,
            roleIds: single
          });
        } else if (Array.isArray(u.roles) && u.roles.length) {
          const incoming = u.roles;
          if (typeof incoming[0] === 'string') {
            const names = (incoming as unknown as string[]).map(s => s?.toString()?.trim()).filter(s => !!s);
            const mappedIds = names
              .map(name => this.roles.find(r => r.name === name))
              .filter(r => !!r)
              .map(r => r!.id);
            // keep only first
            const single = mappedIds.length ? [mappedIds[0]] : [];
            this.form.patchValue({
              userName: u.userName,
              email: u.email,
              isActive: u.isActive,
              roleIds: single
            });
          } else {
            const mappedIds = (incoming as any[]).map(x => Number(x.id)).filter(n => !isNaN(n));
            const single = mappedIds.length ? [mappedIds[0]] : [];
            this.form.patchValue({
              userName: u.userName,
              email: u.email,
              isActive: u.isActive,
              roleIds: single
            });
          }
        } else {
          this.form.patchValue({
            userName: u.userName,
            email: u.email,
            isActive: u.isActive,
            roleIds: []
          });
        }
      },
      error: (e) => { console.error('Failed to load user', e); }
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

  /**
   * Main save() — asks for confirmation then performs a robust save.
   */
  save() {
    this.errorList = [];
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // normalize and enforce single role: choose first (you can change to last with roleIds[roleIds.length-1])
    const roleIds = (this.form.value.roleIds || []).map((v: any) => Number(v)).filter((n: number) => !isNaN(n));
    const singleRoleIds = roleIds.length ? [roleIds[0]] : [];

    const summaryLines = [
      `Username: ${this.form.value.userName}`,
      `Email: ${this.form.value.email}`,
      `Active: ${this.form.value.isActive ? 'Yes' : 'No'}`,
      `Roles: ${this.roles.filter(r => singleRoleIds.includes(r.id)).map(r => r.name).join(', ') || '—'}`
    ];
    const actionVerb = this.isEdit ? 'Update' : 'Create';

    Swal.fire({
      title: `${actionVerb} user?`,
      html: `<div style="text-align:left; margin-top:8px;">${summaryLines.map(l => `<div>${this.escapeHtml(l)}</div>`).join('')}</div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `${actionVerb}`,
      cancelButtonText: 'Cancel'
    }).then(confirmResult => {
      if (!confirmResult.isConfirmed) return;
      this.performSave(singleRoleIds);
    });
  }

  /**
   * Performs the save and returns a boolean via observable pipeline to remove ambiguity:
   *  - `true` -> success (navigate)
   *  - `false` -> failure (showed appropriate modal)
   */
  private performSave(roleIds: number[]) {
    this.saving = true;
    Swal.fire({
      title: this.isEdit ? 'Updating user...' : 'Creating user...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // choose API observable and normalize to boolean
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
        // If API returns something, map to true (success)
        map(() => true),
        catchError(err => {
          const parsed = this.parseServerError(err);
          this.errorList = parsed;
          const html = `<ul style="text-align:left">${parsed.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}</ul>`;
          Swal.fire({ title: 'Failed to update user', html, icon: 'error' });
          return of(false);
        }),
        finalize(() => {
          this.saving = false;
          Swal.close();
        })
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
        catchError(err => {
          const parsed = this.parseServerError(err);
          this.errorList = parsed;
          const html = `<ul style="text-align:left">${parsed.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}</ul>`;
          Swal.fire({ title: 'Failed to create user', html, icon: 'error' });
          return of(false);
        }),
        finalize(() => {
          this.saving = false;
          Swal.close();
        })
      );
    }

    // subscribe once and act on boolean result
    op$.subscribe({
      next: (ok: boolean) => {
        if (!ok) return; // error already displayed
        // success: toast then navigate
        this.Toast.fire({ icon: 'success', title: this.isEdit ? 'User updated' : 'User created' });
        // navigate after tiny delay to ensure toast displays (optional)
        setTimeout(() => this.router.navigateByUrl('/users'), 150);
      },
      error: (e) => {
        // defensive: should not happen because catchError returns boolean observable
        console.error('Unexpected error in save subscription', e);
        Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error' });
      }
    });
  }

  cancel() {
    if (this.form.dirty) {
      Swal.fire({
        title: 'Discard changes?',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'No, stay'
      }).then(result => {
        if (result.isConfirmed) this.router.navigateByUrl('/users');
      });
    } else {
      this.router.navigateByUrl('/users');
    }
  }

  // small helper to escape HTML in messages (prevents markup injection)
  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
