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
  lastAction = '';
  syncState: 'SYNCED' | 'SAVING' | 'ERROR' = 'SYNCED';
  wicketOpen = false;
  extraOpen = false;
  selectedExtraType = '';
  extraRuns = 1;
  extraBatRuns = 0;
  wicketType = '';
  newBatterId = '';
  dismissedPlayerId = '';
  wicketRuns = 0;
  wicketLegalDelivery = true;
  completionReason = '';
  lifecycleBusy = false;
  connectionState: 'ONLINE' | 'RECONNECTING' | 'OFFLINE' = 'ONLINE';
  lastSyncedAt: Date | null = null;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private scoreFingerprint = '';
  externalUpdateNotice = '';
  selectedRecentBall: any = null;
  auditExpanded = false;
  reconciling = false;
  private onlineHandler = () => this.handleReconnect();
  private offlineHandler = () => (this.connectionState = 'OFFLINE');
  undoConfirmOpen = false;
  private lastDeliveryPayload: any = null;
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
  get extraSummary() {
    if (!this.selectedExtraType) return 'Choose an extra type.';
    const label = this.selectedExtraType.replace('_', ' ');
    const total =
      this.selectedExtraType === 'NO_BALL'
        ? 1 + this.extraBatRuns + this.extraRuns - 1
        : this.extraRuns;
    return `${label}: ${total} total run${total === 1 ? '' : 's'}`;
  }
  get canConfirmExtra() {
    if (!this.canDeliver || !this.selectedExtraType) return false;
    if (!Number.isInteger(this.extraRuns) || this.extraRuns < 1 || this.extraRuns > 7) return false;
    if (this.selectedExtraType === 'NO_BALL' && (this.extraBatRuns < 0 || this.extraBatRuns > 6))
      return false;
    return true;
  }
  get validationHint() {
    if (!this.score) return 'Loading match state…';
    if (this.score.status !== 'LIVE') return 'Scoring is unavailable for this innings.';
    if (this.busy) return 'Saving the previous action…';
    if (this.needsBowlerChange) return 'Select a new bowler to begin the next over.';
    if (!this.activeBowlerId) return 'Select an active bowler before scoring.';
    return 'Ready for the next delivery.';
  }
  get syncLabel() {
    return this.syncState === 'SAVING'
      ? 'SAVING'
      : this.syncState === 'ERROR'
        ? 'ACTION FAILED'
        : 'SYNCED';
  }
  get requiredRuns() {
    if (!this.score?.targetRuns) return 0;
    return Math.max(0, this.score.targetRuns - this.score.runs);
  }
  get ballsRemaining() {
    const matchOvers = Number(this.match?.format?.match(/\d+/)?.[0]);
    if (!Number.isFinite(matchOvers) || !matchOvers) return null;
    return Math.max(0, matchOvers * 6 - (this.score?.legalBalls || 0));
  }
  get currentRunRate() {
    const balls = this.score?.legalBalls || 0;
    return balls ? ((this.score?.runs || 0) * 6) / balls : 0;
  }
  get requiredRunRate() {
    const balls = this.ballsRemaining;
    return balls && this.requiredRuns ? (this.requiredRuns * 6) / balls : 0;
  }
  get ballLabel() {
    const b = this.score?.legalBalls || 0;
    return `${Math.floor(b / 6)}.${b % 6}`;
  }
  get publicScoreUrl() {
    return `/live/${this.matchId}`;
  }
  get completionTitle() {
    if (!this.score) return 'Innings complete';
    if (this.score.wickets >= 10) return 'ALL OUT';
    if (this.score.targetRuns && this.requiredRuns === 0) return 'TARGET REACHED';
    if (this.ballsRemaining === 0) return 'OVERS COMPLETE';
    return 'INNINGS COMPLETE';
  }
  get completionReasonText() {
    if (!this.score) return '';
    if (this.score.wickets >= 10) return 'All wickets are down. This innings is closed.';
    if (this.score.targetRuns && this.requiredRuns === 0) return 'The target has been reached. Scoring is locked.';
    if (this.ballsRemaining === 0) return 'The allotted overs have been completed.';
    return 'This innings has been completed and scoring is now locked.';
  }
  get canAdvanceInnings() {
    return !!this.score && this.score.status === 'COMPLETED' && this.score.inningsNumber === 1 && !this.lifecycleBusy;
  }
  get resultOutcome() {
    if (!this.score || this.score.status !== 'COMPLETED' || this.score.inningsNumber !== 2)
      return null;
    const target = this.score.targetRuns || 0;
    if (!target) return { type: 'COMPLETE', headline: 'MATCH COMPLETE', detail: 'Final innings completed.' };
    if (this.score.runs >= target) {
      const wicketsLeft = Math.max(0, 10 - this.score.wickets);
      return {
        type: 'CHASE_WIN',
        headline: `WON BY ${wicketsLeft} WICKET${wicketsLeft === 1 ? '' : 'S'}`,
        detail: `${this.battingName} chased ${target} with ${this.ballsRemaining ?? 0} balls remaining.`,
      };
    }
    if (this.score.runs === target - 1) {
      return { type: 'TIE', headline: 'MATCH TIED', detail: 'Both teams finished on the same score.' };
    }
    const margin = target - 1 - this.score.runs;
    return {
      type: 'DEFEND_WIN',
      headline: `DEFENDED BY ${margin} RUN${margin === 1 ? '' : 'S'}`,
      detail: `${this.bowlingName} successfully defended the target of ${target}.`,
    };
  }
  get resultAccent() {
    return this.resultOutcome?.type === 'TIE' ? 'neutral' : 'win';
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
  get wicketValidationHint() {
    if (!this.wicketType) return 'Choose how the wicket fell.';
    if (this.wicketType === 'RUN_OUT' && !this.dismissedPlayerId)
      return 'Choose which batter was dismissed.';
    if (this.wicketRuns < 0 || this.wicketRuns > 6) return 'Select a valid number of completed runs.';
    if (this.score && this.score.wickets < 9 && !this.newBatterId)
      return 'Select the incoming batter.';
    return 'Wicket details are ready to record.';
  }
  get canConfirmWicket() {
    if (this.busy || !this.wicketType || this.wicketRuns < 0 || this.wicketRuns > 6) return false;
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
        this.reconcileScore(s, silent);
        if (!this.refreshTimer && this.score?.status === 'LIVE') {
          this.refreshTimer = setInterval(() => this.loadScore(true), 15000);
        }
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
  retryLastAction() {
    if (this.busy || !this.lastDeliveryPayload) return;
    this.message = '';
    this.postDelivery(this.lastDeliveryPayload, true);
  }
  dismissError() {
    this.message = '';
    if (this.syncState === 'ERROR') this.syncState = 'SYNCED';
  }
  private postDelivery(body: any, isRetry = false) {
    if (!this.score || !this.inningsId || !this.canDeliver) return;
    this.lastDeliveryPayload = { ...body };
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
    this.syncState = 'SAVING';
    this.lastAction = isRetry ? 'Retrying previous action' : body.wicketType ? 'Wicket recorded' : body.extraType ? `${body.extraType} recorded` : `${body.batRuns} run${body.batRuns === 1 ? '' : 's'} recorded`;
    this.http
      .post<LiveScore>(`${this.api}/scoring/innings/${this.inningsId}/deliveries`, payload)
      .subscribe({
        next: (s) => {
          if (s && s.inningsId) {
            this.applyScore(s);
            this.busy = false;
            this.syncState = 'SYNCED';
            this.message = '';
            this.lastDeliveryPayload = null;
          } else {
            this.reloadScoreAfterDelivery();
            this.busy = false;
            this.syncState = 'SYNCED';
            this.message = '';
          }
        },
        error: (e) => {
          this.busy = false;
          this.syncState = 'ERROR';
          this.message = e?.error?.message || 'Unable to record delivery. Please try again.';
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
  openExtra(type: string) {
    if (!this.canDeliver) return;
    this.extraOpen = true;
    this.selectedExtraType = type;
    this.extraRuns = 1;
    this.extraBatRuns = 0;
  }
  recordExtra() {
    if (!this.canConfirmExtra) return;
    const isNoBall = this.selectedExtraType === 'NO_BALL';
    this.postDelivery({
      batRuns: isNoBall ? this.extraBatRuns : 0,
      extraRuns: this.extraRuns,
      extraType: this.selectedExtraType,
      wicketType: null,
      legalDelivery: this.selectedExtraType !== 'WIDE' && this.selectedExtraType !== 'NO_BALL',
    });
    this.extraOpen = false;
  }
  openWicket() {
    if (this.canDeliver) {
      this.wicketOpen = true;
      this.wicketType = '';
      this.newBatterId = '';
      this.dismissedPlayerId = this.score?.strikerId || '';
      this.wicketRuns = 0;
      this.wicketLegalDelivery = true;
    }
  }
  confirmWicket() {
    if (!this.canConfirmWicket || !this.score) return;
    const ten = this.score.wickets === 9;
    this.postDelivery({
      batRuns: this.wicketRuns,
      extraRuns: 0,
      extraType: null,
      wicketType: this.wicketType,
      legalDelivery: this.wicketLegalDelivery,
      dismissedPlayerId:
        this.wicketType === 'RUN_OUT' ? this.dismissedPlayerId : this.score.strikerId,
      newBatterId: ten ? null : this.newBatterId,
    });
    this.wicketOpen = false;
  }
  requestUndo() {
    if (!this.inningsId || this.busy || !this.score?.recentBalls?.length) return;
    this.undoConfirmOpen = true;
  }
  cancelUndo() {
    if (!this.busy) this.undoConfirmOpen = false;
  }
  undo() {
    if (!this.inningsId || this.busy) return;
    this.undoConfirmOpen = false;
    this.busy = true;
    this.syncState = 'SAVING';
    this.lastAction = 'Undoing last delivery';
    this.http.post<LiveScore>(`${this.api}/scoring/innings/${this.inningsId}/undo`, {}).subscribe({
      next: (s) => {
        this.applyScore(s);
        this.busy = false;
        this.syncState = 'SYNCED';
        this.lastAction = 'Last delivery undone';
      },
      error: (e) => {
        this.busy = false;
        this.syncState = 'ERROR';
        this.message = e?.error?.message || 'Unable to undo last delivery. Please try again.';
      },
    });
  }
  startSecondInnings() {
    if (!this.canAdvanceInnings) return;
    this.lifecycleBusy = true;
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
