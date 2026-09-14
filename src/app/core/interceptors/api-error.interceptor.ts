import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { clearSession } from '../auth/auth';
import { isApiRequest } from '../config/api.config';
import { CurrentUserService } from '../services/current-user.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const router = inject(Router);
  const currentUser = inject(CurrentUserService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.includes('/api/auth/login')
      ) {
        clearSession();
        currentUser.clear();

        if (!router.url.startsWith('/login')) {
          void router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    }),
  );
};
