import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Auth } from '../services/auth';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // route.data.permission can be string or string[]
    // route.data.permissionMode: 'any' | 'all'  (default 'all')
    const required = route.data['permission'];
    const mode = route.data['permissionMode'] ?? 'all';

    if (!required) return true;

    const requiredList = Array.isArray(required) ? required : [required];

    const ok = mode === 'any'
      ? requiredList.some((p: string) => this.auth.hasPermission(p))
      : requiredList.every((p: string) => this.auth.hasPermission(p));

    if (!ok) {
      this.router.navigate(['/forbidden']);
      return false;
    }

    return true;
  }
}
