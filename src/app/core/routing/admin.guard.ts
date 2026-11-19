import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { CurrentUser, CurrentUserService } from '../services/current-user.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const currentUser = inject(CurrentUserService);

  return http.get<CurrentUser>(`${API_BASE_URL}/auth/me`, { withCredentials: true }).pipe(
    map((user) => {
      currentUser.set(user);
      return user.role?.toUpperCase() === 'ADMIN' ? true : router.createUrlTree(['/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
