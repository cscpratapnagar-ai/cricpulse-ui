import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_ORIGIN } from '../../../../core/config/api.config';
import {
  LiveRecentBall,
  LiveScore,
  LiveScoreService,
} from '../../../../core/services/live-score.service';

interface CurrentInnings {
  inningsId: string;
}

type OverlayMode = 'strip' | 'batter' | 'bowler' | 'partnership' | 'event' | 'auto';
type EventKind = 'FOUR' | 'SIX' | 'WICKET' | 'MILESTONE' | 'OVER_COMPLETE' | 'RESULT';
interface Match {
  id: string;
  name: string;
  teamAName?: string;
  teamBName?: string;
}
interface AutoEvent {
  kind: EventKind;
  title: string;
  detail: string;
  mark: string;
  version: number;
}

@Component({
  selector: 'app-broadcast-overlay',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './broadcast-overlay.component.html',
  styleUrl: './broadcast-overlay.component.scss',
})
export class BroadcastOverlayComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly liveScore = inject(LiveScoreService);
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';
  readonly mode: OverlayMode =
    (this.route.snapshot.queryParamMap.get('mode') as OverlayMode) || 'strip';
  readonly eventKind: EventKind =
    (this.route.snapshot.queryParamMap.get('event') as EventKind) || 'FOUR';
  match: Match | null = null;
  score$ = of<LiveScore | null>(null);
  autoEvent: AutoEvent | null = null;
  private previousScore: LiveScore | null = null;
  private autoTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (!this.matchId) return;
    this.http
      .get<Match>(`${API_ORIGIN}/api/matches/${this.matchId}`)
      .subscribe({ next: (match) => (this.match = match) });
    this.http
      .get<CurrentInnings>(
        `${API_ORIGIN}/api/public/matches/${this.matchId}/current-innings`,
      )
      .subscribe({
        next: ({ inningsId }) => {
          this.score$ = this.liveScore.watch(inningsId).pipe(
            tap((score) => this.onScore(score)),
            catchError(() => of(null)),
          );
        },
      });
  }

  onScore(score: LiveScore) {
    if (this.mode !== 'auto') return;
    const event = this.detectEvent(score, this.previousScore);
    this.previousScore = score;
    if (!event) return;
    this.autoEvent = null;
    queueMicrotask(() => {
      this.autoEvent = event;
      if (this.autoTimer) clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(() => (this.autoEvent = null), 4200);
    });
  }

  private detectEvent(score: LiveScore, previous: LiveScore | null): AutoEvent | null {
    const ball = score.recentBalls?.at(-1);
    if (!ball || !this.isNewState(score, previous)) return null;
    if (score.status === 'COMPLETED' && previous?.status !== 'COMPLETED') {
      return this.makeEvent(
        'RESULT',
        'MATCH COMPLETE',
        `${score.runs}/${score.wickets}`,
        '✓',
        score,
      );
    }
    if (ball.wicketType) {
      return this.makeEvent('WICKET', 'WICKET', 'WICKET FALLEN', 'W', score);
    }
    if (ball.totalRuns === 6 && ball.legalDelivery) {
      return this.makeEvent('SIX', 'SIX', 'MAXIMUM', '6', score);
    }
    if (ball.totalRuns === 4 && ball.legalDelivery) {
      return this.makeEvent('FOUR', 'FOUR', 'BOUNDARY', '4', score);
    }
    if (this.isMilestone(score, previous)) {
      return this.makeEvent('MILESTONE', 'MILESTONE', `${score.runs} RUNS`, '★', score);
    }
    if (ball.legalDelivery && score.legalBalls > 0 && score.legalBalls % 6 === 0) {
      return this.makeEvent(
        'OVER_COMPLETE',
        'OVER COMPLETE',
        `${this.overs(score.legalBalls)} OVERS`,
        'OV',
        score,
      );
    }
    return null;
  }

  private isNewState(score: LiveScore, previous: LiveScore | null) {
    if (!previous) return false;
    if (typeof score.eventVersion === 'number' && typeof previous.eventVersion === 'number') {
      return score.eventVersion > previous.eventVersion;
    }
    return (
      score.runs !== previous.runs ||
      score.wickets !== previous.wickets ||
      score.legalBalls !== previous.legalBalls
    );
  }

  private isMilestone(score: LiveScore, previous: LiveScore | null) {
    if (!previous) return false;
    return [25, 50, 75, 100, 125, 150, 175, 200, 250, 300].some(
      (value) => previous.runs < value && score.runs >= value,
    );
  }

  private makeEvent(
    kind: EventKind,
    title: string,
    detail: string,
    mark: string,
    score: LiveScore,
  ): AutoEvent {
    return {
      kind,
      title,
      detail,
      mark,
      version: score.eventVersion ?? score.sequenceNo ?? Date.now(),
    };
  }

  batterRuns(score: LiveScore) {
    return score.batters?.find((batter) => batter.playerId === score.strikerId)?.runs ?? 0;
  }

  batterBalls(score: LiveScore) {
    return score.batters?.find((batter) => batter.playerId === score.strikerId)?.ballsFaced ?? 0;
  }

  bowlerWickets(score: LiveScore) {
    return score.bowlers?.find((bowler) => bowler.playerId === score.currentBowlerId)?.wickets ?? 0;
  }

  bowlerRuns(score: LiveScore) {
    return score.bowlers?.find((bowler) => bowler.playerId === score.currentBowlerId)?.runsConceded ?? 0;
  }

  bowlerOvers(score: LiveScore) {
    return this.overs(
      score.bowlers?.find((bowler) => bowler.playerId === score.currentBowlerId)?.legalBalls ?? 0,
    );
  }

  overs(balls: number) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }

  get isEvent() {
    return this.mode === 'event';
  }

  get isAuto() {
    return this.mode === 'auto';
  }

  eventLabel(score: LiveScore) {
    if (this.eventKind === 'RESULT') {
      return score.status === 'COMPLETED' ? 'MATCH COMPLETE' : 'MATCH RESULT';
    }
    if (this.eventKind === 'MILESTONE') return 'MILESTONE';
    if (this.eventKind === 'OVER_COMPLETE') return 'OVER COMPLETE';
    return this.eventKind;
  }

  eventDetail(score: LiveScore) {
    if (this.eventKind === 'FOUR') return 'BOUNDARY';
    if (this.eventKind === 'SIX') return 'MAXIMUM';
    if (this.eventKind === 'WICKET') return 'WICKET FALLEN';
    if (this.eventKind === 'OVER_COMPLETE') {
      return `${this.overs(score.legalBalls)} OVERS`;
    }
    if (this.eventKind === 'RESULT') return `${score.runs}/${score.wickets}`;
    return `${score.runs}/${score.wickets} · LIVE`;
  }

  get isStrip() {
    return this.mode === 'strip';
  }

  get isBatter() {
    return this.mode === 'batter';
  }

  get isBowler() {
    return this.mode === 'bowler';
  }

  get isPartnership() {
    return this.mode === 'partnership';
  }

  token(ball: LiveRecentBall) {
    if (ball.wicketType) return 'W';
    if (ball.extraType === 'WIDE') return 'Wd';
    if (ball.extraType === 'NO_BALL') return 'Nb';
    return ball.totalRuns;
  }
}
