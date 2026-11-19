import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Global blocking UI is opt-in. Most requests should use their page or control
 * loading state so background refreshes never cover the user's workspace.
 */
export const SHOW_GLOBAL_LOADING = new HttpContextToken<boolean>(() => false);

/** Kept as an explicit override for callers that must suppress a global loader. */
export const SKIP_GLOBAL_LOADING = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.context.get(SHOW_GLOBAL_LOADING) || request.context.get(SKIP_GLOBAL_LOADING)) {
    return next(request);
  }

  const loading = inject(LoadingService);
  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};
