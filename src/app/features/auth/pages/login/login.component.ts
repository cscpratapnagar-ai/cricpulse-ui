import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { CurrentUserService } from '../../../../core/services/current-user.service';

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
  private readonly currentUser = inject(CurrentUserService);
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
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, {
        email,
        password: this.password,
      })
      .subscribe({
        next: (r) => {
          // A login may switch accounts in the same browser. Never retain the previous user's workspace.
          localStorage.removeItem('cricketpulse_team');
          localStorage.removeItem('cricketpulse_active_team_id');
          localStorage.setItem('cricketpulse_access_token', r.accessToken);
          this.http.get<CurrentUser>(`${API_BASE_URL}/auth/me`).subscribe({
            next: (u) => {
              this.currentUser.set(u);
              this.http.get<Team[]>(`${API_BASE_URL}/teams/mine`).subscribe({
                next: (t) => {
                  if (t.length) localStorage.setItem('cricketpulse_team', JSON.stringify(t[0]));
                  else localStorage.removeItem('cricketpulse_team');
                  localStorage.removeItem('cricketpulse_active_team_id');
                  this.router.navigateByUrl('/dashboard');
                },
                error: () => {
                  localStorage.removeItem('cricketpulse_team');
                  localStorage.removeItem('cricketpulse_active_team_id');
                  this.router.navigateByUrl('/dashboard');
                },
              });
            },
            error: () => {
              localStorage.removeItem('cricketpulse_access_token');
              localStorage.removeItem('cricketpulse_team');
              localStorage.removeItem('cricketpulse_active_team_id');
              this.loading = false;
              this.message = 'Your session could not be verified. Please try again.';
            },
          });
        },
        error: (e: HttpErrorResponse) => {
          localStorage.removeItem('cricketpulse_team');
          localStorage.removeItem('cricketpulse_active_team_id');
          this.loading = false;
          this.message =
            e.status === 0
              ? 'Cannot connect to CricketPulse server.'
              : e.error?.message || 'Incorrect email or password.';
        },
      });
  }
}
