import { API_BASE_URL } from '../../../../core/config/api.config';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';

interface Player {
  id: string;
  name: string;
  role?: string;
  teamName?: string;
}
interface Snapshot {
  playerId: string;
  name: string;
  role: string;
  teamName: string;
  profilePhotoUrl?: string;
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  wickets: number;
  economy: number;
  fours: number;
  sixes: number;
  bestScore?: string;
  bestBowling?: string;
}
interface Comparison {
  left: Snapshot;
  right: Snapshot;
}
type MetricDirection = 'higher' | 'lower';
interface ComparisonMetric {
  label: string;
  left: number;
  right: number;
  direction: MetricDirection;
  suffix?: string;
}

@Component({
  selector: 'app-player-comparison',
  standalone: true,
  imports: [CommonModule, RouterLink, SelectFieldComponent],
  templateUrl: './player-comparison.component.html',
  styleUrl: './player-comparison.component.scss',
})
export class PlayerComparisonComponent implements OnInit {
  private http = inject(HttpClient);
  api = `${API_BASE_URL}`;
  players: Player[] = [];
  leftId = '';
  rightId = '';
  comparison: Comparison | null = null;
  loading = false;
  get leftOptions(): SelectOption[] {
    return this.players
      .filter((p) => p.id !== this.rightId)
      .map((p) => ({ value: p.id, label: p.name }));
  }
  get rightOptions(): SelectOption[] {
    return this.players
      .filter((p) => p.id !== this.leftId)
      .map((p) => ({ value: p.id, label: p.name }));
  }
  selectLeft(id: string) {
    this.leftId = id;
    this.compare();
  }
  selectRight(id: string) {
    this.rightId = id;
    this.compare();
  }
  ngOnInit() {
    this.http.get<any[]>(this.api + '/players/statistics').subscribe(
      (r) =>
        (this.players = (r || [])
          .map((x) => ({
            id: x.playerId || x.id,
            name: x.playerName || x.name || 'Unknown player',
            role: x.role,
            teamName: x.teamName,
          }))
          .filter((p) => !!p.id && p.name !== 'Unknown player')),
    );
  }
  compare() {
    if (!this.leftId || !this.rightId || this.leftId === this.rightId) {
      this.comparison = null;
      return;
    }
    this.loading = true;
    this.http
      .get<Comparison>(this.api + `/players/compare?left=${this.leftId}&right=${this.rightId}`)
      .subscribe({
        next: (r) => {
          this.comparison = r;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }
  initial(n: string) {
    return n
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  get metrics(): ComparisonMetric[] {
    if (!this.comparison) return [];
    const a = this.comparison.left;
    const b = this.comparison.right;
    return [
      { label: 'MATCHES', left: a.matches, right: b.matches, direction: 'higher' },
      { label: 'RUNS', left: a.runs, right: b.runs, direction: 'higher' },
      { label: 'AVERAGE', left: a.average, right: b.average, direction: 'higher' },
      { label: 'STRIKE RATE', left: a.strikeRate, right: b.strikeRate, direction: 'higher' },
      { label: 'WICKETS', left: a.wickets, right: b.wickets, direction: 'higher' },
      { label: 'ECONOMY', left: a.economy, right: b.economy, direction: 'lower' },
    ];
  }
  get battingProfile() {
    if (!this.comparison) return null;
    return {
      left: this.comparison.left.strikeRate,
      right: this.comparison.right.strikeRate,
      leftLabel: 'Scoring rate',
      rightLabel: 'Scoring rate',
    };
  }
  get boundaryProfile() {
    if (!this.comparison) return null;
    const a = this.comparison.left;
    const b = this.comparison.right;
    const left = a.runs > 0 ? ((a.fours * 4 + a.sixes * 6) / a.runs) * 100 : 0;
    const right = b.runs > 0 ? ((b.fours * 4 + b.sixes * 6) / b.runs) * 100 : 0;
    return { left: Math.min(100, left), right: Math.min(100, right) };
  }
  get edgeSummary() {
    if (!this.comparison) return null;
    const a = this.comparison.left;
    const b = this.comparison.right;
    const higherWins = (left: number, right: number) => (left === right ? 0 : left > right ? 1 : -1);
    const scores = [
      higherWins(a.runs, b.runs),
      higherWins(a.average, b.average),
      higherWins(a.strikeRate, b.strikeRate),
      higherWins(a.wickets, b.wickets),
      higherWins(b.economy, a.economy),
    ];
    const left = scores.filter((x) => x > 0).length;
    const right = scores.filter((x) => x < 0).length;
    if (left === right) return { label: 'Balanced profile', detail: 'The available career indicators are closely matched.', winner: '' };
    const winner = left > right ? a : b;
    return {
      label: `${winner.name} has the broader career edge`,
      detail: `${Math.max(left, right)} of 5 available core indicators currently favor this player.`,
      winner: winner.name,
    };
  }
  bar(v: number, o: number) {
    const max = Math.max(v, o, 1);
    return Math.max(6, (v / max) * 100);
  }
  metricWinner(m: ComparisonMetric) {
    if (m.left === m.right) return '';
    if (m.direction === 'lower') return m.left < m.right ? 'left' : 'right';
    return m.left > m.right ? 'left' : 'right';
  }
  advantage(m: ComparisonMetric) {
    const winner = this.metricWinner(m);
    if (!winner) return 'Evenly matched';
    const name = winner === 'left' ? this.comparison!.left.name : this.comparison!.right.name;
    const label = m.label.toLowerCase();
    return m.direction === 'lower' ? `${name} has the lower ${label}` : `${name} leads in ${label}`;
  }
}
