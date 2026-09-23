import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

interface MatchIntelligence {
  inningsNumber: number;
  battingTeam: string;
  status: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  totalOvers: number;
  inningsRunRate: number;
  recentRuns: number;
  recentDeliveries: number;
  recentDots: number;
  recentFours: number;
  recentSixes: number;
  recentWickets: number;
  recentRunRate: number;
  momentum: string;
  momentumScore: number;
  projectedScore: number | null;
  pressureIndex: number;
  collapseRisk: number;
  requiredRuns: number | null;
  ballsRemaining: number | null;
  requiredRate: number | null;
  chasePressure: string;
}

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss',
})
export class MatchDetailComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = API_BASE_URL;
  loading = true;
  error = '';
  intelligenceLoading = false;
  intelligence: MatchIntelligence | null = null;
  match: Match | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.http.get<Match>(`${this.api}/matches/${id}`).subscribe({
      next: (match) => {
        this.match = match;
        this.loading = false;
        this.loadIntelligence(id);
      },
      error: () => {
        this.match = null;
        this.error = 'Match details could not be loaded. Please try again.';
        this.loading = false;
      },
    });
  }

  private loadIntelligence(matchId: string): void {
    this.intelligenceLoading = true;
    this.http.get<MatchIntelligence>(`${this.api}/matches/${matchId}/intelligence`).subscribe({
      next: (value) => {
        this.intelligence = value;
        this.intelligenceLoading = false;
      },
      error: () => {
        this.intelligence = null;
        this.intelligenceLoading = false;
      },
    });
  }

  intelligenceTone(value: number): string {
    if (value >= 75) return 'high';
    if (value >= 45) return 'mid';
    return 'low';
  }

  momentumTone(value: string): string {
    return value.toLowerCase();
  }

  displayMatchTitle(value?: string): string {
    const title = value?.trim();
    return title || 'Match overview';
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
