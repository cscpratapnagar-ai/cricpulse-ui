import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export const canAccessBroadcastControl: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const matchId = route.paramMap.get('id');

  if (!matchId) {
    return router.createUrlTree(['/matches']);
  }

  return http.get(`${API_BASE_URL}/matches/${matchId}`).pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/matches', matchId]))),
  );
};
