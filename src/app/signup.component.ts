import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup', standalone: true, imports: [FormsModule, RouterLink],
  template: `
    <main class="auth-page"><a class="logo" routerLink="/"><span>◉</span> CricketPulse</a><section class="auth-card"><div class="eyebrow">START YOUR JOURNEY</div><h1>Create your account</h1><p class="subtitle">Bring your cricket community to life.</p><form (ngSubmit)="submit()"><label>Full name<input name="fullName" [(ngModel)]="fullName" placeholder="Your full name" required /></label><label>Email address<input name="email" type="email" [(ngModel)]="email" placeholder="you@example.com" required /></label><label>Phone number<input name="phone" [(ngModel)]="phone" placeholder="+91 98765 43210" /></label><label>Password<input name="password" type="password" [(ngModel)]="password" placeholder="At least 8 characters" required /><small [class.valid]="password.length >= 8">{{ password.length }}/8 minimum</small></label><label>Confirm password<input name="confirmPassword" type="password" [(ngModel)]="confirmPassword" placeholder="Re-enter your password" required /></label><button [disabled]="loading">{{ loading ? 'Creating account...' : 'Create free account' }} <b>→</b></button></form>@if (error) { <div class="error">{{ error }}</div> }<div class="switch">Already have an account? <a routerLink="/login">Sign in</a></div></section></main>
  `,
  styles: [`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.auth-page{box-sizing:border-box;min-height:100vh;padding:28px clamp(16px,6vw,80px);font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 80% 0,#164b38,transparent 35%)}.logo{color:#f3fbf6;text-decoration:none;font-size:22px;font-weight:850}.logo span{color:#b8f45c;font-size:28px;margin-right:7px}.auth-card{box-sizing:border-box;width:min(420px,100%);margin:70px auto 0;padding:clamp(22px,5vw,38px);border:1px solid #ffffff20;border-radius:22px;background:#0c2119d9;box-shadow:0 25px 70px #0007;backdrop-filter:blur(18px)}.eyebrow{color:#b8f45c;font-size:10px;letter-spacing:2px;font-weight:850}h1{margin:15px 0 7px;font-size:clamp(28px,8vw,34px);letter-spacing:-1.5px}.subtitle{color:#91aa9d;margin:0 0 30px}form{display:grid;gap:15px}label{display:grid;gap:7px;color:#b9ccc2;font-size:12px;font-weight:700}input{box-sizing:border-box;width:100%;min-width:0;padding:14px;border:1px solid #ffffff1c;border-radius:9px;background:#ffffff0b;color:#fff;outline:none;font:inherit}input:focus{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}small{color:#789386;font-size:10px;font-weight:600}small.valid{color:#b8f45c}button{width:100%;margin-top:8px;padding:15px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}button b{float:right;font-size:18px}button:disabled{opacity:.6}.switch{text-align:center;color:#789386;font-size:12px;line-height:1.5;margin-top:26px}.switch a{color:#b8f45c;text-decoration:none;font-weight:800}.error{margin-top:15px;padding:11px;border-radius:8px;background:#ff766d18;color:#ffaaa4;font-size:12px;line-height:1.5}@media(max-width:480px){.auth-page{padding:20px 14px}.auth-card{margin-top:40px;border-radius:16px}.logo{font-size:19px}.logo span{font-size:24px}}`]
})
export class SignupComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  fullName = ''; email = ''; phone = ''; password = ''; confirmPassword = ''; loading = false; error = '';

  submit(): void {
    this.error = '';
    const email = this.email.trim().toLowerCase();
    const name = this.fullName.trim();
    if (!name) { this.error = 'Please enter your full name.'; return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error = 'Please enter a valid email address.'; return; }
    if (this.phone && !/^\+?[0-9\s-]{10,15}$/.test(this.phone.trim())) { this.error = 'Please enter a valid phone number.'; return; }
    if (this.password.length < 8) { this.error = 'Password must be at least 8 characters.'; return; }
    if (this.password !== this.confirmPassword) { this.error = 'Passwords do not match.'; return; }

    this.loading = true;
    this.http.post('http://localhost:8080/api/users', { fullName: name, email, phone: this.phone.trim(), password: this.password, role: 'PLAYER' }).subscribe({
      next: () => this.router.navigateByUrl('/login?registered=1'),
      error: (response: HttpErrorResponse) => {
        this.loading = false;
        this.error = this.apiError(response);
      }
    });
  }

  private apiError(response: HttpErrorResponse): string {
    const body = response.error;
    if (response.status === 409 || body?.code === 'EMAIL_ALREADY_EXISTS') return 'An account with this email already exists. Please sign in instead.';
    if (body?.fields && typeof body.fields === 'object') {
      const first = Object.values(body.fields)[0];
      if (first) return String(first);
    }
    if (body?.message) return String(body.message);
    if (response.status === 0) return 'Cannot connect to CricketPulse server. Please make sure the backend is running.';
    return 'We could not create your account. Please try again.';
  }
}
