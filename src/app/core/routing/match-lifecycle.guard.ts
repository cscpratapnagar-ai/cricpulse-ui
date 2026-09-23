import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

type LifecycleStep = 'toss' | 'opening' | 'live';

interface PlayingPlayer {
  teamId: string;
  playerId: string;
}

interface TossState {
  recorded: boolean;
}

interface CurrentInnings {
  inningsNumber: number;
  status: string;
}

function redirect(router: Router, matchId: string, path: string): UrlTree {
  return router.createUrlTree(['/matches', matchId, path]);
}

function guardStep(step: LifecycleStep): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const http = inject(HttpClient);
    const router = inject(Router);
    const matchId = route.paramMap.get('id');

    if (!matchId) return router.createUrlTree(['/matches']);

    return http.get<PlayingPlayer[]>(`${API_BASE_URL}/matches/${matchId}/playing-xi`).pipe(
      switchMap((xi) => {
        const teams = new Set(xi.map((player) => player.teamId));
        const playingXiReady = teams.size === 2 && xi.length >= 22;

        if (!playingXiReady && step !== 'toss') {
          return of(redirect(router, matchId, 'playing-xi'));
        }

        if (step === 'toss') {
          return of(playingXiReady || redirect(router, matchId, 'playing-xi'));
        }

        return http.get<TossState>(`${API_BASE_URL}/matches/${matchId}/toss`).pipe(
          switchMap((toss) => {
            if (!toss.recorded) return of(redirect(router, matchId, 'toss'));
            if (step === 'opening') return of(true);

            return http
              .get<CurrentInnings>(`${API_BASE_URL}/matches/${matchId}/current-innings`)
              .pipe(
                map((innings) =>
                  innings.status === 'LIVE'
                    ? true
                    : router.createUrlTree(['/matches', matchId, 'opening-players'], {
                        queryParams: { innings: innings.inningsNumber },
                      }),
                ),
                catchError(() =>
                  of(
                    router.createUrlTree(['/matches', matchId, 'opening-players'], {
                      queryParams: { innings: 1 },
                    }),
                  ),
                ),
              );
          }),
        );
      }),
      catchError(() => of(router.createUrlTree(['/matches', matchId]))),
    );
  };
}

export const canAccessMatchToss = guardStep('toss');
export const canAccessMatchOpening = guardStep('opening');
export const canAccessLiveScoring = guardStep('live');
