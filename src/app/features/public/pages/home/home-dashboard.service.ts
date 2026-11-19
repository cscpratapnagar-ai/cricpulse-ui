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
  private readonly refreshingState = signal(false);
  private readonly hasLoadedState = signal(false);
  private readonly matchesErrorState = signal(false);
  private readonly teamsErrorState = signal(false);
  private readonly playerCountErrorState = signal(false);

  readonly matches = this.matchesState.asReadonly();
  readonly teams = this.teamsState.asReadonly();
  readonly playerCount = this.playerCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly refreshing = this.refreshingState.asReadonly();
  readonly matchesError = this.matchesErrorState.asReadonly();
  readonly teamsError = this.teamsErrorState.asReadonly();
  readonly playerCountError = this.playerCountErrorState.asReadonly();
  readonly error = computed(
    () => this.matchesErrorState() || this.teamsErrorState() || this.playerCountErrorState(),
  );

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
    if (this.refreshingState()) return;

    const isInitialLoad = !this.hasLoadedState();
    this.loadingState.set(isInitialLoad);
    this.refreshingState.set(!isInitialLoad);
    this.matchesErrorState.set(false);
    this.teamsErrorState.set(false);
    this.playerCountErrorState.set(false);

    forkJoin({
      matches: this.http
        .get<DashboardMatch[]>(`${API_BASE_URL}/matches`)
        .pipe(catchError(() => of(null))),
      teams: this.http
        .get<DashboardTeam[]>(`${API_BASE_URL}/teams/mine`)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ matches, teams }) => {
        if (matches === null) {
          this.matchesErrorState.set(true);
        } else {
          this.matchesState.set(matches ?? []);
        }

        if (teams === null) {
          this.teamsErrorState.set(true);
        } else {
          this.teamsState.set(teams ?? []);
          this.loadPlayerCount(teams ?? []);
        }

        this.hasLoadedState.set(true);
        this.loadingState.set(false);
        this.refreshingState.set(false);
      },
      error: () => {
        this.matchesErrorState.set(true);
        this.teamsErrorState.set(true);
        this.loadingState.set(false);
        this.refreshingState.set(false);
        this.hasLoadedState.set(true);
      },
    });
  }

  private loadPlayerCount(teams: DashboardTeam[]): void {
    if (!teams.length) {
      this.playerCountState.set(0);
      this.playerCountErrorState.set(false);
      return;
    }

    forkJoin(
      teams.map((team) =>
        this.http
          .get<TeamMember[]>(`${API_BASE_URL}/teams/${team.id}/players`)
          .pipe(catchError(() => of(null))),
      ),
    ).subscribe((membersByTeam) => {
      if (membersByTeam.some((members) => members === null)) {
        this.playerCountErrorState.set(true);
        return;
      }

      const playerIds = new Set(
        membersByTeam.flatMap((members) => (members ?? []).map((member) => member.playerId)),
      );
      this.playerCountState.set(playerIds.size);
      this.playerCountErrorState.set(false);
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
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  formatDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private dateValue(value?: string): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const valueTime = new Date(value).getTime();
    return Number.isNaN(valueTime) ? Number.MAX_SAFE_INTEGER : valueTime;
  }
}
