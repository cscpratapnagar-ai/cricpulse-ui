import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { API_ORIGIN } from '../../../../core/config/api.config';
import { LiveBatter, LiveRecentBall, LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';

interface Match { id: string; name: string; format?: string; status?: string; totalOvers?: number | null; teamAId?: string; teamBId?: string; teamAName?: string; teamBName?: string; currentInningsId?: string | null; winningTeamId?: string | null; resultType?: string | null; resultText?: string | null; }
interface BroadcastInnings { score: LiveScore; battingTeamId?: string; bowlingTeamId?: string; targetRuns?: number | null; declared?: boolean; superOver?: boolean; }
interface BroadcastState { match: Match; innings: BroadcastInnings[]; }
type OverlayMode = 'strip' | 'batter' | 'bowler' | 'partnership' | 'event' | 'auto';
type EventKind = 'FOUR' | 'SIX' | 'WICKET' | 'NEW_BATTER' | 'MILESTONE' | 'OVER_COMPLETE' | 'INNINGS_BREAK' | 'RESULT';
interface AutoEvent { kind: EventKind; title: string; detail: string; mark: string; version: number; }

@Component({ selector: 'app-broadcast-overlay', standalone: true, imports: [AsyncPipe], templateUrl: './broadcast-overlay.component.html', styleUrl: './broadcast-overlay.component.scss' })
export class BroadcastOverlayComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly liveScore = inject(LiveScoreService);
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';
  readonly mode: OverlayMode = (this.route.snapshot.queryParamMap.get('mode') as OverlayMode) || 'strip';
  readonly eventKind: EventKind = (this.route.snapshot.queryParamMap.get('event') as EventKind) || 'FOUR';
  match: Match | null = null;
  innings: BroadcastInnings[] = [];
  score$ = of<LiveScore | null>(null);
  autoEvent: AutoEvent | null = null;
  private currentInningsId: string | null = null;
  private previousScore: LiveScore | null = null;
  private previousInningsId: string | null = null;
  private autoTimer: ReturnType<typeof setTimeout> | undefined;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    if (!this.matchId) return;
    this.refreshBroadcastState();
    this.refreshTimer = setInterval(() => this.refreshBroadcastState(), 2000);
  }

  ngOnDestroy() {
    if (this.autoTimer) clearTimeout(this.autoTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  private refreshBroadcastState() {
    this.http.get<BroadcastState>(API_ORIGIN + '/api/public/matches/' + this.matchId + '/broadcast-state').subscribe({
      next: (state) => {
        this.match = state.match;
        this.innings = state.innings || [];
        const current = state.match.currentInningsId || state.innings.find((item) => item.score.status === 'LIVE')?.score.inningsId || state.innings.at(-1)?.score.inningsId || null;
        if (!current) return;
        if (current !== this.currentInningsId) {
          this.previousScore = null;
          this.previousInningsId = this.currentInningsId;
          this.currentInningsId = current;
          this.score$ = this.liveScore.watch(current).pipe(tap((score) => this.onScore(score)), catchError(() => of(null)));
        }
      },
    });
  }

  onScore(score: LiveScore) {
    if (this.mode !== 'auto') { this.previousScore = score; return; }
    const event = this.detectEvent(score, this.previousScore);
    this.previousScore = score;
    if (!event) return;
    this.autoEvent = null;
    queueMicrotask(() => {
      this.autoEvent = event;
      if (this.autoTimer) clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(() => (this.autoEvent = null), this.eventDuration(event.kind));
    });
  }

  private eventDuration(kind: EventKind) {
    if (kind === 'NEW_BATTER' || kind === 'INNINGS_BREAK' || kind === 'RESULT') return 5200;
    if (kind === 'WICKET' || kind === 'SIX') return 3600;
    return 3000;
  }

  private detectEvent(score: LiveScore, previous: LiveScore | null): AutoEvent | null {
    const ball = score.recentBalls?.at(-1);
    const stateChanged = this.isNewState(score, previous);
    const inningsChanged = this.previousInningsId && this.previousInningsId !== score.inningsId;
    if (inningsChanged) return this.makeEvent('INNINGS_BREAK', 'INNINGS BREAK', this.inningsLabel(score) + ' · ' + score.runs + '/' + score.wickets, 'II', score);
    if (!previous || !stateChanged) return null;
    if (score.status === 'COMPLETED' && previous.status !== 'COMPLETED') return this.makeEvent('INNINGS_BREAK', 'INNINGS COMPLETE', score.runs + '/' + score.wickets + ' · ' + this.overs(score.legalBalls) + ' OVERS', 'II', score);
    if (ball?.wicketType) return this.makeEvent('WICKET', 'WICKET', ball.wicketType.replaceAll('_', ' '), 'W', score);
    const newBatter = this.newBatterName(score, previous);
    if (newBatter) return this.makeEvent('NEW_BATTER', 'NEW BATTER', newBatter, 'IN', score);
    if (ball?.totalRuns === 6 && ball.legalDelivery) return this.makeEvent('SIX', 'SIX', 'MAXIMUM', '6', score);
    if (ball?.totalRuns === 4 && ball.legalDelivery) return this.makeEvent('FOUR', 'FOUR', 'BOUNDARY', '4', score);
    if (this.isMilestone(score, previous)) return this.makeEvent('MILESTONE', 'MILESTONE', score.runs + ' RUNS', '★', score);
    if (ball?.legalDelivery && score.legalBalls > 0 && score.legalBalls % 6 === 0) return this.makeEvent('OVER_COMPLETE', 'OVER COMPLETE', this.overs(score.legalBalls) + ' OVERS · ' + this.currentOverRuns(score) + ' RUNS', 'OV', score);
    return null;
  }

  private newBatterName(score: LiveScore, previous: LiveScore) {
    const ids = new Set([previous.strikerId, previous.nonStrikerId].filter(Boolean));
    const candidateIds = [score.strikerId, score.nonStrikerId].filter(Boolean) as string[];
    const newId = candidateIds.find((id) => !ids.has(id));
    if (!newId) return null;
    return score.strikerName || score.nonStrikerName || score.batters?.find((b) => b.playerId === newId)?.playerName || 'NEW BATTER';
  }

  private isNewState(score: LiveScore, previous: LiveScore | null) {
    if (!previous) return false;
    if (typeof score.eventVersion === 'number' && typeof previous.eventVersion === 'number') return score.eventVersion > previous.eventVersion;
    return score.runs !== previous.runs || score.wickets !== previous.wickets || score.legalBalls !== previous.legalBalls || score.inningsId !== previous.inningsId;
  }

  private isMilestone(score: LiveScore, previous: LiveScore) {
    return [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500].some((value) => previous.runs < value && score.runs >= value);
  }

  private makeEvent(kind: EventKind, title: string, detail: string, mark: string, score: LiveScore): AutoEvent {
    return { kind, title, detail, mark, version: score.eventVersion ?? score.sequenceNo ?? Date.now() };
  }

  private batter(score: LiveScore, playerId: string | null | undefined): LiveBatter | undefined { return score.batters?.find((batter) => batter.playerId === playerId); }
  batterName(score: LiveScore) { return score.strikerName || this.batter(score, score.strikerId)?.playerName || 'CURRENT BATTER'; }
  batterRuns(score: LiveScore) { return this.batter(score, score.strikerId)?.runs ?? 0; }
  batterBalls(score: LiveScore) { return this.batter(score, score.strikerId)?.ballsFaced ?? 0; }
  batterFours(score: LiveScore) { return this.batter(score, score.strikerId)?.fours ?? 0; }
  batterSixes(score: LiveScore) { return this.batter(score, score.strikerId)?.sixes ?? 0; }
  batterStrikeRate(score: LiveScore, playerId: string | null | undefined) {
    const batter = this.batter(score, playerId);
    if (typeof batter?.strikeRate === 'number') return batter.strikeRate.toFixed(1);
    if (!batter?.ballsFaced) return '0.0';
    return ((batter.runs / batter.ballsFaced) * 100).toFixed(1);
  }
  nonStrikerName(score: LiveScore) { return score.nonStrikerName || this.batter(score, score.nonStrikerId)?.playerName || 'NON-STRIKER'; }
  nonStrikerRuns(score: LiveScore) { return this.batter(score, score.nonStrikerId)?.runs ?? 0; }
  nonStrikerBalls(score: LiveScore) { return this.batter(score, score.nonStrikerId)?.ballsFaced ?? 0; }
  bowler(score: LiveScore) { return score.bowlers?.find((item) => item.playerId === score.currentBowlerId); }
  bowlerName(score: LiveScore) { return score.currentBowlerName || this.bowler(score)?.playerName || 'CURRENT BOWLER'; }
  bowlerWickets(score: LiveScore) { return this.bowler(score)?.wickets ?? 0; }
  bowlerRuns(score: LiveScore) { return this.bowler(score)?.runsConceded ?? 0; }
  bowlerWides(score: LiveScore) { return this.bowler(score)?.wides ?? 0; }
  bowlerNoBalls(score: LiveScore) { return this.bowler(score)?.noBalls ?? 0; }
  bowlerEconomy(score: LiveScore) {
    const bowler = this.bowler(score);
    if (typeof bowler?.economy === 'number') return bowler.economy.toFixed(2);
    const balls = bowler?.legalBalls ?? 0;
    return balls ? ((bowler?.runsConceded ?? 0) / (balls / 6)).toFixed(2) : '0.00';
  }
  bowlerOvers(score: LiveScore) { return this.overs(this.bowler(score)?.legalBalls ?? 0); }
  partnershipName(score: LiveScore, playerId: string | undefined | null, fallback: string) {
    if (!playerId) return fallback;
    if (playerId === score.strikerId && score.strikerName) return score.strikerName;
    if (playerId === score.nonStrikerId && score.nonStrikerName) return score.nonStrikerName;
    return score.batters?.find((batter) => batter.playerId === playerId)?.playerName || fallback;
  }

  inningsState(score: LiveScore) { return this.innings.find((item) => item.score.inningsId === score.inningsId); }
  battingTeamId(score: LiveScore) { return this.inningsState(score)?.battingTeamId; }
  bowlingTeamId(score: LiveScore) { return this.inningsState(score)?.bowlingTeamId; }

  battingTeam(score: LiveScore) {
    const id = this.battingTeamId(score);
    if (id === this.match?.teamAId) return this.match.teamAName || 'TEAM A';
    if (id === this.match?.teamBId) return this.match.teamBName || 'TEAM B';
    return score.inningsNumber % 2 === 0 ? this.match?.teamBName || 'TEAM B' : this.match?.teamAName || 'TEAM A';
  }

  bowlingTeam(score: LiveScore) {
    const id = this.bowlingTeamId(score);
    if (id === this.match?.teamAId) return this.match.teamAName || 'TEAM A';
    if (id === this.match?.teamBId) return this.match.teamBName || 'TEAM B';
    return score.inningsNumber % 2 === 0 ? this.match?.teamAName || 'TEAM A' : this.match?.teamBName || 'TEAM B';
  }

  inningsLabel(score: LiveScore) { return this.ordinal(score.inningsNumber) + ' INNINGS'; }
  ordinal(value: number) {
    if (value % 100 >= 11 && value % 100 <= 13) return value + 'TH';
    return value % 10 === 1 ? value + 'ST' : value % 10 === 2 ? value + 'ND' : value % 10 === 3 ? value + 'RD' : value + 'TH';
  }
  isMultiInnings() { return (this.match?.format || '').toUpperCase() === 'TEST' || this.innings.length > 2; }
  formatLabel() {
    const format = (this.match?.format || 'CRICKET').toUpperCase();
    return format === 'CUSTOM' ? 'CUSTOM · ' + (this.match?.totalOvers ?? 'OPEN') + ' OV' : format;
  }
  overs(balls: number) { return Math.floor(balls / 6) + '.' + (balls % 6); }
  currentOver(score: LiveScore) {
    if (typeof score.currentOver === 'number' && score.currentOver > 0) return score.currentOver;
    const legalBalls = score.legalBalls ?? 0;
    return legalBalls === 0 ? 1 : Math.floor((legalBalls - 1) / 6) + 1;
  }
  currentOverBalls(score: LiveScore) { return (score.recentBalls || []).filter((ball) => ball.overNumber === this.currentOver(score)).slice(-6); }
  currentOverRuns(score: LiveScore) { return this.currentOverBalls(score).reduce((sum, ball) => sum + ball.totalRuns, 0); }
  runRate(score: LiveScore) { return score.legalBalls ? ((score.runs / score.legalBalls) * 6).toFixed(2) : '0.00'; }
  requiredRunRate(score: LiveScore) {
    const target = score.targetRuns, totalOvers = score.totalOvers;
    if (!target || !totalOvers || target <= score.runs || score.legalBalls >= totalOvers * 6) return '—';
    return ((target - score.runs) / ((totalOvers * 6 - score.legalBalls) / 6)).toFixed(2);
  }
  remainingRuns(score: LiveScore) { return !score.targetRuns || score.targetRuns <= score.runs ? '0' : String(score.targetRuns - score.runs); }
  remainingBalls(score: LiveScore) { return !score.totalOvers ? '—' : String(Math.max(0, score.totalOvers * 6 - score.legalBalls)); }
  targetLabel(score: LiveScore) { return score.targetRuns ? String(score.targetRuns) : '—'; }

  cumulativeTeamRuns(teamId: string | undefined) {
    if (!teamId) return 0;
    return this.innings.filter((item) => item.battingTeamId === teamId).reduce((sum, item) => sum + item.score.runs, 0);
  }
  leadTrail(score: LiveScore) {
    if (!this.isMultiInnings()) return null;
    const battingId = this.battingTeamId(score), bowlingId = this.bowlingTeamId(score);
    if (!battingId || !bowlingId) return null;
    const diff = this.cumulativeTeamRuns(battingId) - this.cumulativeTeamRuns(bowlingId);
    if (diff === 0) return { label: 'LEVEL', value: 0 };
    return diff > 0 ? { label: 'LEAD BY', value: diff } : { label: 'TRAIL BY', value: Math.abs(diff) };
  }
  chaseActive(score: LiveScore) { return Boolean(score.targetRuns && score.targetRuns > score.runs); }
  contextPrimary(score: LiveScore) {
    const lead = this.leadTrail(score);
    if (lead) return lead.value === 0 ? 'LEVEL' : lead.label + ' ' + lead.value;
    if (this.chaseActive(score)) return 'NEED ' + this.remainingRuns(score);
    if (score.targetRuns && score.targetRuns <= score.runs) return 'TARGET REACHED';
    return 'CRR ' + this.runRate(score);
  }
  contextSecondary(score: LiveScore) {
    const lead = this.leadTrail(score);
    if (lead) return this.inningsLabel(score) + ' · ' + this.formatLabel();
    if (this.chaseActive(score)) return 'OFF ' + this.remainingBalls(score) + ' BALLS';
    if (score.targetRuns && score.targetRuns <= score.runs) return 'CHASE COMPLETE';
    return 'LIVE INNINGS';
  }
  contextRate(score: LiveScore) {
    if (this.chaseActive(score)) return this.requiredRunRate(score);
    const lead = this.leadTrail(score);
    return lead ? String(lead.value) : String(score.partnership?.runs ?? 0);
  }
  contextRateLabel(score: LiveScore) {
    if (this.chaseActive(score)) return 'RRR';
    const lead = this.leadTrail(score);
    return lead ? lead.label : 'PARTNERSHIP';
  }

  get isEvent() { return this.mode === 'event'; }
  get isAuto() { return this.mode === 'auto'; }
  get isStrip() { return this.mode === 'strip'; }
  get isBatter() { return this.mode === 'batter'; }
  get isBowler() { return this.mode === 'bowler'; }
  get isPartnership() { return this.mode === 'partnership'; }

  eventLabel(score: LiveScore) {
    if (this.eventKind === 'RESULT') return score.status === 'COMPLETED' ? 'MATCH COMPLETE' : 'MATCH RESULT';
    if (this.eventKind === 'MILESTONE') return 'MILESTONE';
    if (this.eventKind === 'OVER_COMPLETE') return 'OVER COMPLETE';
    if (this.eventKind === 'INNINGS_BREAK') return 'INNINGS BREAK';
    if (this.eventKind === 'NEW_BATTER') return 'NEW BATTER';
    return this.eventKind;
  }
  eventDetail(score: LiveScore) {
    if (this.eventKind === 'FOUR') return 'BOUNDARY';
    if (this.eventKind === 'SIX') return 'MAXIMUM';
    if (this.eventKind === 'WICKET') return 'WICKET FALLEN';
    if (this.eventKind === 'OVER_COMPLETE') return this.overs(score.legalBalls) + ' OVERS';
    if (this.eventKind === 'INNINGS_BREAK') return score.runs + '/' + score.wickets + ' · ' + this.inningsLabel(score);
    if (this.eventKind === 'RESULT') return this.match?.resultText || score.runs + '/' + score.wickets;
    return score.runs + '/' + score.wickets + ' · LIVE';
  }
  token(ball: LiveRecentBall) {
    if (ball.wicketType) return 'W';
    if (ball.extraType === 'WIDE') return 'Wd';
    if (ball.extraType === 'NO_BALL') return 'Nb';
    if (ball.extraType === 'BYE') return 'B' + ball.totalRuns;
    if (ball.extraType === 'LEG_BYE') return 'Lb' + ball.totalRuns;
    return ball.totalRuns;
  }
}
