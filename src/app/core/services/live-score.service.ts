import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class LiveScoreService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  watch(inningsId: string): Observable<LiveScore> {
    return new Observable<LiveScore>((subscriber) => {
      if (!inningsId) { subscriber.error(new Error('Innings ID is required')); return; }
      let subscription: StompSubscription | undefined;
      let stopped = false;

      // Public viewer must never depend on scorer authentication.
      this.http.get<LiveScore>(`${this.apiUrl}/api/public/innings/${encodeURIComponent(inningsId)}`).subscribe({
        next: score => { if (!stopped && score?.inningsId === inningsId) subscriber.next(score); },
        error: error => { if (!stopped) subscriber.error(new Error(`Unable to load public score (${error?.status ?? 'unknown'})`)); }
      });

      const client = new Client({
        brokerURL: this.apiUrl.replace('http', 'ws') + '/ws',
        reconnectDelay: 3000,
        connectionTimeout: 10000,
        onConnect: () => {
          if (stopped) return;
          subscription?.unsubscribe();
          subscription = client.subscribe(`/topic/innings/${inningsId}`, (message: IMessage) => {
            try {
              const score = JSON.parse(message.body) as LiveScore;
              if (score?.inningsId === inningsId) subscriber.next(score);
            } catch { subscriber.error(new Error('Invalid live score payload')); }
          });
        },
        onStompError: frame => subscriber.error(new Error(frame.headers['message'] ?? 'WebSocket error')),
        onWebSocketError: () => { }
      });
      client.activate();
      return () => { stopped = true; subscription?.unsubscribe(); void client.deactivate(); };
    });
  }
}
