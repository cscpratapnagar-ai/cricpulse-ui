import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface Point {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  noResults?: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  nrr: number;
}

interface Qualifier {
  seed: number;
  label: string;
  higherSeed: Point;
  lowerSeed: Point;
}

interface TournamentSummary {
  status: string;
  name?: string;
}

interface Preview {
  eligible: boolean;
  message: string;
  table: Point[];
  qualifiers: Qualifier[];
}

interface Fixture {
  matchId: string;
  fixtureNumber: number | null;
  stage: string;
  matchName: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  status: string;
  scheduledAt?: string | null;
}

interface MatchResult {
  winningTeamId?: string | null;
  resultText?: string | null;
}

interface PlayoffProgress {
  status: string;
  message: string;
  qualifier1?: Fixture | null;
  eliminator?: Fixture | null;
  qualifier2?: Fixture | null;
  finalFixture?: Fixture | null;
  championTeamId?: string | null;
}

type PlayoffStage = 'QUALIFIER_1' | 'ELIMINATOR' | 'QUALIFIER_2' | 'FINAL';

@Component({
  selector: 'app-tournament-qualification',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-qualification.component.html',
  styleUrl: './tournament-qualification.component.scss',
})
export class TournamentQualificationComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = API_BASE_URL;
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  progressBusy = false;
  preview: Preview | null = null;
  tournamentStatus = '';
  fixtures: Fixture[] = [];
  winnerByMatch: Record<string, string> = {};
  progress: PlayoffProgress | null = null;
  error = '';
  progressMessage = '';
  readonly stages: { key: PlayoffStage; number: string; hint: string }[] = [
    { key: 'QUALIFIER_1', number: '01', hint: '1st vs 2nd · Winner to Final' },
    { key: 'ELIMINATOR', number: '02', hint: '3rd vs 4th · Winner to Qualifier 2' },
    { key: 'QUALIFIER_2', number: '03', hint: 'Q1 loser vs Eliminator winner' },
    { key: 'FINAL', number: '04', hint: 'Q1 winner vs Q2 winner' },
  ];

  constructor() {
    if (this.id) this.load();
    else this.loading = false;
  }

  get leagueFixtures(): Fixture[] {
    return this.fixtures.filter((fixture) => this.normalizedStage(fixture.stage) === 'LEAGUE');
  }

  get leagueComplete(): boolean {
    return (
      this.leagueFixtures.length > 0 &&
      this.leagueFixtures.every((fixture) => fixture.status === 'COMPLETED')
    );
  }

  get canProgress(): boolean {
    return Boolean(
      this.preview?.eligible &&
        this.tournamentStatus === 'ACTIVE' &&
        this.leagueComplete &&
        !this.progressBusy,
    );
  }

  get championName(): string {
    const championId = this.progress?.championTeamId;
    const final = this.fixtureFor('FINAL');
    if (championId && final) {
      return final.teamAId === championId
        ? final.teamAName
        : final.teamBId === championId
          ? final.teamBName
          : '';
    }
    return this.winnerName('FINAL');
  }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      tournament: this.http.get<TournamentSummary>(`${this.api}/tournaments/${this.id}`),
      preview: this.http.get<Preview>(`${this.api}/tournaments/${this.id}/qualification`),
      fixtures: this.http.get<Fixture[]>(`${this.api}/tournaments/${this.id}/fixtures`),
    }).subscribe({
      next: ({ tournament, preview, fixtures }) => {
        this.tournamentStatus = tournament.status?.toUpperCase() ?? '';
        this.preview = preview;
        this.fixtures = Array.isArray(fixtures) ? fixtures : [];
        this.winnerByMatch = {};
        this.loading = false;
        this.loadCompletedMatchResults();
      },
      error: (e) => {
        this.error = e?.error?.message || 'Unable to load tournament playoff data.';
        this.loading = false;
      },
    });
  }

  syncPlayoffs(): void {
    if (!this.canProgress) return;
    this.progressBusy = true;
    this.error = '';
    this.progressMessage = '';
    this.http
      .post<PlayoffProgress>(`${this.api}/tournaments/${this.id}/playoffs/progress`, null)
      .subscribe({
        next: (response) => {
          this.progress = response;
          this.progressMessage = response.message || 'Playoff progression updated.';
          this.progressBusy = false;
          this.load();
        },
        error: (e) => {
          this.error =
            e?.error?.message ||
            'Unable to progress playoff stages. Check tournament access and match results.';
          this.progressBusy = false;
        },
      });
  }

  fixtureFor(stage: PlayoffStage): Fixture | undefined {
    return this.fixtures.find((fixture) => this.normalizedStage(fixture.stage) === stage);
  }

  stageTitle(stage: PlayoffStage): string {
    return {
      QUALIFIER_1: 'Qualifier 1',
      ELIMINATOR: 'Eliminator',
      QUALIFIER_2: 'Qualifier 2',
      FINAL: 'Final',
    }[stage];
  }

  projectedTeams(stage: PlayoffStage): [string, string] {
    const seeds = this.preview?.table ?? [];
    if (stage === 'QUALIFIER_1')
      return [seeds[0]?.teamName ?? '1st place', seeds[1]?.teamName ?? '2nd place'];
    if (stage === 'ELIMINATOR')
      return [seeds[2]?.teamName ?? '3rd place', seeds[3]?.teamName ?? '4th place'];
    if (stage === 'QUALIFIER_2') return ['Qualifier 1 loser', 'Eliminator winner'];
    return ['Qualifier 1 winner', 'Qualifier 2 winner'];
  }

  teamNames(stage: PlayoffStage): [string, string] {
    const fixture = this.fixtureFor(stage);
    return fixture ? [fixture.teamAName, fixture.teamBName] : this.projectedTeams(stage);
  }

  winnerName(stage: PlayoffStage): string {
    const fixture = this.fixtureFor(stage);
    if (!fixture) return '';
    const winnerId = this.winnerByMatch[fixture.matchId];
    if (!winnerId) return '';
    if (fixture.teamAId === winnerId) return fixture.teamAName;
    if (fixture.teamBId === winnerId) return fixture.teamBName;
    return '';
  }

  fixtureStatus(stage: PlayoffStage): string {
    return this.fixtureFor(stage)?.status ?? 'AWAITING QUALIFICATION';
  }

  fixtureRoute(stage: PlayoffStage): unknown[] | null {
    const fixture = this.fixtureFor(stage);
    return fixture ? ['/matches', fixture.matchId] : null;
  }

  private loadCompletedMatchResults(): void {
    for (const fixture of this.fixtures.filter(
      (item) =>
        ['QUALIFIER_1', 'ELIMINATOR', 'QUALIFIER_2', 'FINAL'].includes(
          this.normalizedStage(item.stage),
        ) && item.status === 'COMPLETED',
    )) {
      this.http.get<MatchResult>(`${this.api}/matches/${fixture.matchId}/result`).subscribe({
        next: (result) => {
          if (result?.winningTeamId) {
            this.winnerByMatch = { ...this.winnerByMatch, [fixture.matchId]: result.winningTeamId };
          }
        },
      });
    }
  }

  private normalizedStage(stage: string): string {
    return stage.trim().toUpperCase();
  }
}
