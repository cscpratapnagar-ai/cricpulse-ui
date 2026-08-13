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
}

@Injectable({ providedIn: 'root' })
export class LiveScoreService {
  private readonly apiUrl = 'http://localhost:8080';

  watch(inningsId: string): Observable<LiveScore> {
    return new Observable<LiveScore>((subscriber) => {
      const client = new Client({
        brokerURL: this.apiUrl.replace('http', 'ws') + '/ws',
        reconnectDelay: 5000,
        onConnect: () => {
          subscription = client.subscribe(`/topic/innings/${inningsId}`, (message: IMessage) => {
            subscriber.next(JSON.parse(message.body) as LiveScore);
          });
        },
        onStompError: (frame) => subscriber.error(frame.headers['message'] ?? 'WebSocket error')
      });
      let subscription: StompSubscription | undefined;
      client.activate();
      return () => {
        subscription?.unsubscribe();
        void client.deactivate();
      };
    });
  }
}
