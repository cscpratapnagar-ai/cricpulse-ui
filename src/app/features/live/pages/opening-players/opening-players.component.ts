import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface Match {
  id: string;
  name: string;
  status: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
  format?: string;
}
interface XIPlayer {
  teamId: string;
  playerId: string;
  name: string;
  captain: boolean;
  viceCaptain: boolean;
  wicketKeeper: boolean;
}
interface ExistingInnings {
  inningsId: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId?: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  status: string;
  strikerId?: string | null;
  nonStrikerId?: string | null;
  currentBowlerId?: string | null;
}
interface StartResponse {
  id: string;
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  status: string;
}

@Component({
  selector: 'app-opening-players',
  standalone: true,
  imports: [CommonModule, RouterLink, SelectFieldComponent],
  templateUrl: './opening-players.component.html',
  styleUrl: './opening-players.component.scss',
})
export class OpeningPlayersComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly api = API_BASE_URL;
  matchId = this.route.snapshot.paramMap.get('id') || '';
  inningsNumber = Number(this.route.snapshot.queryParamMap.get('innings') || '1');
  match: Match | null = null;
  xi: XIPlayer[] = [];
  loading = true;
  error = '';
  strikerId = '';
  nonStrikerId = '';
  bowlerId = '';
  battingTeamId = '';
  bowlingTeamId = '';
  existingInnings: ExistingInnings | null = null;
  resuming = false;
  starting = false;
  constructor() {
    if (![1, 2].includes(this.inningsNumber)) this.inningsNumber = 1;
    this.load();
  }
  get battingName() {
    return this.match
      ? (this.battingTeamId === this.match.teamAId ? this.match.teamAName : this.match.teamBName) ||
          'Batting Team'
      : 'Batting Team';
  }
  get bowlingName() {
    return this.match
      ? (this.bowlingTeamId === this.match.teamAId ? this.match.teamAName : this.match.teamBName) ||
          'Bowling Team'
      : 'Bowling Team';
  }
  get battingOptions(): SelectOption[] {
    return this.xi
      .filter((p) => p.teamId === this.battingTeamId)
      .map((p) => ({ value: p.playerId, label: p.name }));
  }
  get bowlingOptions(): SelectOption[] {
    return this.xi
      .filter((p) => p.teamId === this.bowlingTeamId)
      .map((p) => ({ value: p.playerId, label: p.name }));
  }
  get selectedCount() {
    return [this.strikerId, this.nonStrikerId, this.bowlerId].filter(Boolean).length;
  }
  get selectionProgress() {
    return (this.selectedCount / 3) * 100;
  }
  playerName(id: string) {
    return this.xi.find((player) => player.playerId === id)?.name || '';
  }
  playerInitials(id: string) {
    const name = this.playerName(id);
    return name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase()
      : '+';
  }
  get canStart() {
    return (
      !!this.matchId &&
      !!this.strikerId &&
      !!this.nonStrikerId &&
      !!this.bowlerId &&
      this.strikerId !== this.nonStrikerId
    );
  }
  load() {
    if (!this.matchId) {
      this.loading = false;
      this.error = 'Match id is missing.';
      return;
    }
    this.http.get<Match>(this.api + '/matches/' + this.matchId).subscribe({
      next: (m) => {
        this.match = m;
        this.loadToss();
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Unable to load match.';
      },
    });
  }
  loadToss() {
    this.http.get<any>(this.api + '/matches/' + this.matchId + '/toss').subscribe({
      next: (t) => {
        if (!t.recorded) {
          void this.router.navigateByUrl('/matches/' + this.matchId + '/toss');
          return;
        }
        const firstBat = t.battingTeamId;
        const firstBowl = t.bowlingTeamId;
        this.battingTeamId = this.inningsNumber === 1 ? firstBat : firstBowl;
        this.bowlingTeamId = this.inningsNumber === 1 ? firstBowl : firstBat;
        this.loadXiAndExisting();
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Unable to load toss.';
      },
    });
  }
  loadXiAndExisting() {
    this.http.get<XIPlayer[]>(this.api + '/matches/' + this.matchId + '/playing-xi').subscribe({
      next: (xi) => {
        this.xi = xi;
        this.checkCurrentInnings();
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Unable to load Playing XI.';
      },
    });
  }
  checkCurrentInnings() {
    this.http
      .get<ExistingInnings>(this.api + '/matches/' + this.matchId + '/current-innings')
      .subscribe({
        next: (innings) => {
          this.existingInnings = innings;
          if (innings.status === 'LIVE') {
            if (!innings.bowlingTeamId) {
              this.loading = false;
              this.error = 'Current innings is missing the bowling team.';
              return;
            }
            this.inningsNumber = innings.inningsNumber;
            this.battingTeamId = innings.battingTeamId;
            this.bowlingTeamId = innings.bowlingTeamId;
            this.loading = false;
            return;
          }
          if (innings.status === 'COMPLETED' && innings.inningsNumber === 1) {
            this.inningsNumber = 2;
            this.battingTeamId = innings.bowlingTeamId || this.battingTeamId;
            this.bowlingTeamId = innings.battingTeamId;
            this.existingInnings = null;
            this.error = '';
            this.loading = false;
            return;
          }
          if (innings.status === 'COMPLETED' && innings.inningsNumber >= 2) {
            this.loading = false;
            this.error = 'Both innings are already completed. This match is finished.';
            return;
          }
          this.loading = false;
        },
        error: (e) => {
          if (e?.status === 404) {
            this.existingInnings = null;
            this.loading = false;
          } else {
            this.loading = false;
            this.error = e?.error?.message || 'Unable to check current innings.';
          }
        },
      });
  }
  resumeInnings() {
    if (!this.existingInnings || this.resuming) return;
    this.resuming = true;
    void this.router.navigateByUrl(
      '/matches/' +
        this.matchId +
        '/live-scoring?inningsId=' +
        encodeURIComponent(this.existingInnings.inningsId),
    );
  }
  startInnings() {
    if (!this.canStart || this.starting) return;
    this.starting = true;
    this.error = '';
    this.http
      .post<StartResponse>(this.api + '/scoring/innings', {
        matchId: this.matchId,
        inningsNumber: this.inningsNumber,
        battingTeamId: this.battingTeamId,
        strikerId: this.strikerId,
        nonStrikerId: this.nonStrikerId,
        currentBowlerId: this.bowlerId,
      })
      .subscribe({
        next: (r) => {
          this.starting = false;
          const url =
            '/matches/' + this.matchId + '/live-scoring?inningsId=' + encodeURIComponent(r.id);
          void this.router.navigateByUrl(url).then((ok) => {
            if (!ok) this.error = 'Innings started, but Live Scoring route could not be opened.';
          });
        },
        error: (e) => {
          this.starting = false;
          const msg = String(e?.error?.message || '').toLowerCase();
          if (e?.status === 400 && msg.includes('already completed') && this.inningsNumber === 1) {
            this.inningsNumber = 2;
            const oldBat = this.battingTeamId;
            this.battingTeamId = this.bowlingTeamId;
            this.bowlingTeamId = oldBat;
            this.existingInnings = null;
            this.error = '';
            return;
          }
          this.error = e?.error?.message || 'Unable to start innings.';
        },
      });
  }
  overs(balls: number) {
    return Math.floor(balls / 6) + '.' + (balls % 6);
  }
}
