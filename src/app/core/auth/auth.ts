import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CurrentUser, CurrentUserService } from '../services/current-user.service';
import { API_BASE_URL, isApiRequest } from '../config/api.config';

export type { CurrentUser };

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('cricketpulse_access_token');
  if (!token || !isApiRequest(request.url) || request.url.includes('/api/auth/login'))
    return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const currentUser = inject(CurrentUserService);
  const token = localStorage.getItem('cricketpulse_access_token');

  if (!token) return router.createUrlTree(['/login']);

  return http.get<CurrentUser>(`${API_BASE_URL}/auth/me`).pipe(
    map((user) => {
      currentUser.set(user);
      return true;
    }),
    catchError(() => {
      clearSession();
      currentUser.clear();
      return of(router.createUrlTree(['/login']));
    }),
  );
};

export function clearSession(): void {
  localStorage.removeItem('cricketpulse_access_token');
  localStorage.removeItem('cricketpulse_user');
}
