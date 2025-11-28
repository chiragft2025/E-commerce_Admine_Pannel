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

  login(model: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, model).pipe(
      tap(res => {
        // log raw response for debugging
        console.log('Auth.login raw response:', res);

        // try several common places where token might appear
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

  /** Return stored token (convenience) */
  getToken(): string | null {
    return this.token.getAccessToken();
  }

  /** Extract user id from JWT 'sub' or 'nameid' claim (returns number or null) */
  getUserId(): number | null {
    const payload = this._readTokenPayload();
    if (!payload) return null;
    const sub = payload.sub ?? payload.nameid ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const n = Number(sub);
    return isNaN(n) ? null : n;
  }

  /** Extract username from JWT 'unique_name' or 'name' claim */
  getUserName(): string | null {
    const payload = this._readTokenPayload();
    if (!payload) return null;
    return payload.unique_name ?? payload.name ?? null;
  }

  /** Return currently loaded permissions (array) */
  getPermissions(): string[] {
    return this._permissions.getValue();
  }

  /** Check if current user has permission code */
  hasPermission(code: string): boolean {
    return this.getPermissions().includes(code);
  }

  /**
   * Parse token and populate permissions BehaviorSubject.
   * Accepts token with 'permission' claim as either array or single string.
   */
  private loadPermissionsFromToken(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const claim = payload.permission ?? payload.permissions ?? payload.perms ?? null;

      let perms: string[] = [];

      if (Array.isArray(claim)) {
        perms = claim.map(String);
      } else if (typeof claim === 'string') {
        // sometimes single string or comma separated
        if (claim.includes(',')) perms = claim.split(',').map(s => s.trim());
        else perms = [claim];
      } else {
        perms = [];
      }

      // normalize and set
      this._permissions.next(Array.from(new Set(perms.filter(Boolean))));
    } catch (err) {
      console.warn('Auth.loadPermissionsFromToken: failed to parse token', err);
      this._permissions.next([]);
    }
  }

  /** read payload helper */
  private _readTokenPayload(): any | null {
    const token = this.token.getAccessToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
