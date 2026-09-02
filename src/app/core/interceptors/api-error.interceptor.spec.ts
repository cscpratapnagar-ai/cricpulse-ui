import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';

import { CurrentUserService } from '../services/current-user.service';
import { apiErrorInterceptor } from './api-error.interceptor';

function runInterceptor(request: HttpRequest<unknown>) {
  return TestBed.runInInjectionContext(() =>
    apiErrorInterceptor(request, (nextRequest) => {
      expect(nextRequest).toBe(request);
      return throwError(
        () => new HttpErrorResponse({ status: 401, url: request.url }),
      );
    }),
  );
}

describe('apiErrorInterceptor', () => {
  let router: Router;
  let currentUser: CurrentUserService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), CurrentUserService],
    });
    router = TestBed.inject(Router);
    currentUser = TestBed.inject(CurrentUserService);
    localStorage.setItem('cricketpulse_access_token', 'token');
    currentUser.set({ id: '7', name: 'Scorer', email: 'scorer@example.com' });
  });

  it('clears the session when an authenticated API request returns 401', async () => {
    const request = new HttpRequest('GET', '/api/matches');

    await expectAsync(
      firstValueFrom(runInterceptor(request)),
    ).toBeRejected();

    expect(localStorage.getItem('cricketpulse_access_token')).toBeNull();
    expect(currentUser.user()).toBeNull();
    expect(router.url).toBe('/');
  });

  it('does not intercept non-API requests', async () => {
    const request = new HttpRequest('GET', 'https://example.com/data');
    const response = of({ ok: true });

    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        apiErrorInterceptor(request, () => response),
      ),
    );

    expect(result).toEqual({ ok: true });
  });
});
