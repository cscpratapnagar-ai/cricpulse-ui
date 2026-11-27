import { EMPTY, asyncScheduler, catchError, distinctUntilChanged, exhaustMap, filter, map, switchMap, timer } from 'rxjs';

/**
 * Discover the active innings without cancelling a slow request on the next poll.
 * Once the innings changes, switchMap tears down the old score subscription.
 */
export function createPublicLiveFeed(http, api, matchId, liveScore, pollIntervalMs = 5000, scheduler = asyncScheduler) {
  return timer(0, pollIntervalMs, scheduler).pipe(
    exhaustMap(() =>
      http.get(`${api}/public/matches/${encodeURIComponent(matchId)}/current-innings`).pipe(
        catchError(() => EMPTY)
      )
    ),
    map((innings) => innings?.inningsId),
    filter((inningsId) => typeof inningsId === 'string' && inningsId.length > 0),
    distinctUntilChanged(),
    switchMap((inningsId) =>
      liveScore.watchPublic(inningsId).pipe(catchError(() => EMPTY))
    )
  );
}
