import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable } from 'rxjs';

export interface LiveScore {
  inningsId: string;
  matchId: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  currentOver?: number;
  currentBall?: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  overBalls?: string[];
  eventVersion?: number;
}

@Injectable({ providedIn: 'root' })
export class LiveScoreService {
  private readonly apiUrl = 'http://localhost:8080';

  watch(inningsId: string): Observable<LiveScore> {
    return new Observable<LiveScore>((subscriber) => {
      if (!inningsId) {
        subscriber.error(new Error('Innings ID is required'));
        return;
      }

      let subscription: StompSubscription | undefined;
      let stopped = false;

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
              if (score && score.inningsId === inningsId) subscriber.next(score);
            } catch {
              subscriber.error(new Error('Invalid live score payload'));
            }
          });
        },
        onStompError: (frame) => {
          subscriber.error(new Error(frame.headers['message'] ?? 'WebSocket error'));
        },
        onWebSocketError: () => {
          // STOMP will reconnect automatically. Keep the scorer screen alive.
        }
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
