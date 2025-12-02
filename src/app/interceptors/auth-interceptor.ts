import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenStorage } from '../services/token-storage';

@Injectable({
  providedIn: 'root',
})
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private tokenStorage: TokenStorage,
    private router: Router
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.tokenStorage.getAccessToken();

    // Clone request if token exists
    const authReq = token
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {

        // 🔐 401 - NOT LOGGED IN
        if (error.status === 401) {
          this.tokenStorage.clear();  // remove invalid/expired token
          this.router.navigate(['/login']);
        }

        // ⛔ 403 - FORBIDDEN (permission denied)
        if (error.status === 403) {
          this.router.navigate(['/forbidden']);
        }

        return throwError(() => error);
      })
    );
  }
}
