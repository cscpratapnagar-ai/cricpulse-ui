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

@Component({
  selector: 'app-player-comparison',
  standalone: true,
  imports: [CommonModule, RouterLink, SelectFieldComponent],
  templateUrl: './player-comparison.component.html',
  styleUrl: './player-comparison.component.scss',
})
export class PlayerComparisonComponent implements OnInit {
  private http = inject(HttpClient);
  api = 'http://localhost:8080/api';
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
  get metrics() {
    if (!this.comparison) return [];
    const a = this.comparison.left,
      b = this.comparison.right;
    return [
      { label: 'MATCHES', left: a.matches, right: b.matches },
      { label: 'RUNS', left: a.runs, right: b.runs },
      { label: 'AVERAGE', left: a.average, right: b.average },
      { label: 'STRIKE RATE', left: a.strikeRate, right: b.strikeRate },
      { label: 'WICKETS', left: a.wickets, right: b.wickets },
      { label: 'ECONOMY', left: a.economy, right: b.economy },
    ];
  }
  bar(v: number, o: number) {
    const max = Math.max(v, o, 1);
    return Math.max(6, (v / max) * 100);
  }
  advantage(m: any) {
    if (m.left === m.right) return 'Evenly matched';
    const winner = m.left > m.right ? this.comparison!.left.name : this.comparison!.right.name;
    return winner + ' leads in ' + m.label.toLowerCase();
  }
}
