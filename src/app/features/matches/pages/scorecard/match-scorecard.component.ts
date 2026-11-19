import { API_BASE_URL } from '../../../../core/config/api.config';
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
  fielderId?: string | null;
  fielderName?: string | null;
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
interface FielderContribution {
  inningsNumber: number;
  bowlingTeam: string;
  fielderId: string;
  fielderName: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  totalDismissalContributions: number;
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
  readonly api = `${API_BASE_URL}`;
  matchId = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  scorecards: InningsScorecard[] = [];
  fieldingAnalysis: FielderContribution[] = [];
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
        this.loadFieldingAnalysis();
        this.loading = false;
      },
      error: () => {
        this.scorecards = [];
        this.loading = false;
      },
    });
  }
  private loadFieldingAnalysis() {
    this.http
      .get<FielderContribution[]>(`${this.api}/matches/${this.matchId}/fielding-analysis`)
      .subscribe({
        next: (data) => (this.fieldingAnalysis = data || []),
        error: () => (this.fieldingAnalysis = []),
      });
  }
  get currentInningsFielders() {
    return this.fieldingAnalysis.filter((fielder) => fielder.inningsNumber === this.selectedInnings);
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
