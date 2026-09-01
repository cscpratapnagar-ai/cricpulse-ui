import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Batter {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  out: boolean;
  dismissal?: string | null;
}
interface Bowler {
  playerId: string;
  playerName: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  economy: number;
}
interface FallOfWicket {
  wicketNumber: number;
  playerName: string;
  runs: number;
  overNumber: number;
  ballNumber: number;
}
interface InningsScorecard {
  inningsId: string;
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  teamName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  batting: Batter[];
  bowling: Bowler[];
  fallOfWickets: FallOfWicket[];
}

@Component({
  selector: 'app-match-scorecard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-scorecard.component.html',
  styleUrl: './match-scorecard.component.scss',
})
export class MatchScorecardComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = 'http://localhost:8080/api';
  matchId = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  scorecards: InningsScorecard[] = [];
  selectedInnings = 1;
  constructor() {
    if (this.matchId) this.load();
    else this.loading = false;
  }
  load() {
    this.http.get<InningsScorecard[]>(`${this.api}/matches/${this.matchId}/scorecard`).subscribe({
      next: (data) => {
        this.scorecards = data || [];
        this.selectedInnings = this.scorecards[0]?.inningsNumber || 1;
        this.loading = false;
      },
      error: () => {
        this.scorecards = [];
        this.loading = false;
      },
    });
  }
  get currentInnings() {
    return this.scorecards.find((x) => x.inningsNumber === this.selectedInnings) || null;
  }
  teamInitial(name: string) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }
  playerInitial(name: string) {
    return (name || '?')
      .trim()
      .split(/\\s+/)
      .slice(0, 2)
      .map((x) => x.charAt(0))
      .join('')
      .toUpperCase();
  }
  runRate(runs: number, balls: number) {
    return balls ? ((runs * 6) / balls).toFixed(2) : '0.00';
  }
  get opponentName() {
    return (
      this.scorecards.find((x) => x.inningsNumber !== this.scorecards[0]?.inningsNumber)
        ?.teamName || 'Opponent'
    );
  }
  overs(balls: number) {
    return `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
  }
  formatRate(value: number | null | undefined) {
    return value == null ? '0.00' : Number(value).toFixed(2);
  }
}
