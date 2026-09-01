import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let component: SignupComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    component = TestBed.createComponent(SignupComponent).componentInstance;
  });

  it('rejects an invalid email before making an API request', () => {
    component.fullName = 'Player One';
    component.email = 'invalid-email';
    component.phone = '9999999999';
    component.password = 'secret123';
    component.confirmPassword = 'secret123';

    component.submit();

    expect(component.toast).toContain('valid email');
    expect(component.loading).toBeFalse();
  });

  it('submits normalized registration data and shows success feedback', () => {
    const http = (component as any).http;
    const router = TestBed.inject(Router);

    spyOn(http, 'post').and.returnValue(of({}));
    spyOn(router, 'navigateByUrl');

    component.fullName = ' Player One ';
    component.email = ' PLAYER@EXAMPLE.COM ';
    component.phone = '9999999999';
    component.password = 'secret123';
    component.confirmPassword = 'secret123';
    component.submit();

    expect(http.post).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.objectContaining({
        fullName: 'Player One',
        email: 'player@example.com',
        role: 'PLAYER',
      }),
    );
    expect(component.toastType).toBe('success');
    expect(component.toast).toContain('Account created successfully');
  });
});
