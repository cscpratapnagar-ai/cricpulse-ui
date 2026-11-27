import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { EMPTY, Observable, Subscription, catchError, firstValueFrom, switchMap, timer } from 'rxjs';
import { shouldAcceptLiveScoreVersion } from './live-score-reconciliation.mjs';

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
  eventVersion?: number; feedStatus?: LiveFeedStatus; lastUpdatedAt?: number;
  batters?: LiveBatter[]; bowlers?: LiveBowler[]; overs?: LiveOver[];
  recentBalls?: LiveRecentBall[]; partnership?: LivePartnership | null; fallOfWickets?: LiveFallOfWicket[];
}

export type LiveFeedAccess = 'public' | 'private';
export type LiveFeedStatus = 'connecting' | 'connected' | 'reconnecting' | 'stale';

const LIVE_DATA_STALE_AFTER_MS = 30000;

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

export function resolveLiveTopic(inningsId: string, access: LiveFeedAccess): string {
  const prefix = access === 'public' ? '/topic/public/innings/' : '/topic/innings/';
  return prefix + encodeURIComponent(inningsId);
}

@Injectable({ providedIn: 'root' })
export class LiveScoreService {
  private readonly http = inject(HttpClient);
  private readonly apiOrigin = resolveLiveApiOrigin(window.location);
  private readonly snapshotUrl = (inningsId: string) =>
    `${this.apiOrigin}/api/public/innings/${encodeURIComponent(inningsId)}`;
  private readonly ticketUrl = `${this.apiOrigin}/api/auth/ws-ticket`;

  /**
   * Public viewers use the anonymous read-only topic. Authenticated scoring
   * screens request a short-lived ticket and use the protected private topic.
   * Both paths refresh the REST snapshot after every successful reconnect.
   */
  watch(inningsId: string, access: LiveFeedAccess = 'private'): Observable<LiveScore> {
    return new Observable<LiveScore>((subscriber) => {
      if (!inningsId) {
        subscriber.error(new Error('Innings ID is required'));
        return;
      }

      let stopped = false;
      let socketConnected = false;
      let stompSubscription: StompSubscription | undefined;
      let client: Client;
      let lastEventVersion: number | undefined;
      let lastDataAt = Date.now();
      let latestScore: LiveScore | undefined;
      const requests = new Subscription();

      const currentStatus = (): LiveFeedStatus => {
        if (!latestScore && !socketConnected) return 'connecting';
        if (Date.now() - lastDataAt >= LIVE_DATA_STALE_AFTER_MS) return 'stale';
        return socketConnected ? 'connected' : 'reconnecting';
      };

      const emitStatus = (): void => {
        if (stopped || !latestScore) return;
        subscriber.next({ ...latestScore, feedStatus: currentStatus(), lastUpdatedAt: lastDataAt });
      };

      const publish = (score: LiveScore | null | undefined, source: 'snapshot' | 'event'): void => {
        if (stopped || !score || score.inningsId !== inningsId) return;
        if (!shouldAcceptLiveScoreVersion(score, lastEventVersion)) {
          // An equal-version REST snapshot confirms freshness without allowing
          // an older or unversioned response to overwrite a newer live event.
          if (source === 'snapshot' && typeof score.eventVersion === 'number'
            && score.eventVersion === lastEventVersion && latestScore) {
            lastDataAt = Date.now();
            emitStatus();
          }
          return;
        }
        if (typeof score.eventVersion === 'number') lastEventVersion = score.eventVersion;
        lastDataAt = Date.now();
        latestScore = { ...score, feedStatus: currentStatus(), lastUpdatedAt: lastDataAt };
        subscriber.next(latestScore);
      };

      const refreshSnapshot = (): void => {
        requests.add(
          this.http.get<LiveScore>(this.snapshotUrl(inningsId)).pipe(
            catchError(() => {
              emitStatus();
              return EMPTY;
            })
          ).subscribe(score => publish(score, 'snapshot'))
        );
      };

      refreshSnapshot();
      requests.add(timer(5000, 5000).subscribe(() => emitStatus()));
      requests.add(
        timer(15000, 15000).pipe(
          switchMap(() => this.http.get<LiveScore>(this.snapshotUrl(inningsId)).pipe(
            catchError(() => {
              emitStatus();
              return EMPTY;
            })
          ))
        ).subscribe(score => publish(score, 'snapshot'))
      );

      client = new Client({
        brokerURL: resolveLiveWebSocketUrl(this.apiOrigin),
        reconnectDelay: 3000,
        connectionTimeout: 10000,
        beforeConnect: async () => {
          if (stopped || access === 'public') return;
          // Tickets are deliberately short-lived. Fetch a fresh one for every
          // initial connection and automatic reconnect, never persist it.
          const ticket = await firstValueFrom(
            this.http.get<{ token: string }>(this.ticketUrl, { withCredentials: true })
          );
          if (!ticket?.token) throw new Error('WebSocket authentication ticket was not returned');
          client.connectHeaders = { Authorization: `Bearer ${ticket.token}` };
        },
        onConnect: () => {
          if (stopped) return;
          socketConnected = true;
          emitStatus();
          stompSubscription?.unsubscribe();
          stompSubscription = client.subscribe(
            resolveLiveTopic(inningsId, access),
            (message: IMessage) => {
              try {
                publish(JSON.parse(message.body) as LiveScore, 'event');
              } catch {
                // Ignore malformed broadcasts and keep the stream alive.
              }
            }
          );
          refreshSnapshot();
        },
        onStompError: () => {
          socketConnected = false;
          emitStatus();
          // Keep the observable alive; STOMP reconnect and snapshot polling recover it.
        },
        onWebSocketClose: () => {
          socketConnected = false;
          emitStatus();
        },
        onWebSocketError: () => {
          socketConnected = false;
          emitStatus();
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

  watchPublic(inningsId: string): Observable<LiveScore> {
    return this.watch(inningsId, 'public');
  }

  watchPrivate(inningsId: string): Observable<LiveScore> {
    return this.watch(inningsId, 'private');
  }
}
