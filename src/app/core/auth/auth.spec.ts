import { HttpEvent, HttpEventType, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { concat, of } from 'rxjs';
import { authInterceptor, clearSession } from './auth';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('sends API requests with browser credentials and no bearer token', () => {
    localStorage.setItem('cricketpulse_access_token', 'legacy-token');
    const request = new HttpRequest('GET', '/api/matches');

    authInterceptor(request, (next) => {
      expect(next.withCredentials).toBeTrue();
      expect(next.headers.has('Authorization')).toBeFalse();
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();
  });

  it('bootstraps CSRF and adds its header to unsafe API requests', () => {
    const request = new HttpRequest('POST', '/api/matches', { name: 'Final' });
    const calls: HttpRequest<unknown>[] = [];

    authInterceptor(request, (next) => {
      calls.push(next);
      if (calls.length === 1) {
        expect(next.url).toContain('/api/auth/csrf');
        expect(next.withCredentials).toBeTrue();
        return concat(
          of({ type: HttpEventType.Sent } as HttpEvent<unknown>),
          of(new HttpResponse({ body: { token: 'csrf-123' } })),
        );
      }
      expect(next.headers.get('X-XSRF-TOKEN')).toBe('csrf-123');
      expect(next.withCredentials).toBeTrue();
      return of(new HttpResponse({ status: 201 }));
    }).subscribe();

    expect(calls.length).toBe(2);
  });

  it('does not recursively bootstrap the CSRF endpoint', () => {
    const request = new HttpRequest('GET', '/api/auth/csrf');
    authInterceptor(request, (next) => {
      expect(next.withCredentials).toBeTrue();
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();
  });
});

describe('clearSession', () => {
  it('removes legacy authentication and cached user storage', () => {
    localStorage.setItem('cricketpulse_access_token', 'legacy-token');
    localStorage.setItem('cricketpulse_user', JSON.stringify({ id: '1' }));

    clearSession();

    expect(localStorage.getItem('cricketpulse_access_token')).toBeNull();
    expect(localStorage.getItem('cricketpulse_user')).toBeNull();
  });
});
