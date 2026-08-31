import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'cricpulse-theme';

  readonly theme = signal<AppTheme>(this.readInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.apply(this.theme(), false);
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    try { localStorage.setItem(this.storageKey, theme); } catch {}
    this.apply(theme, true);
  }

  private readInitialTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(this.storageKey) as AppTheme | null;
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private apply(theme: AppTheme, animate: boolean): void {
    const root = this.document.documentElement;
    const body = this.document.body;

    if (animate) root.classList.add('theme-transition');

    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
    root.classList.toggle('theme-light', theme === 'light');
    root.classList.toggle('theme-dark', theme === 'dark');
    body.classList.toggle('theme-light', theme === 'light');
    body.classList.toggle('theme-dark', theme === 'dark');

    // Remove the transition marker after the paint so page-specific CSS can animate once.
    if (animate) {
      window.setTimeout(() => root.classList.remove('theme-transition'), 240);
    }
  }
}
