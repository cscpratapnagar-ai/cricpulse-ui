import { Injectable } from '@angular/core';

export interface ObsScene {
  sceneName: string;
  sceneIndex: number;
}

interface ObsEnvelope {
  op: number;
  d: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ObsWebSocketService {
  private socket?: WebSocket;
  private requestSequence = 0;
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
    this.disconnect();
    const socket = new WebSocket(url);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      const handshakeTimeout = setTimeout(() => {
        socket.close();
        reject(new Error('OBS connection timed out. Check host, port and firewall.'));
      }, 8000);
      const fail = (error: Error) => {
        clearTimeout(handshakeTimeout);
        reject(error);
      };
      socket.onerror = () =>
        fail(new Error('Could not connect to OBS WebSocket. Enable it in OBS Tools → WebSocket Server Settings.'));
      socket.onclose = () => {
        clearTimeout(handshakeTimeout);
        this.identified = false;
        this.rejectPending(new Error('OBS connection closed.'));
        fail(new Error('OBS closed the connection. Verify the password and WebSocket settings.'));
      };
      socket.onmessage = async (event) => {
        try {
          const envelope = JSON.parse(String(event.data)) as ObsEnvelope;
          if (envelope.op === 0) {
            const identify = await this.createIdentifyPayload(envelope.d, password);
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ op: 1, d: identify }));
            }
          } else if (envelope.op === 2) {
            this.identified = true;
            clearTimeout(handshakeTimeout);
            resolve();
          } else if (envelope.op === 7) {
            const requestId = String(envelope.d['requestId'] ?? '');
            const pending = this.pending.get(requestId);
            if (!pending) return;
            clearTimeout(pending.timer);
            this.pending.delete(requestId);
            const status = envelope.d['requestStatus'] as { result?: boolean; code?: number; comment?: string } | undefined;
            if (status?.result) {
              pending.resolve((envelope.d['responseData'] as Record<string, unknown>) || {});
            } else {
              pending.reject(new Error(status?.comment || `OBS request failed (${status?.code ?? 'unknown'}).`));
            }
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error('OBS handshake failed.'));
          socket.close();
        }
      };
    });

    if (this.socket !== socket || !this.identified) throw new Error('OBS identification failed.');
    const response = await this.request('GetSceneList');
    return this.parseScenes(response);
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
    this.identified = false;
    this.rejectPending(new Error('Disconnected from OBS.'));
    const oldSocket = this.socket;
    this.socket = undefined;
    if (oldSocket && oldSocket.readyState < WebSocket.CLOSING) oldSocket.close();
  }

  private parseScenes(response: Record<string, unknown>): ObsScene[] {
    return ((response['scenes'] as Array<Record<string, unknown>>) || []).map((scene, index) => ({
      sceneName: String(scene['sceneName'] || ''),
      sceneIndex: Number(scene['sceneIndex'] ?? index),
    }));
  }

  private request(requestType: string, requestData: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (!this.connected || !this.socket) return Promise.reject(new Error('Connect to OBS first.'));
    const requestId = `cricpulse-${++this.requestSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`OBS request timed out: ${requestType}`));
      }, 8000);
      this.pending.set(requestId, { resolve, reject, timer });
      this.socket!.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
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
    if (!auth) return { rpcVersion };
    if (!password) throw new Error('OBS requires a WebSocket password. Enter it to connect.');
    const secret = await this.sha256Base64(password + (auth.salt || ''));
    const authentication = await this.sha256Base64(secret + (auth.challenge || ''));
    return { rpcVersion, authentication };
  }

  private async sha256Base64(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const binary = Array.from(new Uint8Array(digest), (byte) => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }
}
