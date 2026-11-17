import { HttpClient, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { API_BASE_URL, isApiRequest } from '../config/api.config';
import { CurrentUser, CurrentUserService } from '../services/current-user.service';

export type { CurrentUser };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) return next(request);

  const cookieRequest = request.clone({ withCredentials: true });
  if (request.url.includes('/api/auth/csrf')) return next(cookieRequest);
  if (SAFE_METHODS.has(request.method.toUpperCase())) return next(cookieRequest);

  // Fetch a synchronizer token before unsafe requests. The access token stays HttpOnly.
  const csrfRequest = new HttpRequest('GET', `${API_BASE_URL}/auth/csrf`, null, {
    withCredentials: true,
  });
  return next(csrfRequest).pipe(
    switchMap((response) => {
      const token = (response as { body?: { token?: string } }).body?.token;
      if (!token) throw new Error('Unable to initialize CSRF protection.');
      return next(cookieRequest.clone({ setHeaders: { 'X-XSRF-TOKEN': token } }));
    }),
  );
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const currentUser = inject(CurrentUserService);

  return http.get<CurrentUser>(`${API_BASE_URL}/auth/me`, { withCredentials: true }).pipe(
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
  localStorage.removeItem('cricketpulse_team');
  localStorage.removeItem('cricketpulse_active_team_id');
}
