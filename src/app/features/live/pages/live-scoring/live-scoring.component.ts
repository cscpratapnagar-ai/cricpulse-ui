import { CommonModule } from '@angular/common';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';
import { LiveScore } from '../../../../core/services/live-score.service';

interface Match {
  id: string;
  name: string;
  status: string;
  format?: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}
interface XIPlayer {
  teamId: string;
  playerId: string;
  name: string;
  captain: boolean;
  viceCaptain: boolean;
  wicketKeeper: boolean;
}

@Component({
  selector: 'app-live-scoring-v2',
  standalone: true,
  imports: [CommonModule, RouterLink, SelectFieldComponent],
  templateUrl: './live-scoring.component.html',
  styleUrl: './live-scoring.component.scss',
})
export class LiveScoringV2Component {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly api = API_BASE_URL;
  readonly runs = [0, 1, 2, 3, 4, 5, 6];
  readonly wicketOptions: SelectOption[] = [
    { value: 'BOWLED', label: 'Bowled' },
    { value: 'CAUGHT', label: 'Caught' },
    { value: 'LBW', label: 'LBW' },
    { value: 'RUN_OUT', label: 'Run Out' },
    { value: 'STUMPED', label: 'Stumped' },
    { value: 'HIT_WICKET', label: 'Hit Wicket' },
  ];
  matchId = this.route.snapshot.paramMap.get('id') || '';
  match: Match | null = null;
  xi: XIPlayer[] = [];
  score: LiveScore | null = null;
  inningsId = '';
  inningsNumber = 1;
  battingTeamId = '';
  bowlingTeamId = '';
  selectedBowlerId = '';
  previousBowlerId = '';
  loading = true;
  busy = false;
  message = '';
  wicketOpen = false;
  wicketType = '';
  newBatterId = '';
  dismissedPlayerId = '';
  constructor() {
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
  get activeBowlerId() {
    return this.selectedBowlerId || this.score?.currentBowlerId || '';
  }
  get needsBowlerChange() {
    return (
      !!this.score &&
      this.score.status === 'LIVE' &&
      this.score.legalBalls > 0 &&
      this.score.legalBalls % 6 === 0 &&
      !this.selectedBowlerId
    );
  }
  get canChangeBowler() {
    return (
      !!this.score &&
      this.score.status === 'LIVE' &&
      !this.busy &&
      (this.score.legalBalls || 0) % 6 === 0
    );
  }
  get canDeliver() {
    return (
      !!this.score &&
      this.score.status === 'LIVE' &&
      !!this.activeBowlerId &&
      !this.needsBowlerChange &&
      !this.busy &&
      (this.score.wickets ?? 0) < 10
    );
  }
  get ballLabel() {
    const b = this.score?.legalBalls || 0;
    return `${Math.floor(b / 6)}.${b % 6}`;
  }
  get publicScoreUrl() {
    return `/live/${this.matchId}`;
  }
  get completionText() {
    if (!this.score) return '';
    return this.score.inningsNumber === 1
      ? `First innings finished at ${this.score.runs}/${this.score.wickets}.`
      : `Second innings finished at ${this.score.runs}/${this.score.wickets}.`;
  }
  get bowlerOptions(): SelectOption[] {
    return this.xi
      .filter((p) => p.teamId === this.bowlingTeamId && p.playerId !== this.previousBowlerId)
      .map((p) => ({ value: p.playerId, label: p.name }));
  }
  get newBatterOptions(): SelectOption[] {
    if (!this.score || this.score.wickets >= 9) return [];
    const used = new Set([
      this.score.strikerId,
      this.score.nonStrikerId,
      ...(this.score.batters || []).filter((b) => b.out).map((b) => b.playerId),
    ]);
    return this.xi
      .filter((p) => p.teamId === this.battingTeamId && !used.has(p.playerId))
      .map((p) => ({ value: p.playerId, label: p.name }));
  }
  get dismissedOptions(): SelectOption[] {
    if (!this.score) return [];
    return [this.score.strikerId, this.score.nonStrikerId]
      .filter(Boolean)
      .map((id) => ({ value: id!, label: this.playerName(id) }));
  }
  get canConfirmWicket() {
    if (this.busy || !this.wicketType) return false;
    if (this.wicketType === 'RUN_OUT' && !this.dismissedPlayerId) return false;
    return this.score?.wickets === 9 || !!this.newBatterId;
  }
  get currentOverBalls() {
    if (!this.score) return [];
    const legal = this.score.legalBalls || 0;
    if (legal % 6 === 0) return [];
    const currentOver = Math.floor(legal / 6);
    return (this.score.recentBalls || [])
      .filter((b) => b.overNumber === currentOver)
      .reverse()
      .map((b) =>
        b.wicketType
          ? 'W'
          : b.extraType === 'WIDE'
            ? 'Wd'
            : b.extraType === 'NO_BALL'
              ? 'Nb'
              : String(b.totalRuns),
      );
  }
  private load() {
    if (!this.matchId) {
      this.loading = false;
      return;
    }
    this.http.get<Match>(`${this.api}/matches/${this.matchId}`).subscribe({
      next: (m) => {
        this.match = m;
        this.loadXi();
      },
      error: (e) => {
        this.loading = false;
        this.message = e?.error?.message || 'Unable to load match.';
      },
    });
  }
  private loadXi() {
    this.http.get<any>(`${this.api}/matches/${this.matchId}/playing-xi`).subscribe({
      next: (raw) => {
        const xi = Array.isArray(raw) ? raw : raw?.players || raw?.data || raw?.content || [];
        this.xi = Array.isArray(xi) ? xi : [];
        this.loadInnings();
      },
      error: (e) => {
        this.loading = false;
        this.message = e?.error?.message || 'Unable to load Playing XI.';
      },
    });
  }
  private loadInnings() {
    this.http.get<any>(`${this.api}/matches/${this.matchId}/current-innings`).subscribe({
      next: (i) => {
        this.inningsId = i.id || i.inningsId || '';
        this.inningsNumber = i.inningsNumber || 1;
        this.battingTeamId = i.battingTeamId || '';
        this.bowlingTeamId = i.bowlingTeamId || '';
        this.normalizeTeamIds();
        this.loadScoreById(this.inningsId);
      },
      error: (e) => {
        this.loading = false;
        this.message =
          e?.status === 404
            ? 'No current innings found.'
            : e?.error?.message || 'Unable to load current innings.';
      },
    });
  }
  private normalizeTeamIds() {
    if (!this.match) return;
    if (!this.battingTeamId && this.bowlingTeamId)
      this.battingTeamId =
        this.bowlingTeamId === this.match.teamAId ? this.match.teamBId : this.match.teamAId;
    if (!this.bowlingTeamId && this.battingTeamId)
      this.bowlingTeamId =
        this.battingTeamId === this.match.teamAId ? this.match.teamBId : this.match.teamAId;
    if (!this.battingTeamId && this.inningsNumber === 1) {
      this.battingTeamId = this.match.teamAId;
      this.bowlingTeamId = this.match.teamBId;
    }
  }
  private loadScoreById(id: string) {
    if (!id) {
      this.loading = false;
      this.message = 'Current innings ID is missing.';
      return;
    }
    this.inningsId = id;
    this.http.get<LiveScore>(`${this.api}/scoring/innings/${id}`).subscribe({
      next: (s) => {
        this.applyScore(s);
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.message = e?.error?.message || 'Unable to load live score.';
      },
    });
  }
  private applyScore(s: LiveScore) {
    if (!s || !s.inningsId) {
      this.message = 'Live score response is incomplete.';
      return;
    }
    this.score = s;
    this.inningsId = s.inningsId || this.inningsId;
    this.inningsNumber = s.inningsNumber || this.inningsNumber;
    this.battingTeamId = (s as any).battingTeamId || this.battingTeamId;
    this.bowlingTeamId = (s as any).bowlingTeamId || this.bowlingTeamId;
    this.normalizeTeamIds();
    const boundary = s.status === 'LIVE' && s.legalBalls > 0 && s.legalBalls % 6 === 0;
    if (boundary) {
      this.previousBowlerId = s.currentBowlerId || '';
      this.selectedBowlerId = '';
    } else {
      this.previousBowlerId = '';
      this.selectedBowlerId = s.currentBowlerId || '';
    }
  }
  private reloadScoreAfterDelivery() {
    this.loadScoreById(this.inningsId);
  }
  private postDelivery(body: any) {
    if (!this.score || !this.inningsId || !this.canDeliver) return;
    const payload = {
      inningsId: this.inningsId,
      overNumber: Math.floor((this.score.legalBalls || 0) / 6),
      ballNumber: ((this.score.legalBalls || 0) % 6) + 1,
      strikerId: this.score.strikerId,
      nonStrikerId: this.score.nonStrikerId,
      bowlerId: this.activeBowlerId,
      ...body,
    };
    this.busy = true;
    this.http
      .post<LiveScore>(`${this.api}/scoring/innings/${this.inningsId}/deliveries`, payload)
      .subscribe({
        next: (s) => {
          if (s && s.inningsId) {
            this.applyScore(s);
            this.busy = false;
            this.message = '';
          } else {
            this.reloadScoreAfterDelivery();
            this.busy = false;
            this.message = '';
          }
        },
        error: (e) => {
          this.busy = false;
          this.message = e?.error?.message || 'Unable to record delivery.';
        },
      });
  }
  recordRuns(r: number) {
    this.postDelivery({
      batRuns: r,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
      legalDelivery: true,
    });
  }
  recordExtra(type: string) {
    this.postDelivery({
      batRuns: 0,
      extraRuns: 1,
      extraType: type,
      wicketType: null,
      legalDelivery: type !== 'WIDE' && type !== 'NO_BALL',
    });
  }
  openWicket() {
    if (this.canDeliver) {
      this.wicketOpen = true;
      this.wicketType = '';
      this.newBatterId = '';
      this.dismissedPlayerId = this.score?.strikerId || '';
    }
  }
  confirmWicket() {
    if (!this.canConfirmWicket || !this.score) return;
    const ten = this.score.wickets === 9;
    this.postDelivery({
      batRuns: 0,
      extraRuns: 0,
      extraType: null,
      wicketType: this.wicketType,
      legalDelivery: true,
      dismissedPlayerId:
        this.wicketType === 'RUN_OUT' ? this.dismissedPlayerId : this.score.strikerId,
      newBatterId: ten ? null : this.newBatterId,
    });
    this.wicketOpen = false;
  }
  undo() {
    if (!this.inningsId || this.busy) return;
    this.busy = true;
    this.http.post<LiveScore>(`${this.api}/scoring/innings/${this.inningsId}/undo`, {}).subscribe({
      next: (s) => {
        this.applyScore(s);
        this.busy = false;
      },
      error: (e) => {
        this.busy = false;
        this.message = e?.error?.message || 'Unable to undo last delivery.';
      },
    });
  }
  startSecondInnings() {
    this.router.navigate(['/matches', this.matchId, 'opening-players'], {
      queryParams: { innings: 2 },
    });
  }
  playerName(id?: string | null) {
    if (!id) return '—';
    return this.xi.find((p) => p.playerId === id)?.name || 'Player';
  }
  batterRuns(id?: string | null) {
    return this.score?.batters?.find((b) => b.playerId === id)?.runs ?? 0;
  }
  batterBalls(id?: string | null) {
    return this.score?.batters?.find((b) => b.playerId === id)?.ballsFaced ?? 0;
  }
  bowlerFigures(id?: string | null) {
    const b = this.score?.bowlers?.find((x) => x.playerId === id);
    return b
      ? `${Math.floor(b.legalBalls / 6)}.${b.legalBalls % 6}-${b.runsConceded}-${b.wickets}`
      : '0.0-0-0';
  }
  overs(balls: number) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }
}
