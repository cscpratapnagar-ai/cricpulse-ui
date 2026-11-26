import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { WS_ORIGIN } from '../config/api.config';

export type LiveSocketState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

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
  private lastEventVersion = -1;
  private lastSequenceNo = -1;
  private hasVersionedEvent = false;
  private readonly stateSubject = new BehaviorSubject<LiveSocketState>('DISCONNECTED');
  private readonly reconnectAttemptsSubject = new BehaviorSubject<number>(0);
  private readonly lastMessageAtSubject = new BehaviorSubject<Date | null>(null);

  readonly state$: Observable<LiveSocketState> = this.stateSubject.asObservable();
  readonly reconnectAttempts$: Observable<number> = this.reconnectAttemptsSubject.asObservable();
  readonly lastMessageAt$: Observable<Date | null> = this.lastMessageAtSubject.asObservable();

  connect(inningsId: string, onScore: (score: unknown) => void): void {
    if (!inningsId) return;

    const token = ++this.connectionToken;
    this.disconnect(false);
    this.lastEventVersion = -1;
    this.lastSequenceNo = -1;
    this.hasVersionedEvent = false;
    this.reconnectAttemptsSubject.next(0);
    this.lastMessageAtSubject.next(null);
    this.stateSubject.next('CONNECTING');

    const accessToken = localStorage.getItem('cricketpulse_access_token');
    this.client = new Client({
      brokerURL: `${WS_ORIGIN}/ws`,
      connectHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
      onConnect: () => {
        if (token !== this.connectionToken) return;
        this.reconnectAttemptsSubject.next(0);
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
                this.hasVersionedEvent = true;
              } else {
                // Once this innings has emitted a versioned event, an
                // unversioned legacy frame cannot prove that it is newer.
                if (this.hasVersionedEvent) return;
                const sequence = payload.sequenceNo;
                if (typeof sequence === 'number' && Number.isFinite(sequence)) {
                  if (sequence <= this.lastSequenceNo) return;
                  this.lastSequenceNo = sequence;
                } else if (this.lastSequenceNo >= 0) {
                  // Do not let an unsequenced frame regress a feed after
                  // sequence ordering has become available.
                  return;
                }
              }

              this.lastMessageAtSubject.next(new Date());
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
        if (token !== this.connectionToken) return;
        this.stateSubject.next('RECONNECTING');
      },
      onWebSocketClose: () => {
        if (token !== this.connectionToken) return;
        this.reconnectAttemptsSubject.next(this.reconnectAttemptsSubject.value + 1);
        this.stateSubject.next('RECONNECTING');
      },
    });

    this.client.activate();
  }

  disconnect(updateState = true): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    const client = this.client;
    this.client = undefined;
    this.lastEventVersion = 0;
    if (client) void client.deactivate();
    if (updateState) {
      this.connectionToken++;
      this.reconnectAttemptsSubject.next(0);
      this.lastMessageAtSubject.next(null);
      this.stateSubject.next('DISCONNECTED');
    }
  }
}
