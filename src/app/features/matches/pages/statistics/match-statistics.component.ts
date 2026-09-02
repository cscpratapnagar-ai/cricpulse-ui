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
}
interface Bowler {
  playerId: string;
  playerName: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  economy: number;
}
interface InningsScorecard {
  inningsId: string;
  inningsNumber: number;
  teamName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  batting: Batter[];
  bowling: Bowler[];
}
interface PlayerStat {
  playerId: string;
  playerName: string;
  teamName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  wickets: number;
  runsConceded: number;
  economy: number;
}
@Component({
  selector: 'app-match-statistics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-statistics.component.html',
  styleUrl: './match-statistics.component.scss',
})
export class MatchStatisticsComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = `${API_BASE_URL}`;
  matchId = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  scorecards: InningsScorecard[] = [];
  allBatting: PlayerStat[] = [];
  allBowling: PlayerStat[] = [];
  constructor() {
    if (this.matchId) this.load();
    else this.loading = false;
  }
  load() {
    this.http.get<InningsScorecard[]>(`${this.api}/matches/${this.matchId}/scorecard`).subscribe({
      next: (data) => {
        this.scorecards = data || [];
        this.buildStats();
        this.loading = false;
      },
      error: () => {
        this.scorecards = [];
        this.loading = false;
      },
    });
  }
  private buildStats() {
    const batting = new Map<string, PlayerStat>();
    const bowling = new Map<string, PlayerStat>();
    for (const innings of this.scorecards) {
      for (const b of innings.batting || []) {
        const p = batting.get(b.playerId) || {
          playerId: b.playerId,
          playerName: b.playerName,
          teamName: innings.teamName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          wickets: 0,
          runsConceded: 0,
          economy: 0,
        };
        p.runs += b.runs || 0;
        p.balls += b.balls || 0;
        p.fours += b.fours || 0;
        p.sixes += b.sixes || 0;
        p.strikeRate = p.balls ? (p.runs / p.balls) * 100 : 0;
        batting.set(b.playerId, p);
      }
      for (const b of innings.bowling || []) {
        const p = bowling.get(b.playerId) || {
          playerId: b.playerId,
          playerName: b.playerName,
          teamName: innings.teamName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          wickets: 0,
          runsConceded: 0,
          economy: 0,
        };
        p.balls += b.legalBalls || 0;
        p.wickets += b.wickets || 0;
        p.runsConceded += b.runs || 0;
        p.economy = p.balls ? p.runsConceded / (p.balls / 6) : 0;
        bowling.set(b.playerId, p);
      }
    }
    this.allBatting = [...batting.values()].sort(
      (a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate,
    );
    this.allBowling = [...bowling.values()].sort(
      (a, b) => b.wickets - a.wickets || a.economy - b.economy,
    );
  }
  get battingLeaders() {
    return this.allBatting;
  }
  get bowlingLeaders() {
    return this.allBowling;
  }
  get topRunScorer() {
    return this.allBatting[0];
  }
  get topWicketTaker() {
    return [...this.allBowling].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)[0];
  }
  get topSixHitter() {
    return [...this.allBatting].sort((a, b) => b.sixes - a.sixes || b.runs - a.runs)[0];
  }
  get mostFours() {
    return [...this.allBatting].sort((a, b) => b.fours - a.fours || b.runs - a.runs)[0];
  }
  get bestEconomy() {
    return [...this.allBowling]
      .filter((x) => x.balls > 0)
      .sort((a, b) => a.economy - b.economy || b.wickets - a.wickets)[0];
  }
  get totalFours() {
    return this.allBatting.reduce((s, p) => s + p.fours, 0);
  }
  get totalSixes() {
    return this.allBatting.reduce((s, p) => s + p.sixes, 0);
  }
  get playerOfMatch() {
    const players = new Map<string, PlayerStat>();
    for (const p of this.allBatting) {
      players.set(p.playerId, { ...p });
    }
    for (const p of this.allBowling) {
      const x = players.get(p.playerId) || { ...p };
      x.wickets = (x.wickets || 0) + p.wickets;
      x.runsConceded = (x.runsConceded || 0) + p.runsConceded;
      x.economy = p.economy;
      players.set(p.playerId, x);
    }
    return [...players.values()].sort(
      (a, b) => this.performanceScore(b) - this.performanceScore(a),
    )[0];
  }
  private performanceScore(p: PlayerStat) {
    return (
      (p.runs || 0) +
      (p.wickets || 0) * 25 +
      (p.fours || 0) +
      (p.sixes || 0) * 2 -
      (p.runsConceded || 0) * 0.05
    );
  }
  format(v: number | undefined | null) {
    return v == null ? '0.00' : v.toFixed(2);
  }
  overs(b: number) {
    return `${Math.floor((b || 0) / 6)}.${(b || 0) % 6}`;
  }
}
