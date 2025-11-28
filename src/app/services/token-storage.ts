// src/app/services/token-storage.ts
import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  saveAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}