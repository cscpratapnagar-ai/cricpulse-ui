import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface AuthResponse {
  accessToken: string;
}
interface CurrentUser {
  userId?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
}
interface Team {
  id: string;
  name: string;
  city: string;
  ownerId: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  email = '';
  password = '';
  loading = false;
  message = '';
  showPassword = false;
  remember = true;
  dark = false;
  toggleTheme() {
    this.dark = !this.dark;
    document.body.classList.toggle('dark-theme', this.dark);
  }
  submit() {
    this.message = '';
    const email = this.email.trim().toLowerCase();
    if (!email || !this.password) {
      this.message = 'Enter your email and password.';
      return;
    }
    this.loading = true;
    this.http
      .post<AuthResponse>('http://localhost:8080/api/auth/login', {
        email,
        password: this.password,
      })
      .subscribe({
        next: (r) => {
          localStorage.setItem('cricketpulse_access_token', r.accessToken);
          this.http.get<CurrentUser>('http://localhost:8080/api/auth/me').subscribe({
            next: (u) => {
              localStorage.setItem('cricketpulse_user', JSON.stringify(u));
              this.http.get<Team[]>('http://localhost:8080/api/teams/mine').subscribe({
                next: (t) => {
                  if (t.length) localStorage.setItem('cricketpulse_team', JSON.stringify(t[0]));
                  this.router.navigateByUrl('/dashboard');
                },
                error: () => this.router.navigateByUrl('/dashboard'),
              });
            },
            error: () => {
              this.loading = false;
              this.message = 'Your session could not be verified. Please try again.';
            },
          });
        },
        error: (e: HttpErrorResponse) => {
          this.loading = false;
          this.message =
            e.status === 0
              ? 'Cannot connect to CricketPulse server.'
              : e.error?.message || 'Incorrect email or password.';
        },
      });
  }
}
