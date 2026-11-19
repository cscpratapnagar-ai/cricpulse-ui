import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { AdminUsersComponent } from './admin-users.component';

describe('AdminUsersComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads platform users on initialization', () => {
    const fixture = TestBed.createComponent(AdminUsersComponent);
    fixture.detectChanges();

    const request = http.expectOne((req) => req.url === `${API_BASE_URL}/admin/users`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('25');
    request.flush([
      {
        id: 'user-1',
        fullName: 'A Player',
        email: 'player@example.com',
        role: 'PLAYER',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    expect(fixture.componentInstance.users()).toHaveLength(1);
    expect(fixture.componentInstance.users()[0].email).toBe('player@example.com');
  });

  it('sends a role update to the protected admin API', () => {
    const fixture = TestBed.createComponent(AdminUsersComponent);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === `${API_BASE_URL}/admin/users`)
      .flush([]);

    const user = {
      id: 'user-2',
      fullName: 'Match Scorer',
      email: 'scorer@example.com',
      role: 'SCORER',
      createdAt: '2026-01-01T00:00:00Z',
    };
    fixture.componentInstance.saveRole(user);

    const request = http.expectOne(`${API_BASE_URL}/admin/users/user-2/role`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ role: 'SCORER' });
    request.flush(user);

    expect(fixture.componentInstance.notice()).toContain('Role updated');
    expect(fixture.componentInstance.savingUserId()).toBeNull();
  });

  it('shows an authorization message when the API denies access', () => {
    const fixture = TestBed.createComponent(AdminUsersComponent);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === `${API_BASE_URL}/admin/users`)
      .flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(fixture.componentInstance.error()).toContain('do not have permission');
  });
});
