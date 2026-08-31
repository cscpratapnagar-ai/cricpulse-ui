import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';
export type ThemePreference = AppTheme | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'cricpulse-theme';
  private readonly media = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  readonly preference = signal<ThemePreference>(this.readInitialPreference());
  readonly theme = signal<AppTheme>(this.resolve(this.preference()));
  readonly isDark = computed(() => this.theme() === 'dark');
  readonly isSystem = computed(() => this.preference() === 'system');

  constructor() {
    this.apply(this.theme(), false);
    this.media?.addEventListener?.('change', this.handleSystemChange);
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(preference: ThemePreference): void {
    this.preference.set(preference);
    const resolved = this.resolve(preference);
    this.theme.set(resolved);
    try { localStorage.setItem(this.storageKey, preference); } catch {}
    this.apply(resolved, true);
  }

  private readonly handleSystemChange = (): void => {
    if (this.preference() !== 'system') return;
    const resolved = this.resolve('system');
    this.theme.set(resolved);
    this.apply(resolved, true);
  };

  private readInitialPreference(): ThemePreference {
    try {
      const saved = localStorage.getItem(this.storageKey) as ThemePreference | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {}
    return 'system';
  }

  private resolve(preference: ThemePreference): AppTheme {
    if (preference !== 'system') return preference;
    return this.media?.matches ? 'dark' : 'light';
  }

  private apply(theme: AppTheme, animate: boolean): void {
    const root = this.document.documentElement;
    const body = this.document.body;

    if (animate) root.classList.add('theme-transition');

    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add('theme-' + theme);
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add('theme-' + theme);

    const meta = this.document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#07130f' : '#f4f7f5');

    if (animate) window.setTimeout(() => root.classList.remove('theme-transition'), 240);
  }
}
