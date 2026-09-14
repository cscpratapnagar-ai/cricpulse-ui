import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  loading = false;
  showPassword = false;
  dark = false;
  toast = '';
  toastTitle = '';
  toastType: 'error' | 'success' = 'error';
  toggleTheme() {
    this.dark = !this.dark;
    document.body.classList.toggle('dark-theme', this.dark);
  }
  submit() {
    const email = this.email.trim().toLowerCase(),
      name = this.fullName.trim(),
      phone = this.phone.trim();
    if (!name) return this.showToast('Full name is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return this.showToast('Please enter a valid email address.');
    if (!phone) return this.showToast('Mobile number is required.');
    if (this.password.length < 8) return this.showToast('Password must be at least 8 characters.');
    if (this.password !== this.confirmPassword) return this.showToast('Passwords do not match.');
    this.loading = true;
    this.http
      .post(`${API_BASE_URL}/users`, {
        fullName: name,
        email,
        phone,
        password: this.password,
        role: 'PLAYER',
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.showToast(
            'Account created successfully. You can sign in now.',
            'Account created',
            'success',
          );
          setTimeout(() => this.router.navigateByUrl('/login?registered=1'), 900);
        },
        error: (r: HttpErrorResponse) => {
          this.loading = false;
          this.showToast(r.error?.message || 'We could not create your account. Please try again.');
        },
      });
  }
  private showToast(
    message: string,
    title = 'Account creation failed',
    type: 'error' | 'success' = 'error',
  ) {
    this.toast = message;
    this.toastTitle = title;
    this.toastType = type;
    setTimeout(() => (this.toast = ''), 6000);
  }
}
