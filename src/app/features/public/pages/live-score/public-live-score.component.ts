import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, of, switchMap, tap, timer } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';
import { API_ORIGIN } from '../../../../core/config/api.config';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  teamAId?: string;
  teamBId?: string;
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
  private readonly api = `${API_ORIGIN}/api`;
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';

  match: Match | null = null;
  currentInnings: CurrentInnings | null = null;
  score$ = of<LiveScore | null>(null);
  loadError = false;

  constructor() {
    if (!this.matchId) {
      this.loadError = true;
      return;
    }

    this.http.get<Match>(`${this.api}/matches/${this.matchId}`).subscribe({
      next: (match) => (this.match = match),
      error: (error) => {
        this.loadError = true;
        console.error('[PublicLive] match load failed', error);
      },
    });

    this.score$ = timer(0, 5000).pipe(
      switchMap(() =>
        this.http.get<CurrentInnings>(`${this.api}/public/matches/${this.matchId}/current-innings`),
      ),
      tap((innings) => (this.currentInnings = innings)),
      distinctUntilChanged((previous, current) => previous.inningsId === current.inningsId),
      switchMap((innings) => this.liveScore.watch(innings.inningsId)),
      catchError((error) => {
        this.loadError = true;
        console.error('[PublicLive] score failed', error);
        return of<LiveScore | null>(null);
      }),
    );
  }

  battingTeamName(): string {
    const battingTeamId = this.currentInnings?.battingTeamId;
    if (battingTeamId && battingTeamId === this.match?.teamBId)
      return this.match?.teamBName || 'Team B';
    return this.match?.teamAName || 'Batting Team';
  }

  overs(balls: number): string {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }

  runRate(score: LiveScore): string {
    return score.legalBalls ? (score.runs / (score.legalBalls / 6)).toFixed(2) : '0.00';
  }

  statusLabel(score: LiveScore): string {
    return score.status || this.match?.status || 'LIVE';
  }
}
