import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

declare global {
  // Optional runtime override supplied by the hosting environment before main.ts loads.
  // Example: window.CRICPULSE_API_BASE_URL = 'https://api.example.com/api'
  interface Window { CRICPULSE_API_BASE_URL?: string; }
}

export const API_BASE = (typeof window !== 'undefined' && window.CRICPULSE_API_BASE_URL
  ? window.CRICPULSE_API_BASE_URL
  : 'http://localhost:8080/api').replace(/\/+$/, '');

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

const LEGACY_LOCAL_API_BASE = 'http://localhost:8080/api';

function normalizeApiUrl(url: string): string | null {
  if (url.startsWith(LEGACY_LOCAL_API_BASE)) return url.replace(LEGACY_LOCAL_API_BASE, API_BASE);
  if (url.startsWith(API_BASE)) return url;
  if (url.startsWith('/api/')) return url;
  return null;
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = normalizeApiUrl(request.url);
  if (!apiUrl) return next(request);

  const http = inject(HttpClient);
  const credentialed = request.clone({
    url: apiUrl,
    withCredentials: true,
    headers: request.headers.delete('Authorization')
  });

  if (SAFE_METHODS.has(request.method.toUpperCase()) || request.url.includes('/auth/csrf')) {
    return next(credentialed);
  }

  // The API may be on another origin, where its XSRF cookie is intentionally
  // unreadable to this page. In that case use the token returned by /auth/csrf.
  const cookieToken = readCookie(CSRF_COOKIE);
  if (cookieToken) {
    return next(credentialed.clone({ setHeaders: { 'X-XSRF-TOKEN': cookieToken } }));
  }

  return http.get<{ token: string }>(`${API_BASE}/auth/csrf`, { withCredentials: true }).pipe(
    switchMap(({ token }) => next(credentialed.clone({ setHeaders: { 'X-XSRF-TOKEN': token } })))
  );
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);

  return http.get<CurrentUser>(`${API_BASE}/auth/me`, { withCredentials: true }).pipe(
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
  localStorage.removeItem('cricketpulse_team');
}
