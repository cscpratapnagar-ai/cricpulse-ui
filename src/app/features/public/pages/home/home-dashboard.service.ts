import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';

export interface DashboardMatch {
  id: string;
  name: string;
  format: string;
  status: string;
  scheduledAt?: string;
  teamAName?: string;
  teamBName?: string;
}

interface DashboardTeam {
  id: string;
  name: string;
  city?: string;
  ownerId?: string;
}

interface TeamMember {
  playerId: string;
}

@Injectable({ providedIn: 'root' })
export class HomeDashboardService {
  private readonly http = inject(HttpClient);

  private readonly matchesState = signal<DashboardMatch[]>([]);
  private readonly teamsState = signal<DashboardTeam[]>([]);
  private readonly playerCountState = signal(0);
  private readonly loadingState = signal(true);
  private readonly errorState = signal(false);

  readonly matches = this.matchesState.asReadonly();
  readonly teams = this.teamsState.asReadonly();
  readonly playerCount = this.playerCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly liveMatches = computed(() =>
    this.matchesState().filter((match) => this.normalizeStatus(match.status) === 'LIVE'),
  );

  readonly upcomingMatches = computed(() =>
    this.matchesState()
      .filter((match) => this.normalizeStatus(match.status) === 'SCHEDULED')
      .filter((match) => !!match.scheduledAt)
      .sort((a, b) => this.dateValue(a.scheduledAt) - this.dateValue(b.scheduledAt)),
  );

  readonly recentMatches = computed(() =>
    this.matchesState()
      .filter((match) => this.normalizeStatus(match.status) === 'COMPLETED')
      .sort((a, b) => this.dateValue(b.scheduledAt) - this.dateValue(a.scheduledAt))
      .slice(0, 3),
  );

  readonly nextMatch = computed(() => this.upcomingMatches()[0] ?? null);
  readonly activeMatch = computed(() => this.liveMatches()[0] ?? null);

  load(): void {
    this.loadingState.set(true);
    this.errorState.set(false);

    forkJoin({
      matches: this.http.get<DashboardMatch[]>(`${API_BASE_URL}/matches`).pipe(catchError(() => of([]))),
      teams: this.http.get<DashboardTeam[]>(`${API_BASE_URL}/teams/mine`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ matches, teams }) => {
        this.matchesState.set(matches ?? []);
        this.teamsState.set(teams ?? []);
        this.loadPlayerCount(teams ?? []);
        this.loadingState.set(false);
      },
      error: () => {
        this.matchesState.set([]);
        this.teamsState.set([]);
        this.playerCountState.set(0);
        this.loadingState.set(false);
        this.errorState.set(true);
      },
    });
  }

  private loadPlayerCount(teams: DashboardTeam[]): void {
    if (!teams.length) {
      this.playerCountState.set(0);
      return;
    }

    forkJoin(
      teams.map((team) =>
        this.http.get<TeamMember[]>(`${API_BASE_URL}/teams/${team.id}/players`).pipe(catchError(() => of([]))),
      ),
    ).subscribe((membersByTeam) => {
      const playerIds = new Set(membersByTeam.flat().map((member) => member.playerId));
      this.playerCountState.set(playerIds.size);
    });
  }

  normalizeStatus(status?: string): string {
    const value = (status || 'SCHEDULED').trim().toUpperCase();
    if (['UPCOMING', 'CREATED', 'READY'].includes(value)) return 'SCHEDULED';
    if (['IN_PROGRESS', 'ONGOING', 'PLAYING'].includes(value)) return 'LIVE';
    if (['FINISHED', 'RESULT'].includes(value)) return 'COMPLETED';
    return value;
  }

  formatTime(value?: string): string {
    if (!value) return 'Time pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Schedule set';
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  formatDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
  }

  private dateValue(value?: string): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const valueTime = new Date(value).getTime();
    return Number.isNaN(valueTime) ? Number.MAX_SAFE_INTEGER : valueTime;
  }
}
