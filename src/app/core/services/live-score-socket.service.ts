import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { WS_ORIGIN } from '../config/api.config';

export type LiveSocketState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

@Injectable({ providedIn: 'root' })
export class LiveScoreSocketService {
  private client?: Client;
  private subscription?: { unsubscribe(): void };
  private readonly stateSubject = new BehaviorSubject<LiveSocketState>('DISCONNECTED');

  readonly state$: Observable<LiveSocketState> = this.stateSubject.asObservable();

  connect(inningsId: string, onScore: (score: unknown) => void): void {
    this.disconnect();
    this.stateSubject.next('CONNECTING');

    this.client = new Client({
      brokerURL: `${WS_ORIGIN}/ws`,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
      onConnect: () => {
        this.stateSubject.next('CONNECTED');
        this.subscription = this.client?.subscribe(`/topic/innings/${inningsId}`, (message: IMessage) => {
          try {
            onScore(JSON.parse(message.body));
          } catch {
            this.stateSubject.next('ERROR');
          }
        });
      },
      onStompError: () => this.stateSubject.next('ERROR'),
      onWebSocketError: () => this.stateSubject.next('ERROR'),
      onWebSocketClose: () => {
        if (this.stateSubject.value !== 'ERROR') this.stateSubject.next('DISCONNECTED');
      },
    });
    this.client.activate();
  }

  disconnect(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    if (this.client) this.client.deactivate();
    this.client = undefined;
    if (this.stateSubject.value !== 'ERROR') this.stateSubject.next('DISCONNECTED');
  }
}
