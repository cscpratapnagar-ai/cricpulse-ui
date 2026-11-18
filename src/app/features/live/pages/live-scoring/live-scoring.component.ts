import { CommonModule } from '@angular/common';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';
import { LiveScore, scoringDeliveryHeaders } from '../../../../core/services/live-score.service';
import {
  OfflineScoringStore,
  QueuedDelivery,
} from '../../../../core/services/offline-scoring.store';
import {
  getOfflineQueueConflictPositions,
  hasOfflineQueuePositionConflict,
  isTransientOfflineSyncStatus,
  offlineDeliveryMatchesRecentBall,
  offlineQueueIdentityError,
  projectOfflineDelivery,
} from '../../../../core/services/offline-score.reducer';
import {
  LiveScoreSocketService,
  LiveSocketState,
} from '../../../../core/services/live-score-socket.service';

interface Match {
  id: string;
  name: string;
  status: string;
  format?: string;
  totalOvers?: number | null;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}
interface OfflineQueueDiagnostic {
  commandId: string;
  position: string;
  summary: string;
  identities: string;
  syncStatus: string;
  createdAt: string;
  conflict: boolean;
}

interface XIPlayer {
  teamId: string;
  playerId: string;
  name: string;
  captain: boolean;
  viceCaptain: boolean;
  wicketKeeper: boolean;
}

export function shouldRecoverLiveScoreAfterSocketConnect(
  previousState: LiveSocketState,
  nextState: LiveSocketState,
  hasLoadedScore: boolean,
): boolean {
  return previousState !== 'CONNECTED' && nextState === 'CONNECTED' && hasLoadedScore;
}

export const DELIVERY_WICKET_OPTIONS: SelectOption[] = [
  { value: 'BOWLED', label: 'Bowled' },
  { value: 'CAUGHT', label: 'Caught' },
  { value: 'LBW', label: 'LBW' },
  { value: 'RUN_OUT', label: 'Run Out' },
  { value: 'STUMPED', label: 'Stumped' },
  { value: 'HIT_WICKET', label: 'Hit Wicket' },
  { value: 'HIT_BALL_TWICE', label: 'Hit the Ball Twice' },
  { value: 'OBSTRUCTING_THE_FIELD', label: 'Obstructing the Field' },
];

export function buildOfflineQueueDiagnostics(
  queue: QueuedDelivery[],
  matchId: string,
  inningsId: string,
): { items: OfflineQueueDiagnostic[]; conflictPositions: string[]; report: string } {
  const legalPositionCounts = new Map<string, number>();
  for (const item of queue) {
    const payload = item.payload;
    const legal =
      payload.legalDelivery ?? (payload.extraType !== 'WIDE' && payload.extraType !== 'NO_BALL');
    if (!legal) continue;
    const position = `${payload.overNumber + 1}.${payload.ballNumber}`;
    legalPositionCounts.set(position, (legalPositionCounts.get(position) || 0) + 1);
  }
  const conflictPositions = getOfflineQueueConflictPositions(queue);
  const items = queue.map((item) => {
    const payload = item.payload;
    const position = `${payload.overNumber + 1}.${payload.ballNumber}`;
    const legal =
      payload.legalDelivery ?? (payload.extraType !== 'WIDE' && payload.extraType !== 'NO_BALL');
    const conflict = legal && (legalPositionCounts.get(position) || 0) > 1;
    const extras = payload.extraType ? `${payload.extraType} +${payload.extraRuns}` : '';
    const wicket = payload.wicketType
      ? `WICKET: ${payload.wicketType} (dismissed ${payload.dismissedPlayerId || payload.strikerId}, new batter ${payload.newBatterId || 'not specified'})`
      : '';
    const summary = [
      `${payload.batRuns} bat run(s)`,
      `${payload.extraRuns} extra run(s)`,
      extras,
      `Total ${payload.batRuns + payload.extraRuns}`,
      legal ? 'LEGAL DELIVERY' : 'NON-LEGAL DELIVERY',
      wicket,
    ]
      .filter(Boolean)
      .join(' · ');
    const identities = `Striker ${payload.strikerId} / Non-striker ${payload.nonStrikerId} / Bowler ${payload.bowlerId}`;
    return {
      commandId: item.commandId,
      position,
      summary,
      identities,
      syncStatus: item.syncStatus || 'PENDING',
      createdAt: new Date(item.createdAt).toLocaleString(),
      conflict,
    };
  });
  const report = [
    'CricPulse Offline Queue Recovery Report',
    `Match: ${matchId}`,
    `Innings: ${inningsId}`,
    `Pending deliveries: ${queue.length}`,
    `Conflicting legal-ball positions: ${conflictPositions.join(', ') || 'none identified'}`,
    ...items.map(
      (item) =>
        `${item.conflict ? '[CONFLICT] ' : ''}${item.position} | ${item.summary} | ${item.identities} | command=${item.commandId} | status=${item.syncStatus} | saved=${item.createdAt}`,
    ),
    'Recovery: compare this retained queue with the official scorer/server score. Do not sync or delete a branch until the official delivery sequence is confirmed.',
  ].join('\\n');
  return { items, conflictPositions, report };
}

