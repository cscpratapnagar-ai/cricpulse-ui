import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemePreference } from '../../../../shared/services/theme.service';

type Section = 'appearance' | 'workspace' | 'notifications' | 'accessibility' | 'security' | 'data';
interface Toggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly active = signal<Section>('appearance');
  readonly search = signal('');
  readonly dirty = signal(false);
  readonly density = signal<'comfortable' | 'compact'>(
    (localStorage.getItem('cricpulse-density') as 'comfortable' | 'compact') || 'comfortable',
  );
  readonly themes = [
    {
      value: 'system' as ThemePreference,
      label: 'System',
      description: 'Follow your device automatically',
    },
    {
      value: 'dark' as ThemePreference,
      label: 'Dark mode',
      description: 'Focused low-light environment',
    },
    {
      value: 'light' as ThemePreference,
      label: 'Light mode',
      description: 'Clean high-clarity environment',
    },
  ];
  readonly densities = [
    { value: 'comfortable' as const, label: 'Comfortable', description: 'Balanced breathing room' },
    { value: 'compact' as const, label: 'Compact', description: 'More information per screen' },
  ];
  readonly sections = [
    {
      key: 'appearance' as Section,
      label: 'Appearance',
      description: 'Theme and density',
      icon: '◐',
    },
    {
      key: 'workspace' as Section,
      label: 'Workspace',
      description: 'Behavior and shortcuts',
      icon: '⌘',
    },
    {
      key: 'notifications' as Section,
      label: 'Notifications',
      description: 'Alerts and signals',
      icon: '◉',
    },
    {
      key: 'accessibility' as Section,
      label: 'Accessibility',
      description: 'Comfort and readability',
      icon: '◍',
    },
    {
      key: 'security' as Section,
      label: 'Security',
      description: 'Sessions and protection',
      icon: '◈',
    },
    {
      key: 'data' as Section,
      label: 'Data & privacy',
      description: 'Local preferences',
      icon: '◫',
    },
  ];
  workspace: Toggle[] = [
    {
      id: 'compact',
      label: 'Compact match cards',
      description: 'Show denser information in match directories.',
      enabled: true,
      icon: '▦',
    },
    {
      id: 'motion',
      label: 'Interface motion',
      description: 'Keep subtle transitions and micro-interactions enabled.',
      enabled: true,
      icon: '↗',
    },
    {
      id: 'shortcuts',
      label: 'Keyboard shortcuts',
      description: 'Enable quick actions and navigation shortcuts.',
      enabled: true,
      icon: '⌘',
    },
  ];
  notifications: Toggle[] = [
    {
      id: 'live',
      label: 'Live match updates',
      description: 'Important scoring and match status changes.',
      enabled: true,
      icon: '●',
    },
    {
      id: 'match',
      label: 'Match reminders',
      description: 'Upcoming match and workflow reminders.',
      enabled: true,
      icon: '◉',
    },
    {
      id: 'insights',
      label: 'Performance insights',
      description: 'Milestones and notable player trends.',
      enabled: false,
      icon: '✦',
    },
  ];
  accessibility: Toggle[] = [
    {
      id: 'reducedMotion',
      label: 'Reduce motion',
      description: 'Minimize non-essential animations and transitions.',
      enabled: false,
      icon: '≈',
    },
    {
      id: 'contrast',
      label: 'Higher contrast',
      description: 'Increase visual separation for interface elements.',
      enabled: false,
      icon: '◐',
    },
    {
      id: 'focus',
      label: 'Enhanced focus indicators',
      description: 'Make keyboard focus states more prominent.',
      enabled: true,
      icon: '⌖',
    },
  ];
  private snapshot = JSON.stringify({
    density: this.density(),
    workspace: this.workspace.map((x) => x.enabled),
    notifications: this.notifications.map((x) => x.enabled),
    accessibility: this.accessibility.map((x) => x.enabled),
    theme: this.theme.preference(),
  });
  get searchResults() {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.sections.filter((s) => [s.label, s.description].join(' ').toLowerCase().includes(q))
      : [];
  }
  setTheme(v: ThemePreference) {
    this.theme.setTheme(v);
    this.markDirty();
  }
  setDensity(v: 'comfortable' | 'compact') {
    this.density.set(v);
    this.markDirty();
  }
  toggle(list: Toggle[], id: string) {
    const item = list.find((x) => x.id === id);
    if (item) {
      item.enabled = !item.enabled;
      this.markDirty();
    }
  }
  markDirty() {
    this.dirty.set(true);
  }
  openResult(key: Section) {
    this.active.set(key);
    this.clearSearch();
  }
  clearSearch() {
    this.search.set('');
  }
  save() {
    localStorage.setItem('cricpulse-density', this.density());
    localStorage.setItem(
      'cricpulse-settings',
      JSON.stringify({
        workspace: this.workspace,
        notifications: this.notifications,
        accessibility: this.accessibility,
      }),
    );
    this.snapshot = this.currentSnapshot();
    this.dirty.set(false);
  }
  discard() {
    const s = JSON.parse(this.snapshot);
    this.density.set(s.density);
    this.theme.setTheme(s.theme as ThemePreference);
    this.workspace.forEach((_: Toggle, i: number) => (this.workspace[i].enabled = s.workspace[i]));
    this.notifications.forEach(
      (_: Toggle, i: number) => (this.notifications[i].enabled = s.notifications[i]),
    );
    this.accessibility.forEach(
      (_: Toggle, i: number) => (this.accessibility[i].enabled = s.accessibility[i]),
    );
    this.dirty.set(false);
  }
  resetPrefs() {
    localStorage.removeItem('cricpulse-density');
    localStorage.removeItem('cricpulse-settings');
    localStorage.removeItem('cricpulse-theme');
    this.density.set('comfortable');
    this.theme.setTheme('system');
    this.markDirty();
  }
  exportPrefs() {
    const data = JSON.stringify(
      {
        theme: this.theme.preference(),
        density: this.density(),
        workspace: this.workspace,
        notifications: this.notifications,
        accessibility: this.accessibility,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cricpulse-preferences.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  private currentSnapshot() {
    return JSON.stringify({
      density: this.density(),
      workspace: this.workspace.map((x) => x.enabled),
      notifications: this.notifications.map((x) => x.enabled),
      accessibility: this.accessibility.map((x) => x.enabled),
      theme: this.theme.preference(),
    });
  }
}
