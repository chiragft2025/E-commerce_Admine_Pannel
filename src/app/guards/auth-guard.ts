import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '../services/auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private auth: Auth, private router: Router) {}

  canActivate(): boolean {
    const isAuth = this.auth.isAuthenticated();
    console.log("AuthGuard → isAuthenticated:", isAuth);
    if (isAuth) return true;

    this.router.navigate(['/login']);
    return false;
  }
}