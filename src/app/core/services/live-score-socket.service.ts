import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { WS_ORIGIN } from '../config/api.config';

export type LiveSocketState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

interface AuthoritativeLiveScoreEvent {
  inningsId?: string;
  eventVersion?: number;
  sequenceNo?: number;
}

@Injectable({ providedIn: 'root' })
export class LiveScoreSocketService {
  private client?: Client;
  private subscription?: { unsubscribe(): void };
  private connectionToken = 0;
  private lastEventVersion = 0;
  private subscribedInningsId = '';
  private readonly stateSubject = new BehaviorSubject<LiveSocketState>('DISCONNECTED');

  readonly state$: Observable<LiveSocketState> = this.stateSubject.asObservable();

  connect(inningsId: string, onScore: (score: unknown) => void): void {
    if (!inningsId) return;

    const token = ++this.connectionToken;
    this.disconnect(false);
    this.subscribedInningsId = inningsId;
    this.lastEventVersion = 0;
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
        this.subscription = this.client?.subscribe(
          `/topic/innings/${inningsId}`,
          (message: IMessage) => {
            if (token !== this.connectionToken) return;
            try {
              const payload = JSON.parse(message.body) as AuthoritativeLiveScoreEvent;
              if (payload?.inningsId !== inningsId) return;

              const version = payload.eventVersion;
              if (typeof version === 'number' && Number.isFinite(version)) {
                if (version <= this.lastEventVersion) return;
                this.lastEventVersion = version;
              }

              onScore(payload);
            } catch {
              // Keep the socket healthy when a malformed event is received.
              // The REST reconciliation path remains the source of truth.
            }
          },
        );
      },
      onStompError: () => {
        if (token === this.connectionToken) this.stateSubject.next('ERROR');
      },
      onWebSocketError: () => {
        if (token === this.connectionToken) this.stateSubject.next('ERROR');
      },
      onWebSocketClose: () => {
        if (token !== this.connectionToken) return;
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
    this.subscribedInningsId = '';
    this.lastEventVersion = 0;
    if (client) void client.deactivate();
    if (updateState) {
      this.connectionToken++;
      this.stateSubject.next('DISCONNECTED');
    }
  }
}
