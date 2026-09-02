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

/** Stable id for one scoring intent. Reuse this id if the same request is retried. */
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
              reconciling = false;
              if (reconcileQueued) {
                reconcileQueued = false;
                reconcile();
              }
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
          // Recovery first: reconnects may have missed one or more broadcasts.
          reconcile();
          subscription = client.subscribe(`/topic/innings/${inningsId}`, (message: IMessage) => {
            try {
              const score = JSON.parse(message.body) as LiveScore;
              if (score?.inningsId !== inningsId) return;

              const version = score.eventVersion;
              if (typeof version === 'number' && Number.isFinite(version)) {
                if (version <= lastEventVersion) return;
                // A version jump proves a missed authoritative event. Recover the
                // complete state instead of applying a potentially partial frame.
                if (version > lastEventVersion + 1) {
                  reconcile();
                  return;
                }
              }
              emitAuthoritative(score);
            } catch {
              // Never terminate a public viewer because of one malformed frame.
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
