import type { Observable, SchedulerLike } from 'rxjs';
import type { LiveScore, LiveScoreService } from './live-score.service';

export interface PublicInningsHttpClient {
  get<T = unknown>(url: string): Observable<T>;
}

export function createPublicLiveFeed(
  http: PublicInningsHttpClient,
  api: string,
  matchId: string,
  liveScore: Pick<LiveScoreService, 'watchPublic'>,
  pollIntervalMs?: number,
  scheduler?: SchedulerLike
): Observable<LiveScore>;
