import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  readonly tournamentId = this.route.snapshot.paramMap.get('id') || '';
  tournament: PublicTournament | null = null;
  loading = true;
  loadError = false;

  constructor() {
    if (!this.tournamentId) {
      this.loading = false;
      this.loadError = true;
      return;
    }
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.loadError = false;
    this.http.get<PublicTournament>(`${API_BASE_URL}/public/tournaments/${this.tournamentId}`).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
        this.loading = false;
      },
      error: () => {
        this.tournament = null;
        this.loading = false;
        this.loadError = true;
      },
    });
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
    return stage.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  scheduledLabel(value: string | null): string {
    if (!value) return 'Schedule to be announced';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Schedule to be confirmed'
      : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
