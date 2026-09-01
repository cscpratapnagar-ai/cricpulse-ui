import { CommonModule } from '@angular/common';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { StateViewComponent } from '../../../../shared/components/state-view/state-view.component';
import { RouterLink } from '@angular/router';

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
type SortKey =
  | 'playerName'
  | 'matches'
  | 'runs'
  | 'battingAverage'
  | 'strikeRate'
  | 'wickets'
  | 'economy';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StateViewComponent],
  templateUrl: './players.component.html',
  styleUrl: './players.component.scss',
})
export class PlayersComponent {
  private http = inject(HttpClient);
  players: PlayerStat[] = [];
  loading = true;
  error = false;
  query = '';
  roleFilter = 'all';
  roleOpen = false;
  sort: SortKey = 'runs';
  ascending = false;
  page = 1;
  readonly pageSize = 10;
  readonly roleOptions = [
    { value: 'all', label: 'All players', icon: '◉' },
    { value: 'batters', label: 'Batters', icon: '↗' },
    { value: 'bowlers', label: 'Bowlers', icon: '✦' },
    { value: 'allrounders', label: 'All-rounders', icon: '◎' },
  ];
  constructor() {
    this.loadPlayers();
  }
  loadPlayers() {
    this.loading = true;
    this.error = false;
    this.http.get<PlayerStat[]>(`${API_BASE_URL}/players/statistics`).subscribe({
      next: (r) => {
        this.players = r || [];
        this.loading = false;
      },
      error: () => {
        this.players = [];
        this.error = true;
        this.loading = false;
      },
    });
  }
  goToOnboarding() {
    location.assign('/player/onboarding');
  }
  get filtered() {
    const q = this.query.trim().toLowerCase();
    return this.players
      .filter((p) => {
        const type = this.playerType(p);
        const search = !q || p.playerName.toLowerCase().includes(q);
        const role =
          this.roleFilter === 'all' ||
          (this.roleFilter === 'batters' && p.runs > 0 && p.wickets === 0) ||
          (this.roleFilter === 'bowlers' && p.wickets > 0 && p.runs === 0) ||
          (this.roleFilter === 'allrounders' && p.runs > 0 && p.wickets > 0);
        return search && role;
      })
      .sort((a, b) => {
        const av = this.sort === 'playerName' ? a.playerName.toLowerCase() : Number(a[this.sort]);
        const bv = this.sort === 'playerName' ? b.playerName.toLowerCase() : Number(b[this.sort]);
        const cmp =
          typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return this.ascending ? cmp : -cmp;
      });
  }
  get roleLabel() {
    return this.roleOptions.find((o) => o.value === this.roleFilter)?.label || 'All players';
  }
  setRole(value: string) {
    this.roleFilter = value;
    this.roleOpen = false;
    this.page = 1;
  }
  get totalPages() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }
  get paged() {
    if (this.page > this.totalPages) this.page = this.totalPages;
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalRuns() {
    return this.players.reduce((s, p) => s + Number(p.runs || 0), 0);
  }
  get totalWickets() {
    return this.players.reduce((s, p) => s + Number(p.wickets || 0), 0);
  }
  get allRounders() {
    return this.players.filter((p) => p.runs > 0 && p.wickets > 0).length;
  }
  sortBy(key: SortKey) {
    this.sort = key;
    this.ascending = false;
    this.page = 1;
  }
  toggleSort() {
    this.ascending = !this.ascending;
  }
  initial(n: string) {
    return (n || '?')
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  playerType(p: PlayerStat) {
    return p.runs > 0 && p.wickets > 0
      ? 'All-rounder'
      : p.wickets > 0
        ? 'Bowler'
        : p.runs > 0
          ? 'Batter'
          : 'Player';
  }
  format(v: number) {
    return Number(v || 0).toFixed(2);
  }
}
