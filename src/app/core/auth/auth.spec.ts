import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { authInterceptor, clearSession } from './auth';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('adds the bearer token to protected API requests', () => {
    localStorage.setItem('cricketpulse_access_token', 'token-123');
    const request = new HttpRequest('GET', '/api/matches');

    authInterceptor(request, (next) => {
      expect(next.headers.get('Authorization')).toBe('Bearer token-123');
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();
  });

  it('does not add the token to login requests', () => {
    localStorage.setItem('cricketpulse_access_token', 'token-123');
    const request = new HttpRequest('POST', '/api/auth/login');

    authInterceptor(request, (next) => {
      expect(next.headers.has('Authorization')).toBeFalse();
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();
  });
});

describe('clearSession', () => {
  it('removes authentication and cached user storage', () => {
    localStorage.setItem('cricketpulse_access_token', 'token');
    localStorage.setItem('cricketpulse_user', JSON.stringify({ id: '1' }));

    clearSession();

    expect(localStorage.getItem('cricketpulse_access_token')).toBeNull();
    expect(localStorage.getItem('cricketpulse_user')).toBeNull();
  });
});
