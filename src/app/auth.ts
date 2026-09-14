import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

export interface CurrentUser {
  userId?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('cricketpulse_access_token');
  if (!token || request.url.includes('/api/auth/login')) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = localStorage.getItem('cricketpulse_access_token');

  if (!token) return router.createUrlTree(['/login']);

  return http.get<CurrentUser>('http://localhost:8080/api/auth/me').pipe(
    map(user => {
      localStorage.setItem('cricketpulse_user', JSON.stringify(user));
      return true;
    }),
    catchError(() => {
      clearSession();
      return of(router.createUrlTree(['/login']));
    })
  );
};

export function clearSession(): void {
  localStorage.removeItem('cricketpulse_access_token');
  localStorage.removeItem('cricketpulse_user');
}
