import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { Component, inject } from '@angular/core';
import { StateViewComponent } from '../../../../shared/components/state-view/state-view.component';
import { RouterLink } from '@angular/router';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  scheduledAt?: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}

type Filter = 'ALL' | 'SCHEDULED' | 'LIVE' | 'COMPLETED';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterLink, StateViewComponent],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss',
})
export class MatchesComponent {
  private readonly http = inject(HttpClient);

  matches: Match[] = [];
  activeFilter: Filter = 'ALL';
  query = '';
  loading = true;
  error = false;

  readonly filterOptions: { label: string; value: Filter }[] = [
    { label: 'All matches', value: 'ALL' },
    { label: 'Upcoming', value: 'SCHEDULED' },
    { label: 'Live now', value: 'LIVE' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  constructor() {
    this.load();
  }

  get liveCount(): number {
    return this.matches.filter((m) => this.normalizeStatus(m.status) === 'LIVE').length;
  }
  get scheduledCount(): number {
    return this.matches.filter((m) => this.normalizeStatus(m.status) === 'SCHEDULED').length;
  }
  get completedCount(): number {
    return this.matches.filter((m) => this.normalizeStatus(m.status) === 'COMPLETED').length;
  }

  get filteredMatches(): Match[] {
    const q = this.query.trim().toLowerCase();
    return this.matches.filter((match) => {
      const matchesFilter =
        this.activeFilter === 'ALL' || this.normalizeStatus(match.status) === this.activeFilter;
      const haystack = [match.name, match.teamAName, match.teamBName, match.format, match.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.http.get<Match[]>(`${API_BASE_URL}/matches`).subscribe({
      next: (matches) => {
        this.matches = matches ?? [];
        this.loading = false;
      },
      error: () => {
        this.matches = [];
        this.loading = false;
        this.error = true;
      },
    });
  }

  setFilter(filter: Filter): void {
    this.activeFilter = filter;
  }
  onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }

  countFor(filter: Filter): number {
    if (filter === 'ALL') return this.matches.length;
    return this.matches.filter((m) => this.normalizeStatus(m.status) === filter).length;
  }

  normalizeStatus(status?: string): string {
    const value = (status || 'SCHEDULED').trim().toUpperCase();
    if (['UPCOMING', 'CREATED', 'READY'].includes(value)) return 'SCHEDULED';
    if (['FINISHED', 'RESULT'].includes(value)) return 'COMPLETED';
    return value;
  }

  statusLabel(status?: string): string {
    const value = this.normalizeStatus(status);
    return value === 'SCHEDULED' ? 'UPCOMING' : value;
  }

  initials(name: string): string {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'TM'
    );
  }

  timeHint(match: Match): string {
    if (!match.scheduledAt) return 'Time pending';
    const date = new Date(match.scheduledAt);
    if (Number.isNaN(date.getTime())) return 'Schedule set';
    if (this.normalizeStatus(match.status) === 'LIVE') return 'In progress';
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  displayDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
