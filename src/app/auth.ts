import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

const API_BASE = 'http://localhost:8080/api';
const CSRF_COOKIE = 'XSRF-TOKEN';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CurrentUser {
  userId?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const value = document.cookie.split('; ').find(cookie => cookie.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function isApiRequest(url: string): boolean {
  return url.startsWith(API_BASE);
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) return next(request);

  const http = inject(HttpClient);
  const credentialed = request.clone({
    withCredentials: true,
    headers: request.headers.delete('Authorization')
  });

  if (SAFE_METHODS.has(request.method.toUpperCase()) || request.url.includes('/api/auth/csrf')) {
    return next(credentialed);
  }

  const cookieToken = readCookie(CSRF_COOKIE);
  if (cookieToken) {
    return next(credentialed.clone({ setHeaders: { 'X-XSRF-TOKEN': cookieToken } }));
  }

  // Spring creates the CSRF cookie lazily. Bootstrap it before the first
  // state-changing request (including login and account registration).
  return http.get<{ token: string }>(`${API_BASE}/auth/csrf`, { withCredentials: true }).pipe(
    switchMap(({ token }) => next(credentialed.clone({ setHeaders: { 'X-XSRF-TOKEN': token } })))
  );
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);

  return http.get<CurrentUser>(`${API_BASE}/auth/me`).pipe(
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
  // Access credentials are HttpOnly cookies and cannot be read by JavaScript.
  localStorage.removeItem('cricketpulse_access_token');
  localStorage.removeItem('cricketpulse_user');
  localStorage.removeItem('cricketpulse_team');
}
