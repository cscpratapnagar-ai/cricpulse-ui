import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CpDropdownComponent, CpDropdownOption } from '../../../../shared/cp-dropdown.component';
import { StateViewComponent } from '../../../../shared/components/state-view/state-view.component';

interface Tournament {
  id: string;
  name: string;
  format: string;
  overs: number;
  location: string | null;
  startDate: string | null;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CpDropdownComponent, StateViewComponent],
  templateUrl: './tournaments.component.html',
  styleUrl: './tournaments.component.scss',
})
export class TournamentsComponent {
  private readonly http = inject(HttpClient);
  readonly api = 'http://localhost:8080/api';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  tournaments: Tournament[] = [];
  loading = true;
  loadError = false;
  query = '';
  statusFilter = 'ALL';
  sortKey = 'newest';
  activeMenu = '';
  readonly skeletonItems = [1, 2, 3, 4, 5, 6];
  statusOptions: CpDropdownOption[] = [
    { value: 'ALL', label: 'All statuses' },
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
  ];
  sortOptions: CpDropdownOption[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'name', label: 'Name A–Z' },
    { value: 'status', label: 'Status' },
  ];
  constructor() {
    this.load();
  }
  get filteredTournaments(): Tournament[] {
    const q = this.query.trim().toLowerCase();
    return this.tournaments.filter(
      (t) =>
        (!q ||
          [t.name, t.format, t.location || '', t.status].join(' ').toLowerCase().includes(q)) &&
        (this.statusFilter === 'ALL' || this.statusKey(t.status) === this.statusFilter),
    );
  }
  get visibleTournaments(): Tournament[] {
    const items = [...this.filteredTournaments];
    if (this.sortKey === 'name') return items.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sortKey === 'status')
      return items.sort((a, b) => this.statusKey(a.status).localeCompare(this.statusKey(b.status)));
    if (this.sortKey === 'oldest')
      return items.sort((a, b) =>
        String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
      );
    return items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  get activeCount() {
    return this.tournaments.filter((t) => this.statusKey(t.status) === 'ACTIVE').length;
  }
  get upcomingCount() {
    return this.tournaments.filter((t) => this.statusKey(t.status) === 'UPCOMING').length;
  }
  get completedCount() {
    return this.tournaments.filter((t) => this.statusKey(t.status) === 'COMPLETED').length;
  }
  get formatCount() {
    return new Set(this.tournaments.map((t) => t.format).filter(Boolean)).size;
  }
  get workspaceHealth() {
    if (!this.tournaments.length) return 0;
    const score =
      this.tournaments.reduce((sum, t) => sum + this.progressFor(t), 0) / this.tournaments.length;
    return Math.max(72, Math.min(98, Math.round(score + 18)));
  }
  get healthMessage() {
    if (this.workspaceHealth >= 92) return 'Competition workspace is operating at peak readiness';
    if (this.workspaceHealth >= 82) return 'Competition workspace is healthy and progressing';
    return 'Competition workspace is ready for the next action';
  }
  focusSearch() {
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }
  clearSearch() {
    this.query = '';
    this.focusSearch();
  }
  clearFilters() {
    this.query = '';
    this.statusFilter = 'ALL';
    this.sortKey = 'newest';
    this.activeMenu = '';
  }
  toggleMenu(id: string) {
    this.activeMenu = this.activeMenu === id ? '' : id;
  }
  closeMenu() {
    this.activeMenu = '';
  }
  isActive(status: string) {
    return this.statusKey(status) === 'ACTIVE';
  }
  isCompleted(status: string) {
    return this.statusKey(status) === 'COMPLETED';
  }
  statusLabel(status: string) {
    const key = this.statusKey(status);
    return key.charAt(0) + key.slice(1).toLowerCase();
  }
  formatIcon(format: string) {
    const key = (format || '').toUpperCase();
    if (key === 'TEST') return '♜';
    if (key === 'ODI') return '◉';
    if (key === 'T10') return '⚡';
    return '🏆';
  }
  progressFor(t: Tournament) {
    const key = this.statusKey(t.status);
    if (key === 'COMPLETED') return 100;
    if (key === 'ACTIVE') return 62;
    return 18;
  }
  progressLabel(t: Tournament) {
    const key = this.statusKey(t.status);
    if (key === 'COMPLETED') return 'Competition completed';
    if (key === 'ACTIVE') return 'Fixtures in progress';
    return 'Setup and registration phase';
  }
  private statusKey(status: string) {
    const value = (status || 'UPCOMING').trim().toUpperCase();
    if (['LIVE', 'IN_PROGRESS', 'ONGOING', 'ACTIVE'].includes(value)) return 'ACTIVE';
    if (['FINISHED', 'COMPLETE', 'COMPLETED'].includes(value)) return 'COMPLETED';
    return 'UPCOMING';
  }
  @HostListener('document:keydown', ['$event'])
  onKeyboardShortcut(event: KeyboardEvent) {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target as HTMLElement | null;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return;
      event.preventDefault();
      this.focusSearch();
    }
    if (event.key === 'Escape') this.closeMenu();
  }
  load() {
    this.loading = true;
    this.loadError = false;
    this.activeMenu = '';
    this.http.get<Tournament[]>(`${this.api}/tournaments/mine`).subscribe({
      next: (x) => {
        this.tournaments = x || [];
        this.loading = false;
      },
      error: () => {
        this.tournaments = [];
        this.loadError = true;
        this.loading = false;
      },
    });
  }
}
