import { API_BASE_URL } from '../../../../core/config/api.config';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Tournament {
  id: string;
  name: string;
  format: string;
  overs: number;
  startDate: string | null;
  location: string | null;
  status: string;
}
interface Team {
  id: string;
  name: string;
  city: string | null;
  seed: number | null;
}
interface Fixture {
  matchId: string;
  fixtureNumber: number | null;
  stage: string;
  matchName: string;
  teamAName: string;
  teamBName: string;
  status: string;
  scheduledAt: string | null;
}
interface Point {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  nrr: number;
}
interface TournamentPlayerPerformance {
  playerId: string;
  playerName: string;
  matches: number;
  battingInnings: number;
  runs: number;
  highestScore: number;
  dismissals: number;
  battingBalls: number;
  battingAverage: number;
  strikeRate: number;
  bowlingInnings: number;
  bowlingBalls: number;
  runsConceded: number;
  wickets: number;
  bowlingAverage: number;
  economy: number;
  bowlingStrikeRate: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  totalFieldingContributions: number;
}
interface TournamentComparisonMetric { label: string; left: number; right: number; lower?: boolean; }
interface TournamentAnalytics {
  totalFixtures: number;
  completedFixtures: number;
  scheduledFixtures: number;
  liveFixtures: number;
  completionPercentage: number;
  teams: Point[];
  topRunScorers: { playerId: string; playerName: string; runs: number; wickets: number }[];
  topWicketTakers: { playerId: string; playerName: string; runs: number; wickets: number }[];
  topFielders: {
    playerId: string;
    playerName: string;
    catches: number;
    runOuts: number;
    stumpings: number;
    totalContributions: number;
  }[];
  playerPerformances: TournamentPlayerPerformance[];
}

@Component({
  selector: 'app-tournament-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-analytics.component.html',
  styleUrl: './tournament-analytics.component.css',
})
export class TournamentAnalyticsComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = `${API_BASE_URL}`;
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  t: Tournament | null = null;
  teams: Team[] = [];
  fixtures: Fixture[] = [];
  points: Point[] = [];
  analytics: TournamentAnalytics | null = null;
  compareLeftId = '';
  compareRightId = '';

  get comparisonPlayers() {
    return this.playerPerformances;
  }

  get tournamentComparison() {
    const players = this.playerPerformances;
    const left = players.find((player) => player.playerId === this.compareLeftId);
    const right = players.find((player) => player.playerId === this.compareRightId);
    return left && right && left.playerId !== right.playerId ? { left, right } : null;
  }

  setCompareLeft(id: string) {
    this.compareLeftId = id;
    if (id === this.compareRightId) this.compareRightId = '';
  }

  setCompareRight(id: string) {
    this.compareRightId = id;
    if (id === this.compareLeftId) this.compareLeftId = '';
  }

  get comparisonMetrics(): TournamentComparisonMetric[] {
    const comparison = this.tournamentComparison;
    if (!comparison) return [];
    const { left, right } = comparison;
    return [
      { label: 'Matches', left: left.matches, right: right.matches },
      { label: 'Runs', left: left.runs, right: right.runs },
      { label: 'Batting average', left: left.battingAverage, right: right.battingAverage },
      { label: 'Strike rate', left: left.strikeRate, right: right.strikeRate },
      { label: 'Highest score', left: left.highestScore, right: right.highestScore },
      { label: 'Wickets', left: left.wickets, right: right.wickets },
      { label: 'Bowling average', left: left.bowlingAverage, right: right.bowlingAverage },
      { label: 'Economy', left: left.economy, right: right.economy, lower: true },
      { label: 'Bowling strike rate', left: left.bowlingStrikeRate, right: right.bowlingStrikeRate },
      { label: 'Catches', left: left.catches, right: right.catches },
      { label: 'Run-outs', left: left.runOuts, right: right.runOuts },
      { label: 'Stumpings', left: left.stumpings, right: right.stumpings },
    ];
  }


  constructor() {
    if (this.id) this.load();
    else this.loading = false;
  }

  load() {
    this.http.get<Tournament>(`${this.api}/tournaments/${this.id}`).subscribe({
      next: (t) => {
        this.t = t;
        this.loadData();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadData() {
    Promise.all([
      this.http.get<Team[]>(`${this.api}/tournaments/${this.id}/teams`).toPromise(),
      this.http.get<Fixture[]>(`${this.api}/tournaments/${this.id}/fixtures`).toPromise(),
      this.http.get<Point[]>(`${this.api}/tournaments/${this.id}/points-table`).toPromise(),
      this.http
        .get<TournamentAnalytics>(`${this.api}/tournaments/${this.id}/analytics`)
        .toPromise(),
    ])
      .then(([teams, fixtures, points, analytics]) => {
        this.teams = teams || [];
        this.fixtures = fixtures || [];
        this.analytics = analytics || null;
        const availablePlayers = analytics?.playerPerformances || [];
        this.compareLeftId = availablePlayers[0]?.playerId || '';
        this.compareRightId = availablePlayers[1]?.playerId || '';
        this.points = analytics?.teams?.length ? analytics.teams : points || [];
        this.loading = false;
      })
      .catch(() => (this.loading = false));
  }

  get completed() {
    return (
      this.analytics?.completedFixtures ??
      this.fixtures.filter((f) => f.status === 'COMPLETED').length
    );
  }
  get scheduled() {
    return (
      this.analytics?.scheduledFixtures ??
      this.fixtures.filter((f) => f.status === 'SCHEDULED').length
    );
  }
  get pending() {
    if (this.analytics)
      return Math.max(
        0,
        this.analytics.totalFixtures -
          this.analytics.completedFixtures -
          this.analytics.scheduledFixtures -
          this.analytics.liveFixtures,
      );
    return this.fixtures.filter((f) => f.status !== 'COMPLETED' && f.status !== 'SCHEDULED').length;
  }
  get completion() {
    return (
      this.analytics?.completionPercentage ??
      (this.fixtures.length ? Math.round((this.completed / this.fixtures.length) * 100) : 0)
    );
  }
  get playerPerformances() {
    return this.analytics?.playerPerformances ?? [];
  }

  get leader() {
    return this.points[0];
  }
  get topTeams() {
    return this.points.slice(0, 5);
  }
  get topRuns() {
    return [...this.points].sort((a, b) => b.runsFor - a.runsFor).slice(0, 6);
  }
  get nextFixtureText() {
    const f = this.fixtures
      .filter((x) => x.status !== 'COMPLETED' && x.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
    return f
      ? `Next scheduled: ${f.teamAName} vs ${f.teamBName} · ${new Date(f.scheduledAt!).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
      : 'No upcoming scheduled fixture.';
  }

  barWidth(v: number) {
    const max = Math.max(1, ...this.points.map((p) => Math.max(p.runsFor, p.runsAgainst)));
    return Math.round((v / max) * 100);
  }
}
