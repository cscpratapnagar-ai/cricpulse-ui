import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { EMPTY, Observable, Subscription, catchError, switchMap, timer } from 'rxjs';

export interface LiveBatter { playerId: string; runs: number; ballsFaced: number; fours: number; sixes: number; strikeRate?: number | null; out: boolean; dismissalType?: string | null; }
export interface LiveBowler { playerId: string; legalBalls: number; runsConceded: number; wickets: number; wides: number; noBalls: number; economy?: number | null; }
export interface LiveRecentBall { deliveryId: string; overNumber: number; ballNumber: number; strikerId: string; nonStrikerId: string; bowlerId: string; batRuns: number; extraRuns: number; extraType?: string | null; wicketType?: string | null; legalDelivery: boolean; totalRuns: number; }
export interface LivePartnership { batterOneId: string; batterTwoId: string; runs: number; balls: number; }
export interface LiveFallOfWicket { wicketNumber: number; playerId: string; runs: number; overNumber: number; ballNumber: number; }
export interface LiveOver { overNumber: number; bowlerId: string; runs: number; wickets: number; legalBalls: number; wides: number; noBalls: number; byes: number; legByes: number; completed: boolean; }

export interface LiveScore {
  inningsId: string; matchId: string; inningsNumber: number; runs: number; wickets: number; legalBalls: number;
  totalOvers?: number | null; status?: string; targetRuns?: number | null; currentOver?: number; currentBall?: number;
  strikerId?: string | null; nonStrikerId?: string | null; currentBowlerId?: string | null; overBalls?: string[];
  eventVersion?: number; batters?: LiveBatter[]; bowlers?: LiveBowler[]; overs?: LiveOver[];
  recentBalls?: LiveRecentBall[]; partnership?: LivePartnership | null; fallOfWickets?: LiveFallOfWicket[];
}

/**
 * Local Angular development keeps using the separately running API on :8080.
 * Deployed builds use the current origin and expect the web server/reverse proxy
 * to route /api and /ws to the backend (including HTTPS -> WSS).
 */
export function resolveLiveApiOrigin(location: Pick<Location, 'hostname' | 'origin'>): string {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }
  return location.origin;
}

export function resolveLiveWebSocketUrl(apiOrigin: string): string {
  const url = new URL('/ws', apiOrigin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

@Injectable({ providedIn: 'root' })
export class LiveScoreService {
  private readonly http = inject(HttpClient);
  private readonly apiOrigin = resolveLiveApiOrigin(window.location);
  private readonly snapshotUrl = (inningsId: string) =>
    `${this.apiOrigin}/api/public/innings/${encodeURIComponent(inningsId)}`;

  /**
   * WebSocket provides low-latency updates; periodic public snapshots keep
   * viewers current while the socket is disconnected or reconnecting.
   */
  watch(inningsId: string): Observable<LiveScore> {
    return new Observable<LiveScore>((subscriber) => {
      if (!inningsId) {
        subscriber.error(new Error('Innings ID is required'));
        return;
      }

      let stopped = false;
      let stompSubscription: StompSubscription | undefined;
      let lastEventVersion: number | undefined;
      const requests = new Subscription();

      const publish = (score: LiveScore | null | undefined): void => {
        if (stopped || !score || score.inningsId !== inningsId) return;
        if (typeof score.eventVersion === 'number') {
          if (typeof lastEventVersion === 'number' && score.eventVersion <= lastEventVersion) return;
          lastEventVersion = score.eventVersion;
        }
        subscriber.next(score);
      };

      const refreshSnapshot = (): void => {
        requests.add(
          this.http.get<LiveScore>(this.snapshotUrl(inningsId)).pipe(
            catchError(() => EMPTY)
          ).subscribe(publish)
        );
      };

      refreshSnapshot();
      requests.add(
        timer(15000, 15000).pipe(
          switchMap(() => this.http.get<LiveScore>(this.snapshotUrl(inningsId)).pipe(
            catchError(() => EMPTY)
          ))
        ).subscribe(publish)
      );

      const client = new Client({
        brokerURL: resolveLiveWebSocketUrl(this.apiOrigin),
        reconnectDelay: 3000,
        connectionTimeout: 10000,
        onConnect: () => {
          if (stopped) return;
          stompSubscription?.unsubscribe();
          stompSubscription = client.subscribe(
            `/topic/innings/${inningsId}`,
            (message: IMessage) => {
              try {
                publish(JSON.parse(message.body) as LiveScore);
              } catch {
                // Ignore malformed broadcasts and keep the stream alive.
              }
            }
          );
          refreshSnapshot();
        },
        onStompError: () => {
          // Keep the observable alive; STOMP reconnect and snapshot polling recover it.
        },
        onWebSocketError: () => {
          // Reconnection is handled by the STOMP client's reconnectDelay.
        }
      });

      client.activate();

      return () => {
        stopped = true;
        requests.unsubscribe();
        stompSubscription?.unsubscribe();
        void client.deactivate();
      };
    });
  }
}
