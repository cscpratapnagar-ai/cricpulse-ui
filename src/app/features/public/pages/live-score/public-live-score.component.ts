import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  teamAName?: string;
  teamBName?: string;
}
interface CurrentInnings {
  inningsId: string;
  matchId?: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId?: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  status: string;
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
}

@Component({
  selector: 'app-public-live-score',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  templateUrl: './public-live-score.component.html',
  styleUrl: './public-live-score.component.scss',
})
export class PublicLiveScoreComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly liveScore = inject(LiveScoreService);
  private readonly api = 'http://localhost:8080/api';
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';
  match: Match | null = null;
  score$ = of<LiveScore | null>(null);

  constructor() {
    if (!this.matchId) return;
    this.http.get<Match>(`${this.api}/matches/${this.matchId}`).subscribe({
      next: (m) => (this.match = m),
      error: (e) => console.error('[PublicLive] match load failed', e),
    });
    this.http
      .get<CurrentInnings>(`${this.api}/public/matches/${this.matchId}/current-innings`)
      .subscribe({
        next: (innings) => {
          const inningsId = innings.inningsId;
          if (!inningsId) return;
          this.score$ = this.liveScore.watch(inningsId).pipe(
            catchError((e) => {
              console.error('[PublicLive] score failed', e);
              return of<LiveScore | null>(null);
            }),
          );
        },
        error: (e) => {
          console.error('[PublicLive] current innings failed', e);
          this.score$ = of(null);
        },
      });
  }
  overs(balls: number) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }
  runRate(score: LiveScore) {
    return score.legalBalls ? (score.runs / (score.legalBalls / 6)).toFixed(2) : '0.00';
  }
}
