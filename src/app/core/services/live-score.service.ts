import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable } from 'rxjs';
import { API_ORIGIN, WS_ORIGIN } from '../config/api.config';

export interface LiveBatter {
  playerId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate?: number | null;
  out: boolean;
  dismissalType?: string | null;
}
export interface LiveBowler {
  playerId: string;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
  economy?: number | null;
}
export interface LiveRecentBall {
  deliveryId: string;
  overNumber: number;
  ballNumber: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  batRuns: number;
  extraRuns: number;
  extraType?: string | null;
  wicketType?: string | null;
  legalDelivery: boolean;
  totalRuns: number;
}
export interface LivePartnership {
  batterOneId: string;
  batterTwoId: string;
  runs: number;
  balls: number;
}
export interface LiveFallOfWicket {
  wicketNumber: number;
  playerId: string;
  runs: number;
  overNumber: number;
  ballNumber: number;
}
export interface LiveOver {
  overNumber: number;
  bowlerId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  completed: boolean;
}

export interface LiveScore {
  inningsId: string;
  matchId: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  totalOvers?: number | null;
  status?: string;
  targetRuns?: number | null;
  currentOver?: number;
  currentBall?: number;
  strikerId?: string | null;
  nonStrikerId?: string | null;
  currentBowlerId?: string | null;
  overBalls?: string[];
  eventVersion?: number;
  eventType?: string;
  eventId?: string;
  sequenceNo?: number;
  batters?: LiveBatter[];
  bowlers?: LiveBowler[];
  overs?: LiveOver[];
  recentBalls?: LiveRecentBall[];
  partnership?: LivePartnership | null;
  fallOfWickets?: LiveFallOfWicket[];
}

/**
 * A client-side command id must be created once per scoring intent and then
 * reused if the HTTP request is retried. The backend can therefore distinguish
 * a genuine retry from a second scoring action.
 */
export function createScoringCommandId(): string {
  return crypto.randomUUID();
}

export function withCommandId(commandId: string): { 'X-Command-Id': string } {
  return { 'X-Command-Id': commandId };
}

@Injectable({ providedIn: 'root' })
export class LiveScoreService {
  private readonly http = inject(HttpClient);

  watch(inningsId: string): Observable<LiveScore> {
    return new Observable<LiveScore>((subscriber) => {
      if (!inningsId) {
        subscriber.error(new Error('Innings ID is required'));
        return;
      }

      let subscription: StompSubscription | undefined;
      let stopped = false;
      let lastEventVersion = 0;
      let reconciling = false;
      let reconcileQueued = false;

      const emitAuthoritative = (score: LiveScore) => {
        if (stopped || score?.inningsId !== inningsId) return;
        const version = score.eventVersion;
        if (typeof version === 'number' && Number.isFinite(version)) {
          if (version < lastEventVersion) return;
          lastEventVersion = Math.max(lastEventVersion, version);
        }
        subscriber.next(score);
      };

      const reconcile = () => {
        if (stopped) return;
        if (reconciling) {
          reconcileQueued = true;
          return;
        }
        reconciling = true;
        this.http
          .get<LiveScore>(`${API_ORIGIN}/api/public/innings/${encodeURIComponent(inningsId)}`)
          .subscribe({
            next: (score) => {
              if (!stopped && score?.inningsId === inningsId) {
                const version = score.eventVersion;
                if (typeof version === 'number' && Number.isFinite(version)) {
                  lastEventVersion = Math.max(lastEventVersion, version);
                }
                subscriber.next(score);
              }
            },
            error: () => {
              // Keep the socket alive; the next authoritative event/reconnect
              // can trigger another reconciliation.
            },
            complete: () => {
              reconciling = false;
              if (reconcileQueued) {
                reconcileQueued = false;
                reconcile();
              }
            },
          });
      };

      // Public viewer must never depend on scorer authentication.
      this.http
        .get<LiveScore>(`${API_ORIGIN}/api/public/innings/${encodeURIComponent(inningsId)}`)
        .subscribe({
          next: emitAuthoritative,
          error: (error) => {
            if (!stopped) {
              subscriber.error(
                new Error(`Unable to load public score (${error?.status ?? 'unknown'})`),
              );
            }
          },
        });

      const client = new Client({
        brokerURL: WS_ORIGIN + '/ws',
        reconnectDelay: 3000,
        connectionTimeout: 10000,
        onConnect: () => {
          if (stopped) return;
          subscription?.unsubscribe();
          // A reconnect can miss messages while the socket was down. Always
          // reconcile before accepting the new stream as complete.
          reconcile();
          subscription = client.subscribe(`/topic/innings/${inningsId}`, (message: IMessage) => {
            try {
              const score = JSON.parse(message.body) as LiveScore;
              if (score?.inningsId !== inningsId) return;

              const version = score.eventVersion;
              if (typeof version === 'number' && Number.isFinite(version)) {
                if (version <= lastEventVersion) return;
                // A jump means at least one authoritative event was missed.
                // REST is the source of truth; recover the complete projection.
                if (version > lastEventVersion + 1) {
                  reconcile();
                  return;
                }
              }
              emitAuthoritative(score);
            } catch {
              // A malformed realtime frame must not kill the authoritative
              // viewer stream. REST reconciliation will recover the state.
              reconcile();
            }
          });
        },
        onStompError: () => {
          if (!stopped) reconcile();
        },
        onWebSocketError: () => {
          if (!stopped) reconcile();
        },
      });

      client.activate();
      return () => {
        stopped = true;
        subscription?.unsubscribe();
        void client.deactivate();
      };
    });
  }
}