@Component({
  selector: 'app-live-scoring-v2',
  standalone: true,
  imports: [CommonModule, RouterLink, SelectFieldComponent],
  templateUrl: './live-scoring.component.html',
  styleUrl: './live-scoring.component.scss',
})
export class LiveScoringV2Component implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly liveSocket = inject(LiveScoreSocketService);
  private readonly offlineStore = inject(OfflineScoringStore);
  readonly api = API_BASE_URL;
  readonly runs = [0, 1, 2, 3, 4, 5, 6];
  readonly wicketOptions = DELIVERY_WICKET_OPTIONS;
  // The route is hosted inside DashboardComponent's empty-path child route.
  // In that configuration Angular may keep :id on an ancestor snapshot.
  matchId =
    this.route.snapshot.paramMap.get('id') ||
    this.route.parent?.snapshot.paramMap.get('id') ||
    this.route.pathFromRoot
      .map((route) => route.snapshot.paramMap.get('id'))
      .find((id): id is string => !!id) ||
    '';
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
  deliveryFeedback: {
    type: 'run' | 'four' | 'six' | 'wicket' | 'extra';
    label: string;
    detail: string;
  } | null = null;
  private feedbackTimer?: ReturnType<typeof setTimeout>;
  lastAction = '';
  syncState: 'SYNCED' | 'SAVING' | 'QUEUED' | 'ERROR' = 'SYNCED';
  pendingOfflineCount = 0;
  offlineQueueDiagnostics: OfflineQueueDiagnostic[] = [];
  offlineConflictPositions: string[] = [];
  offlineRecoveryReport = '';
  private offlineSnapshotReady = false;
  private flushingOfflineQueue = false;
  private offlineQueueBlocked = false;
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
  socketState: LiveSocketState = 'DISCONNECTED';
  lastSyncedAt: Date | null = null;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private scoreFingerprint = '';
  externalUpdateNotice = '';
  selectedRecentBall: any = null;
  auditExpanded = false;
  correctionAudit: any[] = [];
  reconciling = false;
  private onlineHandler = () => this.handleReconnect();
  private offlineHandler = () => (this.connectionState = 'OFFLINE');
  undoConfirmOpen = false;
  private lastDeliveryPayload: any = null;
  private pendingDeliveryCommandId: string | null = null;
  private scoreBroadcastChannel?: BroadcastChannel;
  private localRelaySocket?: WebSocket;
  private localRelayReconnectTimer?: ReturnType<typeof setTimeout>;
  private localRelayReconnectDelay = 1000;
  private offlineSyncRetryTimer?: ReturnType<typeof setTimeout>;
  private offlineSyncRetryDelay = 3000;
  private connectivityProbeTimer?: ReturnType<typeof setInterval>;
  private connectivityProbeInFlight = false;
  private destroyed = false;
  private scorerLeaseToken = '';
  private scorerLeaseReady = false;
  private scorerLeaseRenewalTimer?: ReturnType<typeof setInterval>;
  private socketRecoveryInFlight = false;

  constructor() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    this.connectionState = navigator.onLine ? 'RECONNECTING' : 'OFFLINE';
    this.connectivityProbeTimer = setInterval(() => {
      void this.checkBackendConnectivity();
    }, 5000);
    if (typeof BroadcastChannel !== 'undefined') {
      this.scoreBroadcastChannel = new BroadcastChannel('cricpulse-live-score');
    }
    this.connectLocalObsRelay();
    this.liveSocket.state$.subscribe((state) => {
      const previousState = this.socketState;
      this.socketState = state;
      if (state === 'CONNECTED') {
        this.connectionState = 'ONLINE';
        // WebSocket reconnects do not replay missed frames. Immediately fetch
        // the authoritative score instead of waiting for the 15-second poll.
        if (
          shouldRecoverLiveScoreAfterSocketConnect(previousState, state, !!this.score) &&
          this.inningsId &&
          !this.socketRecoveryInFlight
        ) {
          this.socketRecoveryInFlight = true;
          this.loadScoreById(this.inningsId, true);
        }
      }
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.liveSocket.disconnect();
    this.scoreBroadcastChannel?.close();
    if (this.localRelayReconnectTimer) clearTimeout(this.localRelayReconnectTimer);
    this.localRelaySocket?.close();
    this.localRelaySocket = undefined;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    if (this.offlineSyncRetryTimer) clearTimeout(this.offlineSyncRetryTimer);
    if (this.connectivityProbeTimer) clearInterval(this.connectivityProbeTimer);
    if (this.scorerLeaseRenewalTimer) clearInterval(this.scorerLeaseRenewalTimer);
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
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

  get targetReached() {
    return !!this.score?.targetRuns && this.score.runs >= this.score.targetRuns;
  }

  get oversComplete() {
    return this.ballsRemaining === 0;
  }

  get hasValidBattingState() {
    return (
      !!this.score?.strikerId &&
      !!this.score?.nonStrikerId &&
      this.score.strikerId !== this.score.nonStrikerId
    );
  }

  get canDeliver() {
    return (
      !!this.score &&
      this.score.status === 'LIVE' &&
      !!this.activeBowlerId &&
      this.hasValidBattingState &&
      !this.targetReached &&
      !this.oversComplete &&
      !this.needsBowlerChange &&
      !this.busy &&
      !this.offlineQueueBlocked &&
      (!navigator.onLine || this.scorerLeaseReady) &&
      Number.isInteger(this.score.legalBalls) &&
      this.score.legalBalls >= 0 &&
      Number.isInteger(this.score.runs) &&
      this.score.runs >= 0 &&
      Number.isInteger(this.score.wickets) &&
      this.score.wickets >= 0 &&
      this.score.wickets < 10
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
    if (!['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'].includes(this.selectedExtraType)) return false;
    if (!Number.isInteger(this.extraRuns) || this.extraRuns < 1 || this.extraRuns > 7) return false;
    if (
      this.selectedExtraType === 'NO_BALL' &&
      (!Number.isInteger(this.extraBatRuns) || this.extraBatRuns < 0 || this.extraBatRuns > 6)
    )
      return false;
    if (this.selectedExtraType !== 'NO_BALL' && this.extraBatRuns !== 0) return false;
    return true;
  }

  get validationHint() {
    if (!this.score) return 'Loading match state…';
    if (this.score.status !== 'LIVE') return 'Scoring is unavailable for this innings.';
    if (this.offlineQueueBlocked)
      return 'Pending offline deliveries need reconciliation before scoring can continue.';
    if (navigator.onLine && !this.scorerLeaseReady)
      return 'Waiting for exclusive scorer control. Another active scorer may own this innings.';
    if (this.busy) return 'Saving the previous action…';
    if (this.targetReached) return 'Target reached. Scoring is locked.';
    if (this.oversComplete) return 'All allotted overs are complete.';
    if (!this.hasValidBattingState)
      return 'Two different active batters are required before scoring.';
    if (this.needsBowlerChange) return 'Select a new bowler to begin the next over.';
    if (!this.activeBowlerId) return 'Select an active bowler before scoring.';
    if (this.score.wickets >= 10) return 'All wickets are down. Scoring is locked.';
    return 'Ready for the next delivery.';
  }

  get canRetryLastAction() {
    return !this.busy && !!this.lastDeliveryPayload;
  }

  get syncLabel() {
    return this.syncState === 'SAVING'
      ? 'SAVING'
      : this.syncState === 'QUEUED'
        ? 'QUEUED OFFLINE'
        : this.syncState === 'ERROR'
          ? 'ACTION FAILED'
          : 'SYNCED';
  }

  get connectionLabel() {
    if (this.connectionState === 'OFFLINE') return 'OFFLINE';
    if (this.connectionState === 'RECONNECTING') return 'RECONNECTING';
    return 'SYNCING LIVE STATE';
  }

  get connectionHint() {
    if (this.connectionState === 'OFFLINE') return 'Waiting for an internet connection.';
    if (this.connectionState === 'RECONNECTING')
      return 'Refreshing the authoritative innings state.';
    return 'Polling is active while the live socket reconnects.';
  }

  ballToken(ball: any) {
    if (!ball) return '—';
    if (ball.wicketType) return 'W';
    if (ball.extraType === 'WIDE') return ball.totalRuns > 1 ? `Wd+${ball.totalRuns - 1}` : 'Wd';
    if (ball.extraType === 'NO_BALL') return ball.totalRuns > 1 ? `Nb+${ball.totalRuns - 1}` : 'Nb';
    if (ball.extraType === 'BYE') return `B${ball.totalRuns || ''}`;
    if (ball.extraType === 'LEG_BYE') return `Lb${ball.totalRuns || ''}`;
    return String(ball.totalRuns ?? ball.batRuns ?? 0);
  }

  ballSemantic(ball: any) {
    if (!ball) return '';
    if (ball.wicketType) return 'wicket';
    if (ball.extraType) return 'extra';
    if (ball.batRuns === 4 || ball.batRuns === 6) return 'boundary';
    return '';
  }

  selectRecentBall(ball: any) {
    this.selectedRecentBall = ball;
  }

  dismissRecentBall() {
    this.selectedRecentBall = null;
  }

  dismissExternalUpdate() {
    this.externalUpdateNotice = '';
  }

  get requiredRuns() {
    if (!this.score?.targetRuns) return 0;
    return Math.max(0, this.score.targetRuns - this.score.runs);
  }

  get configuredOvers() {
    const scoreOvers = Number(this.score?.totalOvers);
    if (Number.isFinite(scoreOvers) && scoreOvers > 0) return scoreOvers;
    const matchOvers = Number(this.match?.totalOvers);
    if (Number.isFinite(matchOvers) && matchOvers > 0) return matchOvers;
    const formatOvers = Number(this.match?.format?.match(/\d+/)?.[0]);
    return Number.isFinite(formatOvers) && formatOvers > 0 ? formatOvers : null;
  }

  get ballsRemaining() {
    const overs = this.configuredOvers;
    if (!overs) return null;
    return Math.max(0, overs * 6 - (this.score?.legalBalls || 0));
  }

  get currentRunRate() {
    const balls = this.score?.legalBalls || 0;
    return balls ? ((this.score?.runs || 0) * 6) / balls : 0;
  }

  get requiredRunRate() {
    const balls = this.ballsRemaining;
    return balls && this.requiredRuns ? (this.requiredRuns * 6) / balls : 0;
  }

  get currentOverNumber() {
    return Math.floor((this.score?.legalBalls || 0) / 6) + 1;
  }

  get currentOverProgress() {
    return (this.score?.legalBalls || 0) % 6;
  }

  get ballLabel() {
    const b = this.score?.legalBalls || 0;
    return `${Math.floor(b / 6) + 1}.${(b % 6) + 1}`;
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
    if (this.score.targetRuns && this.requiredRuns === 0)
      return 'The target has been reached. Scoring is locked.';
    if (this.ballsRemaining === 0) return 'The allotted overs have been completed.';
    return 'This innings has been completed and scoring is now locked.';
  }

  get canAdvanceInnings() {
    return (
      !!this.score &&
      this.score.status === 'COMPLETED' &&
      this.score.inningsNumber === 1 &&
      !this.lifecycleBusy
    );
  }

  get resultOutcome() {
    if (!this.score || this.score.status !== 'COMPLETED' || this.score.inningsNumber !== 2)
      return null;
    const target = this.score.targetRuns || 0;
    if (!target)
      return { type: 'COMPLETE', headline: 'MATCH COMPLETE', detail: 'Final innings completed.' };
    if (this.score.runs >= target) {
      const wicketsLeft = Math.max(0, 10 - this.score.wickets);
      return {
        type: 'CHASE_WIN',
        headline: `WON BY ${wicketsLeft} WICKET${wicketsLeft === 1 ? '' : 'S'}`,
        detail: `${this.battingName} chased ${target} with ${this.ballsRemaining ?? 0} balls remaining.`,
      };
    }
    if (this.score.runs === target - 1) {
      return {
        type: 'TIE',
        headline: 'MATCH TIED',
        detail: 'Both teams finished on the same score.',
      };
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
    if (!this.canDeliver) return this.validationHint;
    if (['RUN_OUT', 'OBSTRUCTING_THE_FIELD'].includes(this.wicketType) && !this.dismissedPlayerId)
      return 'Choose which batter was dismissed.';
    if (!Number.isInteger(this.wicketRuns) || this.wicketRuns < 0 || this.wicketRuns > 6)
      return 'Select a valid number of completed runs.';
    if (this.score && this.score.wickets < 9 && !this.newBatterId)
      return 'Select the incoming batter.';
    return 'Wicket details are ready to record.';
  }

  get canConfirmWicket() {
    if (!this.canDeliver || !this.wicketType) return false;
    if (!this.wicketOptions.some((option) => option.value === this.wicketType)) return false;
    if (!Number.isInteger(this.wicketRuns) || this.wicketRuns < 0 || this.wicketRuns > 6)
      return false;
    if (['RUN_OUT', 'OBSTRUCTING_THE_FIELD'].includes(this.wicketType) && !this.dismissedPlayerId)
      return false;
    return this.score?.wickets === 9 || !!this.newBatterId;
  }

  get timelineBalls() {
    // Keep the newest event visible in the compact, horizontally clipped timeline.
    // The API returns oldest-to-newest, so reverse a copy for this presentation only.
    return [...(this.score?.recentBalls || [])].reverse();
  }

  get currentOverBalls() {
    if (!this.score) return [];
    const recent = this.score.recentBalls || [];
    if (!recent.length) return [];

    // At an over boundary, keep showing the over that just finished. As soon
    // as the first delivery of the next over (including a wide/no-ball) arrives,
    // the latest delivery's over number naturally switches this strip forward.
    const currentOver = recent[recent.length - 1].overNumber;
    return (
      recent
        .filter((ball) => ball.overNumber === currentOver)
        // API order is chronological: ball 1 stays on the left, latest on the right.
        .map((ball) => this.ballToken(ball))
    );
  }

  private async restoreOfflineSession(): Promise<void> {
    try {
      const session = await this.offlineStore.loadSession<any>(this.matchId);
      if (!session?.inningsId || !session.match)
        throw new Error('No saved scoring session exists on this device.');
      this.match = session.match;
      this.xi = session.xi || [];
      this.inningsId = session.inningsId;
      this.inningsNumber = session.inningsNumber || 1;
      this.battingTeamId = session.battingTeamId || '';
      this.bowlingTeamId = session.bowlingTeamId || '';
      const savedBowlerId = session.selectedBowlerId || '';
      await this.restoreOfflineScore();
      if (savedBowlerId && this.needsBowlerChange) {
        this.selectedBowlerId = savedBowlerId;
        if (this.score) this.publishLocalObsScore(this.score);
      }
    } catch (error: any) {
      this.loading = false;
      this.connectionState = 'OFFLINE';
      this.syncState = 'ERROR';
      this.message = error?.message || 'Could not restore the saved offline scoring session.';
    }
  }

  // prettier-ignore
  private async restoreOfflineScore(): Promise<void> {
    try {
      const snapshot = await this.offlineStore.loadSnapshot(this.inningsId);
      if (!snapshot) {
        throw new Error('No saved score snapshot exists. Connect to the internet before scoring.');
      }
      if (snapshot.matchId !== this.matchId || snapshot.inningsId !== this.inningsId) {
        throw new Error('The saved score snapshot belongs to a different match or innings. Offline recovery is blocked.');
      }

      this.offlineSnapshotReady = true;
      let projected = snapshot;
      await this.offlineStore.bindLegacyQueueToMatch(this.inningsId, this.matchId);
      const queue = await this.offlineStore.list(this.inningsId);
      this.setOfflineQueueDiagnostics(queue);
      this.offlineQueueBlocked = queue.some((item) => item.syncStatus === 'BLOCKED');
      this.pendingOfflineCount = queue.length;

      // Detect a forked multi-device queue before any command is replayed.
      // This avoids partially syncing one branch and then discovering the other.
      if (hasOfflineQueuePositionConflict(queue)) {
        await this.blockOfflineQueue(
          'Multiple devices recorded different legal deliveries at the same ball position. Reconcile the score on the scorer device before syncing.',
        );
        return;
      }

      for (const item of queue) {
        try {
          const identityError = offlineQueueIdentityError(item, this.matchId, this.inningsId);
          if (identityError) throw new Error(identityError);
          projected = projectOfflineDelivery(projected, item);
        } catch (error: any) {
          this.offlineQueueBlocked = true;
          this.syncState = 'ERROR';
          this.message =
            error?.message ||
            'Saved offline deliveries need reconciliation. Pending deliveries were retained.';
          break;
        }
      }

      this.applyScore(projected);
      this.connectionState = navigator.onLine ? 'RECONNECTING' : 'OFFLINE';
      if (this.offlineQueueBlocked) {
        await this.offlineStore.markInningsQueueBlocked(this.inningsId).catch(() => undefined);
        this.syncState = 'ERROR';
        if (!this.message) {
          this.message =
            'Offline sync is paused. Pending deliveries are retained until the innings is reconciled.';
        }
      } else {
        this.syncState = queue.length ? 'QUEUED' : 'SYNCED';
        this.message = queue.length
          ? `${queue.length} saved offline delivery/deliveries restored on this device.`
          : 'Saved score restored. New deliveries will be stored locally until internet returns.';
      }
      this.loading = false;
      // The online event may have fired before the saved innings was restored.
      // Re-check connectivity now that inningsId and the pending queue are ready.
      if (navigator.onLine && !this.offlineQueueBlocked) {
        this.handleReconnect();
      }
    } catch (error: any) {
      this.loading = false;
      this.connectionState = navigator.onLine ? 'RECONNECTING' : 'OFFLINE';
      this.syncState = 'ERROR';
      this.message = error?.message || 'Could not restore offline score data.';
    }
  }

  onBowlerSelected(bowlerId: string): void {
    if (!this.canChangeBowler) return;
    if (!this.bowlerOptions.some((option) => option.value === bowlerId)) return;
    this.selectedBowlerId = bowlerId;
    // The server score cannot be changed while offline, but OBS must reflect
    // the locally selected next-over bowler immediately.
    if (this.score) this.publishLocalObsScore(this.score);
    void this.offlineStore
      .saveSession(this.matchId, {
        match: this.match,
        xi: this.xi,
        inningsId: this.inningsId,
        inningsNumber: this.inningsNumber,
        battingTeamId: this.battingTeamId,
        bowlingTeamId: this.bowlingTeamId,
        selectedBowlerId: bowlerId,
      })
      .catch(() => {
        this.message =
          'Bowler selection could not be saved for offline recovery. Please select again.';
        this.syncState = 'ERROR';
      });
  }

  private load() {
    if (!this.matchId) {
      this.loading = false;
      this.message = 'Match ID is missing.';
      return;
    }
    if (!navigator.onLine) {
      void this.restoreOfflineSession();
      return;
    }
    this.http.get<Match>(`${this.api}/matches/${this.matchId}`).subscribe({
      next: (m) => {
        this.match = m;
        this.loadXi();
      },
      error: (e) => {
        if (!navigator.onLine || e?.status === 0) {
          void this.restoreOfflineSession();
          return;
        }
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
        if (!navigator.onLine || e?.status === 0) {
          void this.restoreOfflineSession();
          return;
        }
        this.loading = false;
        this.message = e?.error?.message || 'Unable to load Playing XI.';
      },
    });
  }

  private loadInnings() {
    this.http.get<any>(`${this.api}/matches/${this.matchId}/current-innings`).subscribe({
      next: (raw) => {
        const i = this.unwrapApiPayload<any>(raw);
        this.inningsId = i?.id || i?.inningsId || i?.innings_id || '';
        if (!this.inningsId) {
          this.loading = false;
          this.syncState = 'ERROR';
          this.message =
            'Current innings response did not include an innings ID. Check the current-innings API response.';
          return;
        }
        this.inningsNumber = i.inningsNumber || i.innings_number || 1;
        this.battingTeamId = i.battingTeamId || '';
        this.bowlingTeamId = i.bowlingTeamId || '';
        this.normalizeTeamIds();
        void this.offlineStore
          .saveSession(this.matchId, {
            match: this.match,
            xi: this.xi,
            inningsId: this.inningsId,
            inningsNumber: this.inningsNumber,
            battingTeamId: this.battingTeamId,
            bowlingTeamId: this.bowlingTeamId,
          })
          .catch(() => undefined);
        this.loadScoreById(this.inningsId, true);
        this.connectLiveSocket(this.inningsId);
      },
      error: (e) => {
        if (!navigator.onLine || e?.status === 0) {
          void this.restoreOfflineSession();
          return;
        }
        this.loading = false;
        this.message =
          e?.status === 404
            ? 'No current innings found.'
            : e?.error?.message || 'Unable to load current innings.';
      },
    });
  }

  private unwrapApiPayload<T>(raw: any): T {
    let value = raw;
    for (let depth = 0; depth < 3; depth++) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) break;
      const nested = value.data ?? value.result ?? value.innings ?? value.score;
      if (!nested || typeof nested !== 'object') break;
      value = nested;
    }
    return value as T;
  }

  retrySessionLoad() {
    if (!this.matchId) {
      this.matchId =
        this.route.snapshot.paramMap.get('id') ||
        this.route.parent?.snapshot.paramMap.get('id') ||
        this.route.pathFromRoot
          .map((route) => route.snapshot.paramMap.get('id'))
          .find((id): id is string => !!id) ||
        '';
    }
    this.loading = true;
    this.message = '';
    this.syncState = 'SYNCED';
    this.score = null;
    this.load();
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

  private connectLiveSocket(inningsId: string) {
    if (!inningsId) return;
    this.liveSocket.connect(inningsId, (payload) => {
      const score = payload as LiveScore;
      if (!score?.inningsId || this.busy) return;
      if (this.pendingOfflineCount > 0) {
        this.syncState = 'ERROR';
        this.message =
          'A live update arrived while offline deliveries are pending. Reconnect to reconcile before continuing.';
        return;
      }
      this.reconcileScore(score, true);
    });
  }

  private handleReconnect() {
    if (!navigator.onLine || !this.inningsId) return;
    this.connectionState = 'RECONNECTING';
    void this.checkBackendConnectivity();
  }

  // navigator.onLine only reports browser network availability. Probe the actual
  // CricPulse API so Wi-Fi without backend access is never shown as ONLINE.
  private async checkBackendConnectivity(): Promise<void> {
    if (this.destroyed || !navigator.onLine || !this.matchId || this.connectivityProbeInFlight) {
      if (!navigator.onLine) this.connectionState = 'OFFLINE';
      return;
    }

    this.connectivityProbeInFlight = true;
    try {
      await firstValueFrom(
        this.http.get<any>(`${this.api}/matches/${this.matchId}`).pipe(timeout({ first: 4000 })),
      );
      this.connectionState = 'ONLINE';
      if (this.inningsId && this.socketState !== 'CONNECTED' && this.socketState !== 'CONNECTING') {
        this.connectLiveSocket(this.inningsId);
      }
      if (this.inningsId && !this.flushingOfflineQueue) {
        const queue = await this.offlineStore.list(this.inningsId);
        this.pendingOfflineCount = queue.length;
        if (queue.some((item) => item.syncStatus !== 'BLOCKED')) {
          await this.resumePendingOfflineSync();
        }
      }
    } catch (error: any) {
      // Any HTTP response (including 401/403/404) proves the API is reachable.
      // Status 0 and timeout indicate that the backend cannot be reached.
      if (Number(error?.status) > 0) {
        this.connectionState = 'ONLINE';
        if (this.inningsId && !this.flushingOfflineQueue) {
          const queue = await this.offlineStore.list(this.inningsId);
          this.pendingOfflineCount = queue.length;
          if (queue.some((item) => item.syncStatus !== 'BLOCKED')) {
            await this.resumePendingOfflineSync();
          }
        }
      } else {
        this.connectionState = 'OFFLINE';
      }
    } finally {
      this.connectivityProbeInFlight = false;
    }
  }

  private scheduleOfflineSyncRetry(): void {
    if (this.destroyed || !navigator.onLine || !this.inningsId || this.offlineSyncRetryTimer)
      return;
    const delay = this.offlineSyncRetryDelay;
    this.offlineSyncRetryDelay = Math.min(this.offlineSyncRetryDelay * 2, 30000);
    this.offlineSyncRetryTimer = setTimeout(() => {
      this.offlineSyncRetryTimer = undefined;
      if (navigator.onLine) void this.resumePendingOfflineSync();
    }, delay);
  }

  private async resumePendingOfflineSync(): Promise<void> {
    if (
      !navigator.onLine ||
      !this.inningsId ||
      this.flushingOfflineQueue ||
      this.offlineQueueBlocked
    )
      return;
    try {
      await this.offlineStore.bindLegacyQueueToMatch(this.inningsId, this.matchId);
      const queue = await this.offlineStore.list(this.inningsId);
      this.pendingOfflineCount = queue.length;
      if (!queue.length) {
        this.syncState = 'SYNCED';
        this.offlineSyncRetryDelay = 3000;
        return;
      }
      const raw = await firstValueFrom(
        this.http.get<any>(`${this.api}/scoring/innings/${this.inningsId}`),
      );
      const payload = this.unwrapApiPayload<any>(raw);
      const authoritative = {
        ...payload,
        inningsId: payload?.inningsId || payload?.innings_id || payload?.id || this.inningsId,
      } as LiveScore;
      if (
        !payload ||
        typeof payload !== 'object' ||
        !authoritative.inningsId ||
        !Number.isFinite(authoritative.legalBalls) ||
        authoritative.matchId !== this.matchId ||
        authoritative.inningsId !== this.inningsId
      ) {
        throw new Error(
          'Server returned an invalid innings score; queued deliveries were retained.',
        );
      }
      this.scoreFingerprint = '';
      this.reconcileScore(authoritative, true);
      await this.offlineStore.saveSnapshot(authoritative);
      await this.flushOfflineQueue();
    } catch (error: any) {
      this.syncState = 'QUEUED';
      this.message =
        error?.error?.message ||
        error?.message ||
        'Server is temporarily unavailable. Offline deliveries remain saved and will retry automatically.';
      this.scheduleOfflineSyncRetry();
    }
  }

  private loadCorrectionAudit(): void {
    if (!this.inningsId || !navigator.onLine) return;
    this.http.get<any>(`${this.api}/scoring/audit/innings/${this.inningsId}`).subscribe({
      next: (response) => {
        const audit = this.unwrapApiPayload<any>(response);
        this.correctionAudit = Array.isArray(audit?.corrections) ? audit.corrections : [];
      },
    });
  }

  private async acquireScorerLease(): Promise<void> {
    if (!navigator.onLine || !this.inningsId) return;
    try {
      const storageKey = `cricpulse-scorer-lease:${this.inningsId}`;
      this.scorerLeaseToken = sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, this.scorerLeaseToken);
      await firstValueFrom(
        this.http.post(`${this.api}/scoring/innings/${this.inningsId}/lease`, {
          leaseToken: this.scorerLeaseToken,
        }),
      );
      this.scorerLeaseReady = true;
      if (this.scorerLeaseRenewalTimer) clearInterval(this.scorerLeaseRenewalTimer);
      this.scorerLeaseRenewalTimer = setInterval(() => {
        if (!navigator.onLine || !this.inningsId || !this.scorerLeaseToken) return;
        void firstValueFrom(
          this.http.put(`${this.api}/scoring/innings/${this.inningsId}/lease`, {
            leaseToken: this.scorerLeaseToken,
          }),
        ).catch((error) => {
          this.scorerLeaseReady = false;
          this.message =
            error?.error?.message ||
            'Scoring lease lost. Another scorer may have taken control; refresh before continuing.';
          this.syncState = 'ERROR';
        });
      }, 8000);
    } catch (error: any) {
      this.scorerLeaseReady = false;
      this.message =
        error?.error?.message ||
        'Another scorer currently controls this innings. This device is read-only until the lease is available.';
      this.syncState = 'ERROR';
      throw error;
    }
  }

  private loadScoreById(id: string, silent = false) {
    if (!id) {
      this.loading = false;
      this.message = 'Current innings ID is missing.';
      return;
    }
    this.inningsId = id;
    this.http.get<any>(`${this.api}/scoring/innings/${id}`).subscribe({
      next: (raw) => {
        const payload = this.unwrapApiPayload<any>(raw);
        const s = {
          ...payload,
          inningsId: payload?.inningsId || payload?.innings_id || payload?.id || id,
        } as LiveScore;
        if (!payload || typeof payload !== 'object') {
          this.loading = false;
          this.syncState = 'ERROR';
          this.message = 'Live score API returned an empty or invalid response.';
          return;
        }
        this.socketRecoveryInFlight = false;
        this.reconcileScore(s, silent);
        this.persistOfflineSnapshot(s);
        this.loadCorrectionAudit();
        if (navigator.onLine) void this.acquireScorerLease().catch(() => undefined);
        void this.refreshPendingOfflineCount();
        if (this.syncState === 'SAVING') this.syncState = 'SYNCED';
        if (navigator.onLine) void this.flushOfflineQueue();
        if (!this.refreshTimer && this.score?.status === 'LIVE') {
          this.refreshTimer = setInterval(() => this.loadScoreById(this.inningsId, true), 15000);
        }
        this.loading = false;
      },
      error: (e) => {
        this.socketRecoveryInFlight = false;
        this.loading = false;
        if (!navigator.onLine || e?.status === 0) {
          void this.restoreOfflineScore();
          return;
        }
        this.syncState = 'ERROR';
        this.message = e?.error?.message || 'Unable to load live score.';
      },
    });
  }

  private reconcileScore(s: LiveScore, silent = false) {
    if (!s || !s.inningsId) {
      if (!silent) this.message = 'Live score response is incomplete.';
      return;
    }
    const nextFingerprint = JSON.stringify({
      inningsId: s.inningsId,
      eventVersion: (s as any).eventVersion,
      runs: s.runs,
      wickets: s.wickets,
      legalBalls: s.legalBalls,
      status: s.status,
      strikerId: s.strikerId,
      nonStrikerId: s.nonStrikerId,
      currentBowlerId: s.currentBowlerId,
      latestDeliveryId: (s.recentBalls || []).at(-1)?.deliveryId,
    });
    if (nextFingerprint === this.scoreFingerprint) return;
    const hadScore = !!this.scoreFingerprint;
    this.reconciling = true;
    this.scoreFingerprint = nextFingerprint;
    this.applyScore(s);
    this.persistOfflineSnapshot(s);
    this.lastSyncedAt = new Date();
    if (silent && hadScore && !this.busy) {
      this.externalUpdateNotice =
        'The scorer has been refreshed with the latest authoritative match state.';
    }
    this.reconciling = false;
  }

  private applyScore(s: LiveScore) {
    if (!s || !s.inningsId) {
      this.message = 'Live score response is incomplete.';
      return;
    }
    this.score = s;
    // Keep OBS Browser Sources on this origin updated from the scorer's local
    // projection while the network is unavailable. The server remains the
    // source of truth for reconnect reconciliation.
    this.publishLocalObsScore(s);
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

  private connectLocalObsRelay(): void {
    if (this.destroyed || typeof WebSocket === 'undefined') return;
    try {
      const socket = new WebSocket('ws://127.0.0.1:8765/ws');
      this.localRelaySocket = socket;
      socket.onopen = () => {
        if (this.localRelaySocket !== socket || this.destroyed) return;
        this.localRelayReconnectDelay = 1000;
        if (this.score) this.publishLocalObsScore(this.score);
      };
      socket.onclose = () => {
        if (this.localRelaySocket !== socket) return;
        this.localRelaySocket = undefined;
        this.scheduleLocalObsRelayReconnect();
      };
      socket.onerror = () => socket.close();
    } catch {
      this.scheduleLocalObsRelayReconnect();
    }
  }

  private scheduleLocalObsRelayReconnect(): void {
    if (this.destroyed || this.localRelayReconnectTimer) return;
    const delay = this.localRelayReconnectDelay;
    this.localRelayReconnectDelay = Math.min(this.localRelayReconnectDelay * 2, 15000);
    this.localRelayReconnectTimer = setTimeout(() => {
      this.localRelayReconnectTimer = undefined;
      this.connectLocalObsRelay();
    }, delay);
  }

  private publishLocalObsScore(score: LiveScore): void {
    const selectedBowlerId = this.activeBowlerId;
    const selectedBowler = this.xi.find((player) => player.playerId === selectedBowlerId);
    const overlayScore: LiveScore = selectedBowlerId
      ? {
          ...score,
          currentBowlerId: selectedBowlerId,
          currentBowlerName: selectedBowler?.name || score.currentBowlerName || null,
          bowlers: [
            ...(score.bowlers || []).filter((bowler) => bowler.playerId !== selectedBowlerId),
            {
              ...(score.bowlers || []).find((bowler) => bowler.playerId === selectedBowlerId),
              playerId: selectedBowlerId,
              playerName: selectedBowler?.name || score.currentBowlerName || 'Current Bowler',
              legalBalls:
                (score.bowlers || []).find((bowler) => bowler.playerId === selectedBowlerId)
                  ?.legalBalls ?? 0,
              runsConceded:
                (score.bowlers || []).find((bowler) => bowler.playerId === selectedBowlerId)
                  ?.runsConceded ?? 0,
              wickets:
                (score.bowlers || []).find((bowler) => bowler.playerId === selectedBowlerId)
                  ?.wickets ?? 0,
              wides:
                (score.bowlers || []).find((bowler) => bowler.playerId === selectedBowlerId)
                  ?.wides ?? 0,
              noBalls:
                (score.bowlers || []).find((bowler) => bowler.playerId === selectedBowlerId)
                  ?.noBalls ?? 0,
            },
          ],
        }
      : score;
    // Offline wicket projection changes player IDs locally. Resolve those IDs
    // against the cached XI before publishing so OBS never keeps the dismissed
    // batter's stale name (the server is intentionally not contacted offline).
    const playerName = (playerId: string | null | undefined) =>
      this.xi.find((player) => player.playerId === playerId)?.name || null;
    const namedOverlayScore: LiveScore = {
      ...overlayScore,
      strikerName: playerName(overlayScore.strikerId) || overlayScore.strikerName || null,
      nonStrikerName: playerName(overlayScore.nonStrikerId) || overlayScore.nonStrikerName || null,
      batters: (overlayScore.batters || []).map((batter) => ({
        ...batter,
        playerName: playerName(batter.playerId) || batter.playerName || null,
      })),
    };
    const message = {
      source: 'cricpulse-scorer',
      matchId: this.matchId,
      inningsId: score.inningsId,
      score: namedOverlayScore,
      match: this.match,
      battingTeamId: this.battingTeamId,
      bowlingTeamId: this.bowlingTeamId,
      sentAt: Date.now(),
    };
    this.scoreBroadcastChannel?.postMessage(message);
    if (this.localRelaySocket?.readyState === WebSocket.OPEN) {
      this.localRelaySocket.send(JSON.stringify(message));
    }
  }

  private async refreshPendingOfflineCount(): Promise<void> {
    if (!this.inningsId) return;
    try {
      this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
      if (this.pendingOfflineCount > 0 && this.syncState !== 'ERROR') this.syncState = 'QUEUED';
    } catch {
      this.message =
        'Offline queue could not be inspected. Do not continue scoring until storage is available.';
      this.syncState = 'ERROR';
    }
  }

  // prettier-ignore
  private isDeliveryAlreadyRecorded(item: QueuedDelivery, score: LiveScore): boolean {
    const payload = item.payload;
    return (score.recentBalls || []).some((ball) =>
      offlineDeliveryMatchesRecentBall(item, ball),
    );
  }

  // prettier-ignore
  private setOfflineQueueDiagnostics(queue: QueuedDelivery[]): void {
    const diagnostics = buildOfflineQueueDiagnostics(queue, this.matchId, this.inningsId);
    this.offlineConflictPositions = diagnostics.conflictPositions;
    this.offlineQueueDiagnostics = diagnostics.items;
    this.offlineRecoveryReport = diagnostics.report;
  }

  async copyOfflineRecoveryReport(): Promise<void> {
    if (!this.offlineRecoveryReport) {
      this.message = 'Offline queue report is not available yet.';
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(this.offlineRecoveryReport);
      this.message = 'Offline recovery report copied. Pending deliveries remain unchanged.';
    } catch {
      this.message =
        'Copy failed. Review the conflict details below; pending deliveries remain unchanged.';
    }
  }

  private async blockOfflineQueue(message: string): Promise<void> {
    this.offlineQueueBlocked = true;
    this.syncState = 'ERROR';
    await this.offlineStore.markInningsQueueBlocked(this.inningsId).catch(() => undefined);
    const queue = await this.offlineStore.list(this.inningsId).catch(() => [] as QueuedDelivery[]);
    this.pendingOfflineCount = queue.length || this.pendingOfflineCount;
    this.setOfflineQueueDiagnostics(queue);
    this.message = `${message} Offline sync is paused. Pending deliveries have been retained; do not clear them.`;
  }

  // prettier-ignore
  private async flushOfflineQueue(): Promise<void> {
    if (
      this.flushingOfflineQueue ||
      this.offlineQueueBlocked ||
      !navigator.onLine ||
      !this.inningsId
    ) {
      return;
    }

    this.flushingOfflineQueue = true;
    try {
      // Always start from the server's latest state. Never replay against a stale
      // local snapshot after another scorer may have advanced the innings.
      let authoritative = this.unwrapApiPayload<LiveScore>(
        await firstValueFrom(
          this.http.get<any>(`${this.api}/scoring/innings/${this.inningsId}`),
        ),
      );
      await this.acquireScorerLease();
      this.applyScore(authoritative);
      await this.offlineStore.bindLegacyQueueToMatch(this.inningsId, this.matchId);
      const queue = await this.offlineStore.list(this.inningsId);
      this.pendingOfflineCount = queue.length;
      this.setOfflineQueueDiagnostics(queue);
      if (this.offlineConflictPositions.length) {
        await this.blockOfflineQueue(
          `Conflicting offline deliveries detected at legal-ball position(s) ${this.offlineConflictPositions.join(', ')}.`,
        );
        return;
      }

      for (const item of queue) {
        const identityError = offlineQueueIdentityError(item, this.matchId, this.inningsId);
        if (identityError) {
          await this.blockOfflineQueue(identityError);
          return;
        }
        if (authoritative.matchId && authoritative.matchId !== this.matchId) {
          await this.blockOfflineQueue('The server score belongs to a different match.');
          return;
        }
        const expectedOver = Math.floor(authoritative.legalBalls / 6);
        const expectedBall = (authoritative.legalBalls % 6) + 1;
        const position = item.payload.overNumber * 6 + item.payload.ballNumber;
        const expectedPosition = expectedOver * 6 + expectedBall;

        if (position < expectedPosition) {
          // The server has advanced past this queued position. First compare the
          // authoritative recent-ball record with the queued payload. Older app
          // versions may have committed the delivery before command-id event
          // tracking was available, so a replay can return "position already
          // recorded" even though this exact delivery is already on the server.
          if (this.isDeliveryAlreadyRecorded(item, authoritative)) {
            await this.offlineStore.acknowledgeDelivery(item.commandId, authoritative);
            this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
            continue;
          }

          // If it is not present in the recent authoritative deliveries, retry
          // the original idempotency key. Never infer success from totals alone.
          try {
            authoritative = this.unwrapApiPayload<LiveScore>(
              await firstValueFrom(
                this.http.post<any>(
                  `${this.api}/scoring/innings/${this.inningsId}/deliveries`,
                  item.payload,
                  {
                    headers: new HttpHeaders(scoringDeliveryHeaders(item.commandId, this.scorerLeaseToken)),
                  },
                ),
              ),
            );
            await this.offlineStore.acknowledgeDelivery(item.commandId, authoritative);
            this.applyScore(authoritative);
            this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
            continue;
          } catch (error: any) {
            // Reconcile before deciding whether the response was lost after commit.
            try {
              const latest = this.unwrapApiPayload<LiveScore>(
                await firstValueFrom(
                  this.http.get<any>(`${this.api}/scoring/innings/${this.inningsId}`),
                ),
              );
              if (this.isDeliveryAlreadyRecorded(item, latest)) {
                authoritative = latest;
                await this.offlineStore.acknowledgeDelivery(item.commandId, latest);
                this.applyScore(latest);
                this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
                continue;
              }
              authoritative = latest;
              this.applyScore(latest);
            } catch {
              // Preserve the queued command if the authoritative score is unavailable.
            }
            const serverMessage = error?.error?.message || error?.message;
            if (isTransientOfflineSyncStatus(error?.status)) {
              this.syncState = 'QUEUED';
              this.message =
                serverMessage ||
                'Temporary sync failure. The delivery is retained and will retry automatically.';
              this.scheduleOfflineSyncRetry();
              return;
            }
            await this.blockOfflineQueue(
              serverMessage ||
                `Offline delivery ${item.payload.overNumber + 1}.${item.payload.ballNumber} could not be verified by its command ID.`,
            );
            return;
          }
        }

        if (position > expectedPosition) {
          await this.blockOfflineQueue(
            `There is a gap before offline delivery ${item.payload.overNumber + 1}.${item.payload.ballNumber}. The saved deliveries were not sent.`,
          );
          return;
        }

        if (
          item.payload.strikerId !== authoritative.strikerId ||
          item.payload.nonStrikerId !== authoritative.nonStrikerId
        ) {
          await this.blockOfflineQueue(
            'The active batters changed on the server before the pending offline delivery.',
          );
          return;
        }

        try {
          authoritative = this.unwrapApiPayload<LiveScore>(
            await firstValueFrom(
              this.http.post<any>(
                `${this.api}/scoring/innings/${this.inningsId}/deliveries`,
                item.payload,
                { headers: new HttpHeaders(scoringDeliveryHeaders(item.commandId, this.scorerLeaseToken)) },
              ),
            ),
          );
          await this.offlineStore.acknowledgeDelivery(item.commandId, authoritative);
          this.applyScore(authoritative);
          this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
        } catch (error: any) {
          // Re-fetch before deciding whether the request failed or committed but
          // its response was lost. The stable command id remains safe to retry.
          try {
            const latest = this.unwrapApiPayload<LiveScore>(
              await firstValueFrom(
                this.http.get<any>(`${this.api}/scoring/innings/${this.inningsId}`),
              ),
            );
            if (this.isDeliveryAlreadyRecorded(item, latest)) {
              authoritative = latest;
              await this.offlineStore.acknowledgeDelivery(item.commandId, latest);
              this.applyScore(latest);
              this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
              continue;
            }
            authoritative = latest;
            this.applyScore(latest);
          } catch {
            // Keep the command in IndexedDB; the next reconnect can safely retry it.
          }
          const serverMessage = error?.error?.message || error?.message;
          const status = Number(error?.status ?? 0);
          // Network loss, throttling and server failures are transient. Keep the
          // command PENDING and retry automatically; only domain/client errors
          // should pause the queue for explicit reconciliation.
          if (isTransientOfflineSyncStatus(status)) {
            this.syncState = 'QUEUED';
            this.message = serverMessage || 'Temporary sync failure. The delivery is retained and will retry automatically.';
            this.scheduleOfflineSyncRetry();
            return;
          }
          await this.blockOfflineQueue(
            serverMessage || 'The server rejected an offline delivery. Pending deliveries were retained.',
          );
          return;
        }
      }

      this.syncState = this.pendingOfflineCount ? 'QUEUED' : 'SYNCED';
      if (this.pendingOfflineCount) {
        this.message = `${this.pendingOfflineCount} offline delivery/deliveries remain queued.`;
        this.scheduleOfflineSyncRetry();
      } else {
        this.message = 'All offline deliveries synced successfully.';
        this.offlineSyncRetryDelay = 3000;
        if (this.offlineSyncRetryTimer) clearTimeout(this.offlineSyncRetryTimer);
        this.offlineSyncRetryTimer = undefined;
      }
    } catch (error: any) {
      this.syncState = 'QUEUED';
      this.message = error?.error?.message || error?.message || 'Server is temporarily unavailable. Offline deliveries remain saved and will retry automatically.';
      this.scheduleOfflineSyncRetry();
    } finally {
      this.flushingOfflineQueue = false;
    }
  }

  private persistOfflineSnapshot(score: LiveScore): void {
    void this.offlineStore
      .saveSnapshot(score)
      .then(() => {
        this.offlineSnapshotReady = true;
      })
      .catch(() => {
        this.offlineSnapshotReady = false;
      });
  }

  private reloadScoreAfterDelivery() {
    this.loadScoreById(this.inningsId);
  }

  // prettier-ignore
  async retryOfflineSync(): Promise<void> {
    if (!this.inningsId || !navigator.onLine || this.flushingOfflineQueue) return;
    this.message = 'Refreshing the server score and checking saved offline deliveries…';
    this.offlineQueueBlocked = false;
    this.syncState = 'SAVING';
    try {
      await this.offlineStore.markInningsQueuePending(this.inningsId);
      this.scoreFingerprint = '';
      await this.resumePendingOfflineSync();
    } catch (error: any) {
      this.offlineQueueBlocked = true;
      this.syncState = 'ERROR';
      this.message = error?.message || 'Could not resume the saved offline queue.';
    }
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

  refreshAuthoritativeState() {
    if (this.busy || !this.inningsId) return;
    this.message = '';
    this.syncState = 'SAVING';
    this.loadScoreById(this.inningsId);
  }

  private showDeliveryFeedback(body: any) {
    let feedback: {
      type: 'run' | 'four' | 'six' | 'wicket' | 'extra';
      label: string;
      detail: string;
    };
    if (body.wicketType) {
      feedback = { type: 'wicket', label: 'WICKET', detail: body.wicketType.replace('_', ' ') };
    } else if (body.extraType) {
      feedback = {
        type: 'extra',
        label:
          body.extraType === 'WIDE'
            ? 'WIDE'
            : body.extraType === 'NO_BALL'
              ? 'NO BALL'
              : body.extraType.replace('_', ' '),
        detail: `+${(body.extraRuns || 0) + (body.batRuns || 0)} RUNS`,
      };
    } else if (body.batRuns === 6) {
      feedback = { type: 'six', label: 'SIX', detail: 'Maximum impact' };
    } else if (body.batRuns === 4) {
      feedback = { type: 'four', label: 'FOUR', detail: 'Boundary scored' };
    } else {
      feedback = {
        type: 'run',
        label: `${body.batRuns || 0} RUN${body.batRuns === 1 ? '' : 'S'}`,
        detail: 'Delivery recorded',
      };
    }
    this.deliveryFeedback = feedback;
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => (this.deliveryFeedback = null), 1200);
  }

  private deliveryValidationError(body: any): string | null {
    if (!this.score || !this.inningsId) return 'Live innings is not ready.';
    if (!this.canDeliver) return this.validationHint;
    if (!Number.isInteger(body?.batRuns) || body.batRuns < 0 || body.batRuns > 6)
      return 'Bat runs must be a whole number from 0 to 6.';
    if (!Number.isInteger(body?.extraRuns) || body.extraRuns < 0 || body.extraRuns > 7)
      return 'Extra runs must be a whole number from 0 to 7.';
    if (body?.extraType && !['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'].includes(body.extraType))
      return 'Unsupported extra type.';
    if (body?.wicketType && !this.wicketOptions.some((option) => option.value === body.wicketType))
      return 'Unsupported wicket type.';
    if (body?.wicketType && body?.extraType)
      return 'A delivery cannot record an extra and wicket event together in this scorer flow.';
    if (body?.wicketType && this.score.wickets >= 10) return 'All wickets are already down.';
    if (
      body?.extraType === 'NO_BALL' &&
      (!Number.isInteger(body.extraBatRuns ?? body.batRuns) ||
        (body.extraBatRuns ?? body.batRuns) < 0 ||
        (body.extraBatRuns ?? body.batRuns) > 6)
    )
      return 'No-ball bat runs must be a whole number from 0 to 6.';
    return null;
  }

  private postDelivery(body: any, isRetry = false) {
    const validationError = this.deliveryValidationError(body);
    if (validationError) {
      this.syncState = 'ERROR';
      this.message = validationError;
      return;
    }

    this.lastDeliveryPayload = { ...body };
    if (!isRetry || !this.pendingDeliveryCommandId) {
      this.pendingDeliveryCommandId = crypto.randomUUID();
    }
    const commandId = this.pendingDeliveryCommandId;
    const payload = {
      inningsId: this.inningsId,
      overNumber: Math.floor((this.score!.legalBalls || 0) / 6),
      ballNumber: ((this.score!.legalBalls || 0) % 6) + 1,
      strikerId: this.score!.strikerId!,
      nonStrikerId: this.score!.nonStrikerId!,
      bowlerId: this.activeBowlerId,
      ...body,
    };
    if (!navigator.onLine || this.connectionState === 'OFFLINE') {
      if (!this.offlineSnapshotReady) {
        this.syncState = 'ERROR';
        this.message =
          'The confirmed score has not been saved for offline recovery. Connect and retry after storage is ready.';
        return;
      }
      const queued: QueuedDelivery = {
        commandId,
        matchId: this.matchId,
        inningsId: this.inningsId,
        createdAt: Date.now(),
        payload,
      };
      this.busy = true;
      const projected = this.score ? projectOfflineDelivery(this.score, queued) : null;
      if (!projected) {
        this.busy = false;
        this.syncState = 'ERROR';
        this.message = 'The current score cannot be projected safely while offline.';
        return;
      }
      this.offlineStore
        .enqueue(queued)
        .then(async () => {
          // Publish the local projection immediately so same-origin overlay
          // contexts receive the offline score, not only the scorer component.
          this.applyScore(projected);
          // Keep the snapshot as the last server-confirmed base score.
          // The pending queue is replayed on refresh/restart; persisting the
          // projected score here would replay those same deliveries twice.
          this.pendingDeliveryCommandId = null;
          this.lastDeliveryPayload = null;
          this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
          this.busy = false;
          this.syncState = 'QUEUED';
          this.message = this.offlineSnapshotReady
            ? 'Delivery saved on this device. It will sync when internet returns.'
            : 'Delivery is safely queued, but the latest offline snapshot could not be saved.';
          this.showDeliveryFeedback(body);
        })
        .catch((error) => {
          this.busy = false;
          this.syncState = 'ERROR';
          this.message = error?.message || 'Offline storage failed. This delivery was not saved.';
        });
      return;
    }
    this.busy = true;
    this.syncState = 'SAVING';
    this.lastAction = isRetry
      ? 'Retrying previous action'
      : body.wicketType
        ? 'Wicket recorded'
        : body.extraType
          ? `${body.extraType} recorded`
          : `${body.batRuns} run${body.batRuns === 1 ? '' : 's'} recorded`;
    this.http
      .post<LiveScore>(`${this.api}/scoring/innings/${this.inningsId}/deliveries`, payload, {
        headers: new HttpHeaders({
          'X-Command-Id': commandId,
          'X-Scorer-Lease': this.scorerLeaseToken,
        }),
      })
      .subscribe({
        next: (s) => {
          if (s && s.inningsId) {
            this.applyScore(s);
            this.persistOfflineSnapshot(s);
            this.showDeliveryFeedback(body);
            this.busy = false;
            this.syncState = 'SYNCED';
            this.message = '';
            this.lastDeliveryPayload = null;
            this.pendingDeliveryCommandId = null;
          } else {
            this.reloadScoreAfterDelivery();
            this.busy = false;
            this.syncState = 'SYNCED';
            this.message = '';
          }
        },
        error: (e) => {
          this.busy = false;
          if (Number(e?.status ?? 0) === 0) {
            void this.persistFailedNetworkDelivery(payload, commandId, e);
            return;
          }
          this.syncState = 'ERROR';
          this.message = e?.error?.message || 'Unable to record delivery. Please try again.';
        },
      });
  }

  /**
   * A delivery POST can commit on the server while its response is lost.
   * Persist the same command ID so reconnect replay can safely resolve it
   * through server idempotency instead of asking the scorer to re-enter it.
   */
  private async persistFailedNetworkDelivery(
    payload: QueuedDelivery['payload'],
    commandId: string,
    error: any,
  ): Promise<void> {
    if (!this.score) {
      this.syncState = 'ERROR';
      this.message =
        error?.message ||
        'Network failed and no score is available to safely queue this delivery. Retry the same action.';
      return;
    }
    if (!this.offlineSnapshotReady) {
      try {
        await this.offlineStore.saveSnapshot(this.score);
        this.offlineSnapshotReady = true;
      } catch (storageError: any) {
        this.syncState = 'ERROR';
        this.message =
          storageError?.message ||
          'Offline snapshot could not be saved. Delivery was not queued; retry the same action.';
        return;
      }
    }
    const queued: QueuedDelivery = {
      commandId,
      matchId: this.matchId,
      inningsId: this.inningsId,
      createdAt: Date.now(),
      payload,
    };
    try {
      const projected = projectOfflineDelivery(this.score, queued);
      await this.offlineStore.enqueue(queued);
      this.applyScore(projected);
      this.pendingOfflineCount = await this.offlineStore.count(this.inningsId);
      this.pendingDeliveryCommandId = null;
      this.lastDeliveryPayload = null;
      this.connectionState = 'RECONNECTING';
      this.syncState = 'QUEUED';
      this.message =
        'Connection lost during delivery save. The same command was safely queued and will reconcile on reconnect.';
      this.showDeliveryFeedback(payload);
      void this.checkBackendConnectivity();
    } catch (queueError: any) {
      this.syncState = 'ERROR';
      this.message =
        queueError?.message ||
        'Delivery could not be safely queued. Retry is available with the original command ID.';
    }
  }

  recordRuns(r: number) {
    if (!Number.isInteger(r) || r < 0 || r > 6) {
      this.syncState = 'ERROR';
      this.message = 'Select a valid run value from 0 to 6.';
      return;
    }
    this.postDelivery({
      batRuns: r,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
      legalDelivery: true,
    });
  }

  openExtra(type: string) {
    if (!this.canDeliver || !['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'].includes(type)) return;
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
      dismissedPlayerId: ['RUN_OUT', 'OBSTRUCTING_THE_FIELD'].includes(this.wicketType)
        ? this.dismissedPlayerId
        : this.score.strikerId,
      newBatterId: ten ? null : this.newBatterId,
    });
    this.wicketOpen = false;
  }

  requestUndo() {
    if (
      !this.inningsId ||
      this.busy ||
      this.score?.status !== 'LIVE' ||
      !this.score?.recentBalls?.length
    )
      return;
    this.undoConfirmOpen = true;
  }

  cancelUndo() {
    if (!this.busy) this.undoConfirmOpen = false;
  }

  undo() {
    if (
      !this.inningsId ||
      this.busy ||
      this.score?.status !== 'LIVE' ||
      !this.score?.recentBalls?.length
    )
      return;
    this.undoConfirmOpen = false;
    if (!navigator.onLine || this.connectionState === 'OFFLINE') {
      this.busy = true;
      this.offlineStore
        .list(this.inningsId)
        .then(async (queue) => {
          const latest = queue[queue.length - 1];
          if (latest && offlineQueueIdentityError(latest, this.matchId, this.inningsId)) {
            await this.blockOfflineQueue(
              'The last pending delivery belongs to a different match or innings.',
            );
            this.busy = false;
            return;
          }
          if (!latest) {
            this.busy = false;
            this.syncState = 'ERROR';
            this.message = 'A server-confirmed delivery cannot be undone while offline.';
            return;
          }
          const snapshot = await this.offlineStore.loadSnapshot(this.inningsId);
          if (!snapshot)
            throw new Error('Saved score snapshot is unavailable; offline undo was not applied.');
          const remaining = queue.slice(0, -1);
          let projected = snapshot;
          for (const item of remaining) projected = projectOfflineDelivery(projected, item);
          await this.offlineStore.remove(latest.commandId);
          this.applyScore(projected);
          this.pendingOfflineCount = remaining.length;
          this.busy = false;
          this.syncState = remaining.length ? 'QUEUED' : 'SYNCED';
          this.message = 'Last unsent offline delivery cancelled.';
        })
        .catch((error: any) => {
          this.busy = false;
          this.syncState = 'ERROR';
          this.message = error?.message || 'Could not cancel the pending offline delivery.';
        });
      return;
    }
    this.busy = true;
    this.syncState = 'SAVING';
    this.lastAction = 'Undoing last delivery';
    this.http
      .post<LiveScore>(
        `${this.api}/scoring/innings/${this.inningsId}/undo`,
        {},
        { headers: new HttpHeaders({ 'X-Scorer-Lease': this.scorerLeaseToken }) },
      )
      .subscribe({
        next: (s) => {
          this.applyScore(s);
          this.persistOfflineSnapshot(s);
          this.busy = false;
          this.syncState = 'SYNCED';
          this.lastAction = 'Last delivery undone';
          this.message = '';
          this.externalUpdateNotice =
            'The previous delivery was removed and the live score was resynchronised.';
        },
        error: (e) => {
          this.busy = false;
          this.syncState = 'ERROR';
          this.message =
            e?.status === 403
              ? 'You do not have permission to correct this innings.'
              : e?.status === 409
                ? 'The match changed before the undo completed. Refresh the live state and try again.'
                : e?.error?.message || 'Undo failed. Refresh the live state and try again.';
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
