import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Gives every delivery mutation a stable command id. HttpClient retries reuse
 * the same immutable HttpRequest, so the header remains identical on retry.
 * This is deliberately limited to delivery writes; reads and undo remain
 * ordinary HTTP operations.
 */
export const scoringCommandIdInterceptor: HttpInterceptorFn = (req, next) => {
  const isDeliveryMutation =
    req.method === 'POST' &&
    /\/api\/scoring\/innings\/[^/]+\/deliveries(?:\?|$)/.test(req.urlWithParams);

  if (!isDeliveryMutation || req.headers.has('X-Command-Id')) {
    return next(req);
  }

  const commandId = crypto.randomUUID();
  return next(req.clone({
    setHeaders: {
      'X-Command-Id': commandId,
    },
  }));
};
