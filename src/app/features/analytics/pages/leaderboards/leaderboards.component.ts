import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface PlayerStatistics {
  playerId: string;
  playerName: string;
  matches: number;
  runs: number;
  highestScore: number;
  fours: number;
  sixes: number;
  battingAverage: number;
  strikeRate: number;
  wickets: number;
  bestWickets: number;
  economy: number;
}
type Board = 'runs' | 'average' | 'strikeRate' | 'wickets' | 'economy';

@Component({
  selector: 'app-leaderboards',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leaderboards.component.html',
  styleUrl: './leaderboards.component.scss',
})
export class LeaderboardsComponent {
  private readonly http = inject(HttpClient);
  readonly api = API_BASE_URL;
  players: PlayerStatistics[] = [];
  loading = true;
  active: Board = 'runs';
  readonly tabs: { key: Board; label: string; icon: string }[] = [
    { key: 'runs', label: 'Most Runs', icon: '↗' },
    { key: 'average', label: 'Best Average', icon: '◎' },
    { key: 'strikeRate', label: 'Strike Rate', icon: '⚡' },
    { key: 'wickets', label: 'Most Wickets', icon: '✦' },
    { key: 'economy', label: 'Best Economy', icon: '◌' },
  ];
  constructor() {
    this.http.get<PlayerStatistics[]>(this.api + '/players/statistics').subscribe({
      next: (r) => {
        this.players = r || [];
        this.loading = false;
      },
      error: () => {
        this.players = [];
        this.loading = false;
      },
    });
  }
  setBoard(key: Board) {
    this.active = key;
  }
  get activeLabel() {
    return this.tabs.find((t) => t.key === this.active)?.label || 'Leaderboard';
  }
  get unit() {
    return this.active === 'runs'
      ? 'RUNS'
      : this.active === 'wickets'
        ? 'WKTS'
        : this.active === 'economy'
          ? 'ECON'
          : 'RATE';
  }
  value(p: PlayerStatistics, key: Board = this.active): number {
    switch (key) {
      case 'runs':
        return Number(p.runs || 0);
      case 'average':
        return Number(p.battingAverage || 0);
      case 'strikeRate':
        return Number(p.strikeRate || 0);
      case 'wickets':
        return Number(p.wickets || 0);
      case 'economy':
        return Number(p.economy || 0);
    }
  }
  get ranked() {
    const items =
      this.active === 'economy'
        ? this.players.filter((p) => p.wickets > 0 && Number.isFinite(Number(p.economy)))
        : [...this.players];
    return items.sort((a, b) =>
      this.active === 'economy'
        ? this.economyValue(a) - this.economyValue(b)
        : this.value(b) - this.value(a),
    );
  }
  get topThree() {
    return this.ranked.slice(0, 3);
  }
  economyValue(p: PlayerStatistics) {
    return Number(p.economy || 0);
  }
  progress(p: PlayerStatistics) {
    const values = this.ranked
      .map((x) => (this.active === 'economy' ? this.economyValue(x) : this.value(x)))
      .filter(Number.isFinite);
    if (!values.length) return 0;
    if (this.active === 'economy') {
      const max = Math.max(...values, 1);
      return Math.max(8, 100 - (this.economyValue(p) / max) * 72);
    }
    const max = Math.max(...values, 1);
    return Math.max(6, (this.value(p) / max) * 100);
  }
  display(p: PlayerStatistics) {
    const v = this.active === 'economy' ? this.economyValue(p) : this.value(p);
    return this.active === 'runs' || this.active === 'wickets'
      ? String(Math.round(v))
      : this.format(v);
  }
  secondary(p: PlayerStatistics) {
    if (this.active === 'runs') return p.wickets + ' wickets';
    if (this.active === 'wickets') return p.runs + ' runs';
    return p.runs + ' runs · ' + p.wickets + ' wickets';
  }
  topBy(key: Board) {
    const items =
      key === 'economy'
        ? this.players.filter((p) => p.wickets > 0 && Number.isFinite(Number(p.economy)))
        : [...this.players];
    return items.sort((a, b) =>
      key === 'economy'
        ? this.economyValue(a) - this.economyValue(b)
        : this.value(b, key) - this.value(a, key),
    )[0];
  }
  initial(name: string) {
    return (name || '?')
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  format(v: number | undefined) {
    return Number(v || 0).toFixed(2);
  }
}
