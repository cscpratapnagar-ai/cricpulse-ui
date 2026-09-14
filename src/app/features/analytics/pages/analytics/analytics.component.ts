import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface PlayerStat {
  playerId: string;
  playerName: string;
  matches: number;
  runs: number;
  highestScore: number;
  battingAverage: number;
  strikeRate: number;
  wickets: number;
  economy: number;
}
type Metric = 'runs' | 'wickets' | 'average' | 'strikeRate';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  private http = inject(HttpClient);
  players: PlayerStat[] = [];
  loading = true;
  metric: Metric = 'runs';
  metrics: { key: Metric; label: string }[] = [
    { key: 'runs', label: 'Runs' },
    { key: 'wickets', label: 'Wickets' },
    { key: 'average', label: 'Average' },
    { key: 'strikeRate', label: 'Strike rate' },
  ];
  constructor() {
    this.http.get<PlayerStat[]>(`${API_BASE_URL}/players/statistics`).subscribe({
      next: (r) => {
        this.players = r || [];
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
  get totalRuns() {
    return this.players.reduce((s, p) => s + Number(p.runs || 0), 0);
  }
  get totalWickets() {
    return this.players.reduce((s, p) => s + Number(p.wickets || 0), 0);
  }
  get avgRuns() {
    return this.players.length ? this.totalRuns / this.players.length : 0;
  }
  get avgWickets() {
    return this.players.length ? this.totalWickets / this.players.length : 0;
  }
  get ranked() {
    return [...this.players].sort((a, b) => this.value(b) - this.value(a));
  }
  get runsLeader() {
    return this.top('runs');
  }
  get wicketLeader() {
    return this.top('wickets');
  }
  get averageLeader() {
    return this.top('average');
  }
  get topStrike() {
    return this.top('strikeRate');
  }
  get batters() {
    return this.players.filter((p) => p.runs > 0).length;
  }
  get bowlers() {
    return this.players.filter((p) => p.wickets > 0).length;
  }
  get allRounders() {
    return this.players.filter((p) => p.runs > 0 && p.wickets > 0).length;
  }
  value(p: PlayerStat, m: Metric = this.metric) {
    switch (m) {
      case 'runs':
        return Number(p.runs || 0);
      case 'wickets':
        return Number(p.wickets || 0);
      case 'average':
        return Number(p.battingAverage || 0);
      case 'strikeRate':
        return Number(p.strikeRate || 0);
    }
  }
  top(m: Metric) {
    return [...this.players].sort((a, b) => this.value(b, m) - this.value(a, m))[0];
  }
  metricValue(p: PlayerStat) {
    const v = this.value(p);
    return this.metric === 'runs' || this.metric === 'wickets'
      ? String(Math.round(v))
      : this.format(v);
  }
  barWidth(p: PlayerStat) {
    const max = Math.max(...this.ranked.map((x) => this.value(x)), 1);
    return Math.max(5, (this.value(p) / max) * 100);
  }
  initial(n: string) {
    return (n || '?')
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
