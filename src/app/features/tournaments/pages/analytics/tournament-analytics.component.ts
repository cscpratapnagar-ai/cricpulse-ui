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
    ])
      .then(([teams, fixtures, points]) => {
        this.teams = teams || [];
        this.fixtures = fixtures || [];
        this.points = points || [];
        this.loading = false;
      })
      .catch(() => (this.loading = false));
  }

  get completed() {
    return this.fixtures.filter((f) => f.status === 'COMPLETED').length;
  }
  get scheduled() {
    return this.fixtures.filter((f) => f.status === 'SCHEDULED').length;
  }
  get pending() {
    return this.fixtures.filter((f) => f.status !== 'COMPLETED' && f.status !== 'SCHEDULED').length;
  }
  get completion() {
    return this.fixtures.length ? Math.round((this.completed / this.fixtures.length) * 100) : 0;
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
