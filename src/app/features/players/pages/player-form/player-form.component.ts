import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { API_BASE_URL } from '../../../../core/config/api.config';
interface Career {
  playerName: string;
  matches: number;
  battingInnings: number;
  runs: number;
  highestScore: number;
  dismissals: number;
  fours: number;
  sixes: number;
  battingBalls: number;
  battingAverage: number;
  strikeRate: number;
  bowlingBalls: number;
  runsConceded: number;
  wickets: number;
  bestWickets: number;
  economy: number;
}
@Component({
  selector: 'app-player-form',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player-form.component.html',
  styleUrl: './player-form.component.scss',
})
export class PlayerFormComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = API_BASE_URL;
  playerId = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  career: Career | null = null;
  constructor() {
    if (this.playerId) this.load();
    else this.loading = false;
  }
  private load() {
    this.http.get<Career>(`${this.api}/players/${this.playerId}/statistics`).subscribe({
      next: (s) => {
        this.career = s || null;
        this.loading = false;
      },
      error: () => {
        this.career = null;
        this.loading = false;
      },
    });
  }
  get averageRuns() {
    return this.career?.battingInnings
      ? (this.career.runs / this.career.battingInnings).toFixed(1)
      : '0.0';
  }
  get averageWickets() {
    return this.career?.matches ? (this.career.wickets / this.career.matches).toFixed(1) : '0.0';
  }
  get formScore() {
    if (!this.career) return 0;
    const runComponent = Math.min(75, this.career.runs / Math.max(1, this.career.matches) / 2);
    const wicketComponent = Math.min(
      25,
      (this.career.wickets / Math.max(1, this.career.matches)) * 10,
    );
    return Math.round(runComponent + wicketComponent);
  }
  get formLabel() {
    return this.formScore >= 75
      ? 'EXCELLENT'
      : this.formScore >= 55
        ? 'GOOD'
        : this.formScore >= 35
          ? 'AVERAGE'
          : 'NEEDS IMPROVEMENT';
  }
  get insight() {
    if (!this.career) return 'Not enough data to assess form.';
    if (this.formScore >= 75)
      return 'Strong overall career output with consistent run and/or wicket contribution.';
    if (this.formScore >= 55)
      return 'Good overall contribution. More completed matches will make the indicator stronger.';
    if (this.formScore >= 35)
      return 'Mixed output so far. Continue tracking future performances for a reliable trend.';
    return 'Limited current output. Future matches will provide a more meaningful performance signal.';
  }
  get runBar() {
    return Math.max(12, Math.min(145, 20 + this.career!.runs / 5));
  }
  get fourBar() {
    return Math.max(12, Math.min(145, 20 + this.career!.fours * 8));
  }
  get sixBar() {
    return Math.max(12, Math.min(145, 20 + this.career!.sixes * 10));
  }
  get strikeBar() {
    return Math.max(12, Math.min(145, this.career!.strikeRate * 0.65));
  }
  get wicketBar() {
    return Math.max(12, Math.min(145, 20 + this.career!.wickets * 12));
  }
  get bestWicketBar() {
    return Math.max(12, Math.min(145, 20 + this.career!.bestWickets * 20));
  }
  get economyBar() {
    return Math.max(12, Math.min(145, 150 - Math.min(138, this.career!.economy * 12)));
  }
  format(v: number) {
    return Number(v || 0).toFixed(2);
  }
  overs(balls: number) {
    return `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
  }
}
