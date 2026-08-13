import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('cricketpulse_access_token');
  if (!token || request.url.includes('/api/auth/login')) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return localStorage.getItem('cricketpulse_access_token') ? true : router.createUrlTree(['/login']);
};

export function clearSession(): void {
  localStorage.removeItem('cricketpulse_access_token');
  localStorage.removeItem('cricketpulse_user');
}
