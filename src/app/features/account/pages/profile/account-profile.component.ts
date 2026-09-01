import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CurrentUserService } from '../../../../core/services/current-user.service';

type Tab = 'profile' | 'account' | 'preferences' | 'security';

interface ProfileTab {
  key: Tab;
  label: string;
}

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-profile.component.html',
  styleUrl: './account-profile.component.scss',
})
export class AccountProfileComponent {
  readonly users = inject(CurrentUserService);
  readonly user = this.users.user;

  readonly tab = signal<Tab>('profile');
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly showName = signal(true);
  readonly compact = signal(false);
  readonly reduceMotion = signal(false);

  readonly tabs: ProfileTab[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'account', label: 'Account' },
    { key: 'preferences', label: 'Preferences' },
    { key: 'security', label: 'Security' },
  ];

  fullName = this.user()?.fullName || this.user()?.displayName || this.user()?.name || '';

  displayName = this.user()?.displayName || this.user()?.username || '';

  email = this.user()?.email || '';

  readonly initials = computed(
    () =>
      this.name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'CP',
  );

  get userEmail(): string {
    return this.user()?.email || 'Email not available';
  }

  get name(): string {
    return (
      this.user()?.displayName ||
      this.user()?.fullName ||
      this.user()?.name ||
      this.user()?.username ||
      'Player'
    );
  }

  get role(): string {
    return (this.user()?.role || 'PLAYER').toUpperCase();
  }

  get memberId(): string {
    return this.user()?.userId || this.user()?.id || '—';
  }

  toggleShowName(): void {
    this.showName.set(!this.showName());
  }

  toggleCompact(): void {
    this.compact.set(!this.compact());
  }

  toggleReduceMotion(): void {
    this.reduceMotion.set(!this.reduceMotion());
  }

  saveProfile(): void {
    this.saving.set(true);

    setTimeout(() => {
      const user = this.user() || {};

      this.users.set({
        ...user,
        fullName: this.fullName || user.fullName,
        displayName: this.displayName || user.displayName,
        email: this.email || user.email,
      });

      this.saving.set(false);
      this.saved.set(true);
    }, 350);
  }
}
