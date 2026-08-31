import { Injectable, computed, signal } from '@angular/core';

export interface CurrentUser {
  userId?: string;
  id?: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  email?: string;
  role?: string;
}

const STORAGE_KEY = 'cricketpulse_user';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly userState = signal<CurrentUser | null>(this.readFromStorage());
  readonly user = this.userState.asReadonly();
  readonly displayName = computed(() => {
    const user = this.userState();
    return user?.fullName?.trim() || user?.name?.trim() || user?.firstName?.trim() || user?.email?.split('@')[0] || 'there';
  });
  set(user: CurrentUser): void { this.userState.set(user); localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); }
  clear(): void { this.userState.set(null); localStorage.removeItem(STORAGE_KEY); }
  private readFromStorage(): CurrentUser | null {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as CurrentUser : null; }
    catch { return null; }
  }
}
