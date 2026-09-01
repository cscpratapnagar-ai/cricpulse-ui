import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_ORIGIN } from '../../../../core/config/api.config';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';

interface CurrentInnings { inningsId: string; }
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
  token(ball: any) {
    if (ball.wicketType) return 'W';
    if (ball.extraType === 'WIDE') return 'Wd';
    if (ball.extraType === 'NO_BALL') return 'Nb';
    return ball.totalRuns;
  }
}
