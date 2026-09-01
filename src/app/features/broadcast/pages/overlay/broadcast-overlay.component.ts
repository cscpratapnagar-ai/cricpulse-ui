import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_ORIGIN } from '../../../../core/config/api.config';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';

interface CurrentInnings { inningsId: string; }
type OverlayMode = 'strip' | 'batter' | 'bowler' | 'partnership' | 'event';
type EventKind = 'FOUR' | 'SIX' | 'WICKET' | 'MILESTONE' | 'OVER_COMPLETE' | 'RESULT';

interface Match { id: string; name: string; teamAName?: string; teamBName?: string; }

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
  readonly mode: OverlayMode = (this.route.snapshot.queryParamMap.get('mode') as OverlayMode) || 'strip';
  readonly eventKind: EventKind = (this.route.snapshot.queryParamMap.get('event') as EventKind) || 'FOUR';
  match: Match | null = null;
  score$ = of<LiveScore | null>(null);

  constructor() {
    if (!this.matchId) return;
    this.http.get<Match>(`${API_ORIGIN}/api/matches/${this.matchId}`).subscribe({ next: (match) => (this.match = match) });
    this.http.get<CurrentInnings>(`${API_ORIGIN}/api/public/matches/${this.matchId}/current-innings`).subscribe({
      next: ({ inningsId }) => {
        this.score$ = this.liveScore.watch(inningsId).pipe(catchError(() => of(null)));
      },
    });
  }
  overs(balls: number) { return `${Math.floor(balls / 6)}.${balls % 6}`; }
  get isEvent() { return this.mode === 'event'; }
  eventLabel(score: LiveScore) {
    if (this.eventKind === 'RESULT') return score.status === 'COMPLETED' ? 'MATCH COMPLETE' : 'MATCH RESULT';
    if (this.eventKind === 'MILESTONE') return 'MILESTONE';
    if (this.eventKind === 'OVER_COMPLETE') return 'OVER COMPLETE';
    return this.eventKind;
  }
  eventDetail(score: LiveScore) {
    if (this.eventKind === 'FOUR') return 'BOUNDARY';
    if (this.eventKind === 'SIX') return 'MAXIMUM';
    if (this.eventKind === 'WICKET') return 'WICKET FALLEN';
    if (this.eventKind === 'OVER_COMPLETE') return `${this.overs(score.legalBalls)} OVERS`;
    if (this.eventKind === 'RESULT') return `${score.runs}/${score.wickets}`;
    return `${score.runs}/${score.wickets} · LIVE`; 
  }
  get isStrip() { return this.mode === 'strip'; }
  get isBatter() { return this.mode === 'batter'; }
  get isBowler() { return this.mode === 'bowler'; }
  get isPartnership() { return this.mode === 'partnership'; }
  token(ball: any) {
    if (ball.wicketType) return 'W';
    if (ball.extraType === 'WIDE') return 'Wd';
    if (ball.extraType === 'NO_BALL') return 'Nb';
    return ball.totalRuns;
  }
}
