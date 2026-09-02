import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { WS_ORIGIN } from '../config/api.config';

export type LiveSocketState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

@Injectable({ providedIn: 'root' })
export class LiveScoreSocketService {
  private client?: Client;
  private subscription?: { unsubscribe(): void };
  private connectionToken = 0;
  private readonly stateSubject = new BehaviorSubject<LiveSocketState>('DISCONNECTED');

  readonly state$: Observable<LiveSocketState> = this.stateSubject.asObservable();

  connect(inningsId: string, onScore: (score: unknown) => void): void {
    if (!inningsId) return;

    const token = ++this.connectionToken;
    this.disconnect(false);
    this.stateSubject.next('CONNECTING');

    this.client = new Client({
      brokerURL: `${WS_ORIGIN}/ws`,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
      onConnect: () => {
        if (token !== this.connectionToken) return;
        this.stateSubject.next('CONNECTED');
        this.subscription = this.client?.subscribe(`/topic/innings/${inningsId}`, (message: IMessage) => {
          if (token !== this.connectionToken) return;
          try {
            onScore(JSON.parse(message.body));
          } catch {
            // Keep the socket healthy when a malformed event is received.
            // The REST reconciliation path remains the source of truth.
          }
        });
      },
      onStompError: () => {
        if (token === this.connectionToken) this.stateSubject.next('ERROR');
      },
      onWebSocketError: () => {
        if (token === this.connectionToken) this.stateSubject.next('ERROR');
      },
      onWebSocketClose: () => {
        if (token !== this.connectionToken) return;
        // STOMP will retry automatically. CONNECTING makes that lifecycle
        // visible to the scorer instead of leaving the UI stuck on ERROR.
        this.stateSubject.next('CONNECTING');
      },
    });

    this.client.activate();
  }

  disconnect(updateState = true): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    const client = this.client;
    this.client = undefined;
    if (client) void client.deactivate();
    if (updateState) {
      this.connectionToken++;
      this.stateSubject.next('DISCONNECTED');
    }
  }
}
