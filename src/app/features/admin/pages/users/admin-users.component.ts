import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { API_BASE_URL } from '../../../../core/config/api.config';

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly savingUserId = signal<string | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly query = signal('');
  readonly page = signal(0);
  readonly pageSize = 25;
  readonly roles = ['ADMIN', 'PLAYER', 'SCORER'];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set('');
    const params = new HttpParams()
      .set('q', this.query().trim())
      .set('page', this.page())
      .set('size', this.pageSize);
    this.http.get<AdminUser[]>(`${API_BASE_URL}/admin/users`, { params }).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.messageFor(error));
        this.loading.set(false);
      },
    });
  }

  search(): void {
    this.page.set(0);
    this.loadUsers();
  }

  changePage(delta: number): void {
    this.page.update((page) => Math.max(0, page + delta));
    this.loadUsers();
  }

  saveRole(user: AdminUser): void {
    this.savingUserId.set(user.id);
    this.error.set('');
    this.notice.set('');
    this.http.patch<AdminUser>(`${API_BASE_URL}/admin/users/${user.id}/role`, {
      role: user.role,
    }).subscribe({
      next: (updated) => {
        this.users.update((users) =>
          users.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.notice.set(`Role updated for ${updated.fullName}.`);
        this.savingUserId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.messageFor(error));
        this.savingUserId.set(null);
        this.loadUsers();
      },
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'You do not have permission to manage platform users.';
    }
    if (error.status === 409) {
      return (
        error.error?.detail ||
        error.error?.message ||
        'This role change is not allowed.'
      );
    }
    if (error.status === 0) {
      return 'Could not connect to CricPulse. Check your connection and retry.';
    }
    return (
      error.error?.detail ||
      error.error?.message ||
      'Unable to load or update users. Please retry.'
    );
  }
}
