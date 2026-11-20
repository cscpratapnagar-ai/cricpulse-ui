import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface PublicStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  noResults: number;
  points: number;
  nrr: number;
  recentForm: string[];
}

interface PublicFixture {
  matchId: string;
  fixtureNumber: number | null;
  stage: string;
  status: string;
  teamAName: string;
  teamBName: string;
  winnerName: string | null;
  scheduledAt: string | null;
}

interface PublicTournament {
  tournamentId: string;
  tournamentName: string;
  format: string;
  overs: number;
  status: string;
  totalFixtures: number;
  completedFixtures: number;
  scheduledFixtures: number;
  liveFixtures: number;
  completionPercentage: number;
  pointsTable: PublicStanding[];
  fixtures: PublicFixture[];
}

@Component({
  selector: 'app-public-tournament',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-tournament.component.html',
  styleUrl: './public-tournament.component.scss',
})
export class PublicTournamentComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  tournamentId = '';
  tournament: PublicTournament | null = null;
  loading = true;
  loadError = false;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')?.trim() ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          this.tournamentId = id;
          return this.refreshRequests.pipe(
            startWith(undefined),
            switchMap(() => {
              this.loading = true;
              this.loadError = false;
              this.tournament = null;

              if (!id) {
                this.loading = false;
                this.loadError = true;
                return of(null);
              }

              return this.http
                .get<PublicTournament>(
                  `${API_BASE_URL}/public/tournaments/${encodeURIComponent(id)}`,
                )
                .pipe(catchError(() => of(null)));
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tournament) => {
        this.tournament = tournament;
        this.loading = false;
        this.loadError = tournament === null;
      });
  }

  refresh(): void {
    this.refreshRequests.next();
  }

  get leagueFixtures(): PublicFixture[] {
    return (this.tournament?.fixtures ?? []).filter(
      (fixture) => (fixture.stage || 'LEAGUE').toUpperCase() === 'LEAGUE',
    );
  }

  get playoffFixtures(): PublicFixture[] {
    return (this.tournament?.fixtures ?? []).filter(
      (fixture) => (fixture.stage || 'LEAGUE').toUpperCase() !== 'LEAGUE',
    );
  }

  stageLabel(stage: string): string {
    return stage
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  scheduledLabel(value: string | null): string {
    if (!value) return 'Schedule to be announced';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Schedule to be confirmed'
      : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
