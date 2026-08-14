import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface AuthResponse { accessToken: string; userId: string; fullName: string; email: string; role: string; }
interface ApiError { error?: { code?: string; message?: string }; }
interface CurrentUser { userId?: string; id?: string; fullName?: string; email?: string; role?: string; }

@Component({
  selector: 'app-login', standalone: true, imports: [FormsModule, RouterLink],
  template: `<main class="auth-page"><a class="logo" routerLink="/"><span>◉</span> CricketPulse</a><section class="auth-card"><div class="eyebrow">WELCOME BACK</div><h1>Back in the game</h1><p class="subtitle">Sign in to your cricket world.</p><form (ngSubmit)="submit()"><label>Email address<input name="email" type="email" [(ngModel)]="email" placeholder="you@example.com" autocomplete="email" required /></label><label>Password<input name="password" type="password" [(ngModel)]="password" placeholder="Your password" autocomplete="current-password" required /></label><div class="forgot"><a href="/login">Forgot password?</a></div><button [disabled]="loading">{{ loading ? 'Signing in...' : 'Sign in' }} <b>→</b></button></form>@if (message) { <div class="notice" role="alert">{{ message }}</div> }<div class="switch">New to CricketPulse? <a routerLink="/signup">Create an account</a></div></section></main>`,
  styles: [`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.auth-page{box-sizing:border-box;min-height:100vh;padding:28px clamp(16px,6vw,80px);font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 20% 10%,#164b38,transparent 35%)}.logo{color:#f3fbf6;text-decoration:none;font-size:22px;font-weight:850}.logo span{color:#b8f45c;font-size:28px;margin-right:7px}.auth-card{box-sizing:border-box;width:min(420px,100%);margin:110px auto 0;padding:clamp(22px,5vw,38px);border:1px solid #ffffff20;border-radius:22px;background:#0c2119d9;box-shadow:0 25px 70px #0007;backdrop-filter:blur(18px)}.eyebrow{color:#b8f45c;font-size:10px;letter-spacing:2px;font-weight:850}h1{margin:15px 0 7px;font-size:clamp(28px,8vw,34px);letter-spacing:-1.5px}.subtitle{color:#91aa9d;margin:0 0 30px}form{display:grid;gap:17px}label{display:grid;gap:7px;color:#b9ccc2;font-size:12px;font-weight:700}input{box-sizing:border-box;width:100%;min-width:0;padding:14px;border:1px solid #ffffff1c;border-radius:9px;background:#ffffff0b;color:#fff;outline:none;font:inherit}input:focus{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}.forgot{text-align:right}.forgot a{color:#91aa9d;font-size:11px;text-decoration:none}button{width:100%;padding:15px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}button b{float:right;font-size:18px}button:disabled{opacity:.6}.notice{margin-top:15px;padding:11px;border-radius:8px;background:#ff766d18;color:#ffaaa4;font-size:12px}.switch{text-align:center;color:#789386;font-size:12px;line-height:1.5;margin-top:26px}.switch a{color:#b8f45c;text-decoration:none;font-weight:800}@media(max-width:480px){.auth-page{padding:20px 14px}.auth-card{margin-top:55px;border-radius:16px}.logo{font-size:19px}.logo span{font-size:24px}}`]
})
export class LoginComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  email = ''; password = ''; loading = false; message = '';

  submit(): void {
    this.message = '';
    const email = this.email.trim().toLowerCase();
    if (!email || !this.password) { this.message = 'Enter your email and password.'; return; }
    this.loading = true;
    this.http.post<AuthResponse>('http://localhost:8080/api/auth/login', { email, password: this.password }).subscribe({
      next: response => {
        localStorage.setItem('cricketpulse_access_token', response.accessToken);
        this.http.get<CurrentUser>('http://localhost:8080/api/auth/me').subscribe({
          next: user => {
            localStorage.setItem('cricketpulse_user', JSON.stringify(user));
            this.router.navigateByUrl('/dashboard');
          },
          error: () => {
            localStorage.removeItem('cricketpulse_access_token');
            localStorage.removeItem('cricketpulse_user');
            this.loading = false;
            this.message = 'Sign-in succeeded, but your session could not be verified. Please try again.';
          }
        });
      },
      error: (err: HttpErrorResponse & ApiError) => {
        this.loading = false;
        this.message = err?.error?.code === 'INVALID_CREDENTIALS'
          ? 'Incorrect email or password.'
          : err?.error?.message || (err.status === 0 ? 'Cannot connect to CricketPulse server. Please make sure the backend is running.' : 'Unable to sign in right now. Please try again.');
      }
    });
  }
}
