import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { CurrentUserService } from '../../../../core/services/current-user.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('shows validation feedback when credentials are missing', () => {
    component.submit();

    expect(component.message).toBe('Enter your email and password.');
    expect(component.loading).toBeFalse();
  });

  it('normalizes credentials and completes the authenticated navigation flow', () => {
    const http = (component as any).http;
    const router = TestBed.inject(Router);
    const users = TestBed.inject(CurrentUserService);

    spyOn(http, 'post').and.returnValue(of({ accessToken: 'token-123' }));
    spyOn(http, 'get').and.returnValues(
      of({ id: 'u1', fullName: 'Player One', email: 'PLAYER@EXAMPLE.COM' }),
      of([]),
    );
    spyOn(router, 'navigateByUrl');
    spyOn(users, 'set').and.callThrough();

    component.email = ' PLAYER@EXAMPLE.COM ';
    component.password = 'secret123';
    component.submit();

    expect(http.post).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.objectContaining({ email: 'player@example.com', password: 'secret123' }),
    );
    expect(localStorage.getItem('cricketpulse_access_token')).toBe('token-123');
    expect(users.user()?.email).toBe('PLAYER@EXAMPLE.COM');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
