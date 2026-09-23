import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { clearSession } from '../../core/auth/auth';
import { ThemeService } from '../../core/services/theme.service';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);
  readonly dashboard = inject(DashboardService);
  readonly commandOpen = signal(false);
  readonly commandResults = signal<{ label: string; group: string; route: string; icon: string }[]>(
    [],
  );
  commandQuery = '';
  readonly commandItems = [
    { label: 'Dashboard', group: 'Workspace', route: '/dashboard', icon: '⌂' },
    { label: 'Matches', group: 'Match management', route: '/matches', icon: '◉' },
    { label: 'Live Center', group: 'Live scoring', route: '/live', icon: '●' },
    { label: 'Teams', group: 'Management', route: '/teams', icon: '◇' },
    { label: 'Players', group: 'Management', route: '/players', icon: '♙' },
    { label: 'Tournaments', group: 'Management', route: '/tournaments', icon: '♜' },
    { label: 'Analytics', group: 'Intelligence', route: '/analytics', icon: '✦' },
    { label: 'Leaderboards', group: 'Intelligence', route: '/leaderboards', icon: '↗' },
    { label: 'Notifications', group: 'Activity center', route: '/notifications', icon: '♢' },
    { label: 'Settings', group: 'Workspace', route: '/settings', icon: '⚙' },
  ];
  sidebarOpen = false;
  workspaceOpen = false;

  constructor() {
    this.dashboard.loadWorkspace();
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.closeSidebar();
    });
  }

  get user() {
    return this.dashboard.user();
  }

  get team() {
    return this.dashboard.team();
  }

  get initials() {
    return (this.user?.fullName || this.user?.displayName || this.user?.name || 'P')
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  get teamInitial() {
    return (this.team?.name || 'P').charAt(0).toUpperCase();
  }

  get hasWorkspaceAccess() {
    return !!this.team;
  }

  openCommand() {
    this.commandQuery = '';
    this.commandResults.set(
      this.hasWorkspaceAccess
        ? this.commandItems
        : this.commandItems.filter((item) => ['Dashboard', 'Teams', 'Settings'].includes(item.label)),
    );
    this.commandOpen.set(true);
  }

  closeCommand() {
    this.commandOpen.set(false);
  }

  updateCommand() {
    const q = this.commandQuery.trim().toLowerCase();
    this.commandResults.set(
      !q
        ? this.commandItems
        : this.commandItems.filter(
            (x) =>
              (this.hasWorkspaceAccess || ['Dashboard', 'Teams', 'Settings'].includes(x.label)) &&
              (x.label + ' ' + x.group).toLowerCase().includes(q),
          ),
    );
  }

  @HostListener('window:keydown', ['$event']) handleShortcut(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.openCommand();
    }
    if (e.key === 'Escape') this.closeCommand();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
    this.workspaceOpen = false;
  }

  logout() {
    clearSession();
    void this.router.navigateByUrl('/login');
  }
}
