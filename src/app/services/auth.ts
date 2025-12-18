// src/app/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TokenStorage } from './token-storage';
import { tap } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private baseUrl = environment.apiUrl + '/api/auth';

  // permissions BehaviorSubject so other components can subscribe
  private _permissions = new BehaviorSubject<string[]>([]);
  public permissions$ = this._permissions.asObservable();

  constructor(
    private http: HttpClient,
    private token: TokenStorage
  ) {
    // initialize from stored token if present
    this.initFromStorage();
  }

  /** Call at service startup to populate permissions from stored token */
  initFromStorage() {
    const token = this.token.getAccessToken();
    if (token) {
      this.loadPermissionsFromToken(token);
    } else {
      this._permissions.next([]);
    }
  }

  // ---------------- EXISTING METHODS (UNCHANGED) ----------------

  login(model: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, model).pipe(
      tap(res => {
        console.log('Auth.login raw response:', res);

        const token =
          res?.accessToken ??
          res?.token ??
          res?.jwt ??
          res?.data?.accessToken ??
          res?.data?.token ??
          res?.result?.token ??
          null;

        console.log('Auth.login detected token:', token);

        if (token) {
          this.token.saveAccessToken(token);
          this.loadPermissionsFromToken(token);
        } else {
          console.warn('Auth.login: no token found in response. Response keys:', Object.keys(res || {}));
        }
      })
    );
  }

  register(model: any) {
    return this.http.post(`${this.baseUrl}/register`, model);
  }

  isAuthenticated() {
    return !!this.token.getAccessToken();
  }

  logout() {
    this.token.clear();
    this._permissions.next([]);
  }

  getToken(): string | null {
    return this.token.getAccessToken();
  }

  getUserId(): number | null {
    const payload = this._readTokenPayload();
    if (!payload) return null;
    const sub =
      payload.sub ??
      payload.nameid ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const n = Number(sub);
    return isNaN(n) ? null : n;
  }

  getUserName(): string | null {
    const payload = this._readTokenPayload();
    if (!payload) return null;
    return payload.unique_name ?? payload.name ?? null;
  }

  getPermissions(): string[] {
    return this._permissions.getValue();
  }

  hasPermission(code: string): boolean {
    return this.getPermissions().includes(code);
  }

  private loadPermissionsFromToken(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const claim = payload.permission ?? payload.permissions ?? payload.perms ?? null;

      let perms: string[] = [];

      if (Array.isArray(claim)) {
        perms = claim.map(String);
      } else if (typeof claim === 'string') {
        perms = claim.includes(',')
          ? claim.split(',').map(s => s.trim())
          : [claim];
      }

      this._permissions.next(Array.from(new Set(perms.filter(Boolean))));
    } catch (err) {
      console.warn('Auth.loadPermissionsFromToken: failed to parse token', err);
      this._permissions.next([]);
    }
  }

  private _readTokenPayload(): any | null {
    const token = this.token.getAccessToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  // ---------------- NEW METHODS (FORGOT PASSWORD FLOW) ----------------

  /**
   * Step 1: Request OTP for password reset
   * Backend: POST /api/auth/forgot-password
   */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, {
      email: email.trim().toLowerCase(),
    });
  }

  /**
   * Step 2: Verify OTP
   * Backend: POST /api/auth/verify-otp
   */
  verifyOtp(email: string, otp: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/verify-otp`, {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });
  }

  /**
   * Step 3: Reset password using OTP
   * Backend: POST /api/auth/reset-password
   */
  resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
  }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, {
      email: data.email.trim().toLowerCase(),
      otp: data.otp.trim(),
      newPassword: data.newPassword,
    });
  }
}
