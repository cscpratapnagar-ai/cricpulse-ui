import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ObsScene {
  sceneName: string;
  sceneIndex: number;
}

interface ObsEnvelope {
  op: number;
  d: Record<string, unknown>;
}

export type ObsConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

@Injectable({ providedIn: 'root' })
export class ObsWebSocketService {
  readonly sceneChanged$ = new Subject<string>();
  readonly connectionLost$ = new Subject<string>();
  readonly reconnected$ = new Subject<ObsScene[]>();
  private readonly connectionStateSubject = new BehaviorSubject<ObsConnectionState>('DISCONNECTED');
  readonly connectionState$ = this.connectionStateSubject.asObservable();
  private readonly reconnectAttemptSubject = new BehaviorSubject<number>(0);
  readonly reconnectAttempt$ = this.reconnectAttemptSubject.asObservable();

  private socket?: WebSocket;
  private requestSequence = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private reconnectConfig?: { url: string; password: string };
  private manuallyDisconnected = true;
  private readonly pending = new Map<
    string,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private identified = false;

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN && this.identified;
  }

  async connect(url: string, password: string): Promise<ObsScene[]> {
    this.reconnectConfig = { url, password };
    this.manuallyDisconnected = false;
    this.cancelReconnect();
    return this.establish(url, password, false);
  }

  private async establish(url: string, password: string, recovering: boolean): Promise<ObsScene[]> {
    this.closeCurrentSocket();
    this.connectionStateSubject.next(recovering ? 'RECONNECTING' : 'CONNECTING');
    const socket = new WebSocket(url);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const handshakeTimeout = setTimeout(() => {
        socket.close();
        fail(new Error('OBS connection timed out. Check host, port and firewall.'));
      }, 8000);
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(handshakeTimeout);
        reject(error);
      };
      socket.onerror = () => {
        fail(
          new Error(
            'Could not connect to OBS WebSocket. Enable it in OBS Tools → WebSocket Server Settings.',
          ),
        );
      };
      socket.onclose = () => {
        if (this.socket !== socket) {
          fail(new Error('OBS connection was superseded.'));
          return;
        }
        clearTimeout(handshakeTimeout);
        this.identified = false;
        this.rejectPending(new Error('OBS connection closed.'));
        this.socket = undefined;
        if (!this.manuallyDisconnected && this.reconnectConfig) {
          this.connectionStateSubject.next('RECONNECTING');
          this.connectionLost$.next('OBS connection lost. Reconnecting automatically…');
          this.scheduleReconnect();
        } else {
          this.connectionStateSubject.next('DISCONNECTED');
        }
        fail(new Error('OBS closed the connection. Verify the password and WebSocket settings.'));
      };
      socket.onmessage = async (event) => {
        if (this.socket !== socket) return;
        try {
          const envelope = JSON.parse(String(event.data)) as ObsEnvelope;
          if (envelope.op === 0) {
            const identify = await this.createIdentifyPayload(envelope.d, password);
            if (socket.readyState === WebSocket.OPEN && this.socket === socket) {
              socket.send(JSON.stringify({ op: 1, d: identify }));
            }
          } else if (envelope.op === 2) {
            if (settled) return;
            settled = true;
            this.identified = true;
            this.connectionStateSubject.next('CONNECTED');
            clearTimeout(handshakeTimeout);
            resolve();
          } else if (envelope.op === 5) {
            if (envelope.d['eventType'] === 'SceneChanged') {
              const eventData = envelope.d['eventData'] as Record<string, unknown> | undefined;
              const sceneName = String(eventData?.['sceneName'] || '');
              if (sceneName) this.sceneChanged$.next(sceneName);
            }
          } else if (envelope.op === 7) {
            const requestId = String(envelope.d['requestId'] ?? '');
            const pending = this.pending.get(requestId);
            if (!pending) return;
            clearTimeout(pending.timer);
            this.pending.delete(requestId);
            const status = envelope.d['requestStatus'] as
              | { result?: boolean; code?: number; comment?: string }
              | undefined;
            if (status?.result) {
              pending.resolve((envelope.d['responseData'] as Record<string, unknown>) || {});
            } else {
              pending.reject(
                new Error(status?.comment || `OBS request failed (${status?.code ?? 'unknown'}).`),
              );
            }
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error('OBS handshake failed.'));
          socket.close();
        }
      };
    });

    if (this.socket !== socket || !this.identified) throw new Error('OBS identification failed.');
    try {
      const scenes = this.parseScenes(await this.request('GetSceneList'));
      this.reconnectAttempts = 0;
      this.reconnectAttemptSubject.next(0);
      if (recovering) this.reconnected$.next(scenes);
      return scenes;
    } catch (error) {
      if (recovering && !this.manuallyDisconnected) this.scheduleReconnect();
      throw error;
    }
  }

  async currentScene(): Promise<string> {
    const response = await this.request('GetCurrentProgramScene');
    return String(response['currentProgramSceneName'] || '');
  }

  async switchScene(sceneName: string): Promise<void> {
    await this.request('SetCurrentProgramScene', { sceneName });
  }

  async refreshScenes(): Promise<ObsScene[]> {
    return this.parseScenes(await this.request('GetSceneList'));
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.reconnectConfig = undefined;
    this.cancelReconnect();
    this.closeCurrentSocket();
    this.connectionStateSubject.next('DISCONNECTED');
  }

  private closeCurrentSocket(): void {
    this.identified = false;
    this.rejectPending(new Error('Disconnected from OBS.'));
    const oldSocket = this.socket;
    this.socket = undefined;
    if (oldSocket && oldSocket.readyState < WebSocket.CLOSING) oldSocket.close();
  }

  private scheduleReconnect(): void {
    if (this.manuallyDisconnected || !this.reconnectConfig || this.reconnectTimer) return;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.reconnectAttempts, 5));
    this.reconnectAttempts++;
    this.reconnectAttemptSubject.next(this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      const config = this.reconnectConfig;
      if (!config || this.manuallyDisconnected) return;
      void this.establish(config.url, config.password, true).catch(() => {
        if (!this.manuallyDisconnected) this.scheduleReconnect();
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.reconnectAttempts = 0;
    this.reconnectAttemptSubject.next(0);
  }

  private parseScenes(response: Record<string, unknown>): ObsScene[] {
    const rawScenes = response['scenes'];
    if (!Array.isArray(rawScenes)) throw new Error('OBS returned an invalid scene list.');
    return rawScenes
      .map((scene, index) => {
        const item = scene as Record<string, unknown>;
        return {
          sceneName: String(item['sceneName'] || ''),
          sceneIndex: Number(item['sceneIndex'] ?? index),
        };
      })
      .filter((scene) => scene.sceneName.length > 0)
      .sort((a, b) => a.sceneIndex - b.sceneIndex);
  }

  private request(
    requestType: string,
    requestData: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    if (!this.connected || !this.socket) return Promise.reject(new Error('Connect to OBS first.'));
    const socket = this.socket;
    const requestId = `cricpulse-${++this.requestSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`OBS request timed out: ${requestType}`));
      }, 8000);
      this.pending.set(requestId, { resolve, reject, timer });
      try {
        socket.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(`OBS request failed: ${requestType}`));
      }
    });
  }

  private rejectPending(error: Error): void {
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
  }

  private async createIdentifyPayload(
    hello: Record<string, unknown>,
    password: string,
  ): Promise<Record<string, unknown>> {
    const rpcVersion = Number(hello['rpcVersion'] || 1);
    const auth = hello['authentication'] as { salt?: string; challenge?: string } | undefined;
    const eventSubscriptions = 4;
    if (!auth) return { rpcVersion, eventSubscriptions };
    if (!password) throw new Error('OBS requires a WebSocket password. Enter it to connect.');
    const secret = await this.sha256Base64(password + (auth.salt || ''));
    const authentication = await this.sha256Base64(secret + (auth.challenge || ''));
    return { rpcVersion, authentication, eventSubscriptions };
  }

  private async sha256Base64(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const binary = Array.from(new Uint8Array(digest), (byte) => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }
}
