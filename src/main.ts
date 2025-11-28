import { bootstrapApplication } from '@angular/platform-browser';
import 'zone.js';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { importProvidersFrom } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { AuthInterceptor } from './app/interceptors/auth-interceptor';
import { AuthGuard } from './app/guards/auth-guard';

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(HttpClientModule, ReactiveFormsModule),
    provideRouter(routes),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    AuthGuard
  ]
});
