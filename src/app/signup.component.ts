import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup', standalone: true, imports: [FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <a class="logo" routerLink="/"><span>◉</span> CricketPulse</a>
      <section class="auth-card">
        <div class="eyebrow">START YOUR JOURNEY</div>
        <h1>Create your account</h1>
        <p class="subtitle">Bring your cricket community to life.</p>
        <form (ngSubmit)="submit()">
          <label>Full name<input name="fullName" [(ngModel)]="fullName" placeholder="Your full name" required /></label>
          <label>Email address<input name="email" type="email" [(ngModel)]="email" placeholder="you@example.com" required /></label>
          <label>Phone number<input name="phone" type="tel" [(ngModel)]="phone" placeholder="+91 98765 43210" required /><small>Mobile number is required and must be unique.</small></label>
          <label>Password><input name="password" type="password" [(ngModel)]="password" placeholder="At least 8 characters" required /><small [class.valid]="password.length >= 8">{{ password.length }}/8 minimum</small></label>
          <label>Confirm password<input name="confirmPassword" type="password" [(ngModel)]="confirmPassword" placeholder="Re-enter your password" required /></label>
          <button [disabled]="loading">{{ loading ? 'Creating account...' : 'Create free account' }} <b>→</b></button>
        </form>
        <div class="switch">Already have an account? <a routerLink="/login">Sign in</a></div>
      </section>

      @if (toast) {
        <div class="toast" [class.success]="toastType === 'success'" role="alert" aria-live="polite">
          <span class="toast-icon">{{ toastType === 'success' ? '✓' : '!' }}</span>
          <div><strong>{{ toastTitle }}</strong><p>{{ toast }}</p></div>
          <button type="button" class="toast-close" (click)="closeToast()" aria-label="Close">×</button>
        </div>
      }
    </main>
  `,
  styles: [`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.auth-page{box-sizing:border-box;min-height:100vh;padding:28px clamp(16px,6vw,80px);font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 80% 0,#164b38,transparent 35%)}.logo{color:#f3fbf6;text-decoration:none;font-size:22px;font-weight:850}.logo span{color:#b8f45c;font-size:28px;margin-right:7px}.auth-card{box-sizing:border-box;width:min(420px,100%);margin:70px auto 0;padding:clamp(22px,5vw,38px);border:1px solid #ffffff20;border-radius:22px;background:#0c2119d9;box-shadow:0 25px 70px #0007;backdrop-filter:blur(18px)}.eyebrow{color:#b8f45c;font-size:10px;letter-spacing:2px;font-weight:850}h1{margin:15px 0 7px;font-size:clamp(28px,8vw,34px);letter-spacing:-1.5px}.subtitle{color:#91aa9d;margin:0 0 30px}form{display:grid;gap:15px}label{display:grid;gap:7px;color:#b9ccc2;font-size:12px;font-weight:700}input{box-sizing:border-box;width:100%;min-width:0;padding:14px;border:1px solid #ffffff1c;border-radius:9px;background:#ffffff0b;color:#fff;outline:none;font:inherit}input:focus{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}small{color:#789386;font-size:10px;font-weight:600}small.valid{color:#b8f45c}button:not(.toast-close){width:100%;margin-top:8px;padding:15px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}button:not(.toast-close) b{float:right;font-size:18px}button:disabled{opacity:.6}.switch{text-align:center;color:#789386;font-size:12px;line-height:1.5;margin-top:26px}.switch a{color:#b8f45c;text-decoration:none;font-weight:800}.toast{position:fixed;z-index:1000;right:24px;bottom:24px;display:flex;align-items:flex-start;gap:12px;width:min(390px,calc(100vw - 32px));box-sizing:border-box;padding:15px 16px;border:1px solid #ff766d55;border-radius:14px;background:#15241feF;box-shadow:0 18px 50px #0009;backdrop-filter:blur(18px);animation:toast-in .25s ease-out}.toast.success{border-color:#b8f45c55}.toast-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#ff766d22;color:#ffaaa4;font-weight:900}.toast.success .toast-icon{background:#b8f45c22;color:#b8f45c}.toast strong{display:block;color:#f3fbf6;font-size:13px}.toast p{margin:4px 24px 0 0;color:#a7bbb0;font-size:12px;line-height:1.45}.toast-close{margin-left:auto!important;margin-top:-5px!important;width:auto!important;padding:0!important;background:transparent!important;color:#789386!important;font-size:22px!important;line-height:1!important}.toast-close:hover{color:#fff!important}@keyframes toast-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media(max-width:480px){.auth-page{padding:20px 14px}.auth-card{margin-top:40px;border-radius:16px}.logo{font-size:19px}.logo span{font-size:24px}.toast{right:16px;bottom:16px}}`]
})
export class SignupComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  fullName = ''; email = ''; phone = ''; password = ''; confirmPassword = ''; loading = false;
  toast = ''; toastTitle = ''; toastType: 'error' | 'success' = 'error'; private toastTimer?: ReturnType<typeof setTimeout>;

  submit(): void {
    this.closeToast();
    const email = this.email.trim().toLowerCase();
    const name = this.fullName.trim();
    const phone = this.phone.trim();
    if (!name) { this.showToast('Full name is required.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.showToast('Please enter a valid email address.'); return; }
    if (!phone) { this.showToast('Mobile number is required.'); return; }
    if (!/^\+?[0-9][0-9\s-]{8,14}$/.test(phone)) { this.showToast('Please enter a valid mobile number.'); return; }
    if (this.password.length < 8) { this.showToast('Password must be at least 8 characters.'); return; }
    if (this.password !== this.confirmPassword) { this.showToast('Passwords do not match.'); return; }

    this.loading = true;
    this.http.post('http://localhost:8080/api/users', { fullName: name, email, phone, password: this.password, role: 'PLAYER' }).subscribe({
      next: () => {
        this.loading = false;
        this.toastType = 'success';
        this.showToast('Account created successfully. You can sign in now.', 'Account created');
        setTimeout(() => this.router.navigateByUrl('/login?registered=1'), 900);
      },
      error: (response: HttpErrorResponse) => {
        this.loading = false;
        this.handleApiError(response);
      }
    });
  }

  private handleApiError(response: HttpErrorResponse): void {
    const body = response.error;
    if (body?.code === 'EMAIL_ALREADY_EXISTS') {
      this.showToast(body.message || 'An account with this email already exists. Please use another email or sign in.', 'Email already registered');
      return;
    }
    if (body?.code === 'PHONE_ALREADY_EXISTS') {
      this.showToast(body.message || 'An account with this mobile number already exists. Please use another mobile number.', 'Mobile already registered');
      return;
    }
    if (body?.fields && typeof body.fields === 'object') {
      const first = Object.values(body.fields)[0];
      if (first) { this.showToast(String(first)); return; }
    }
    if (body?.message) { this.showToast(String(body.message)); return; }
    if (response.status === 0) { this.showToast('Cannot connect to CricketPulse server. Please make sure the backend is running.', 'Server unavailable'); return; }
    this.showToast('We could not create your account. Please check your details and try again.');
  }

  private showToast(message: string, title = 'Account creation failed'): void {
    this.toastType = this.toastType === 'success' ? 'success' : 'error';
    this.toastTitle = title;
    this.toast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.closeToast(), 6000);
  }

  closeToast(): void {
    this.toast = '';
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }
}
