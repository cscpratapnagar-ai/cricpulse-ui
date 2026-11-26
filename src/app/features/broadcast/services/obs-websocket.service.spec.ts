import { ObsWebSocketService } from './obs-websocket.service';

class FakeWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.OPEN;
  readonly sent: string[] = [];
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string): void {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('Socket is not open.');
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({} as CloseEvent);
  }

  emit(data: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  lastRequest(): { op: number; d: Record<string, unknown> } {
    return JSON.parse(this.sent[this.sent.length - 1]) as {
      op: number;
      d: Record<string, unknown>;
    };
  }
}

describe('ObsWebSocketService', () => {
  let service: ObsWebSocketService;
  let socket: FakeWebSocket;

  beforeEach(() => {
    service = new ObsWebSocketService();
    socket = new FakeWebSocket('ws://127.0.0.1:4455');
    spyOn(window, 'WebSocket').and.returnValue(socket as unknown as WebSocket);
    Object.defineProperty(window.WebSocket, 'OPEN', { configurable: true, value: 1 });
  });

  afterEach(() => {
    service.disconnect();
  });

  async function connectService(
    scenes: Array<{ sceneName: string; sceneIndex: number }> = [
      { sceneName: 'Scoreboard', sceneIndex: 1 },
      { sceneName: 'Camera', sceneIndex: 0 },
    ],
  ): Promise<void> {
    const connecting = service.connect('ws://127.0.0.1:4455', '');
    socket.emit({ op: 0, d: { rpcVersion: 1 } });
    await Promise.resolve();
    socket.emit({ op: 2, d: {} });
    await Promise.resolve();

    const request = socket.lastRequest();
    socket.emit({
      op: 7,
      d: {
        requestId: request.d['requestId'],
        requestStatus: { result: true, code: 100 },
        responseData: { scenes },
      },
    });
    await connecting;
  }

  it('identifies with OBS and returns scenes sorted by their scene index', async () => {
    await connectService();

    expect(service.connected).toBeTrue();
    expect(socket.url).toBe('ws://127.0.0.1:4455');
    expect(JSON.parse(socket.sent[0])).toEqual({
      op: 1,
      d: { rpcVersion: 1, eventSubscriptions: 4 },
    });
    expect(service.connected).toBeTrue();
  });

  it('correlates a scene-switch response with its pending request', async () => {
    await connectService();

    const switching = service.switchScene('Scoreboard');
    const request = socket.lastRequest();

    expect(request.op).toBe(6);
    expect(request.d['requestType']).toBe('SetCurrentProgramScene');
    expect(request.d['requestData']).toEqual({ sceneName: 'Scoreboard' });

    socket.emit({
      op: 7,
      d: {
        requestId: request.d['requestId'],
        requestStatus: { result: true, code: 100 },
        responseData: {},
      },
    });

    await expectAsync(switching).toBeResolved();
  });

  it('rejects OBS request failures with the server-provided reason', async () => {
    await connectService();

    const refreshing = service.refreshScenes();
    const request = socket.lastRequest();
    socket.emit({
      op: 7,
      d: {
        requestId: request.d['requestId'],
        requestStatus: { result: false, code: 500, comment: 'Scene collection is unavailable.' },
      },
    });

    await expectAsync(refreshing).toBeRejectedWithError('Scene collection is unavailable.');
  });

  it('rejects outstanding requests when the connection is deliberately closed', async () => {
    await connectService();

    const currentScene = service.currentScene();
    service.disconnect();

    await expectAsync(currentScene).toBeRejectedWithError('Disconnected from OBS.');
    expect(service.connected).toBeFalse();
  });

  it('ignores a stale socket close after a replacement connection is established', async () => {
    await connectService();
    const staleSocket = socket;
    const staleClose = staleSocket.onclose;
    service.disconnect();

    socket = new FakeWebSocket('ws://127.0.0.1:4455');
    (window.WebSocket as unknown as jasmine.Spy).and.returnValue(socket as unknown as WebSocket);
    await connectService();

    const currentScene = service.currentScene();
    const request = socket.lastRequest();
    staleClose?.({} as CloseEvent);

    expect(service.connected).toBeTrue();

    socket.emit({
      op: 7,
      d: {
        requestId: request.d['requestId'],
        requestStatus: { result: true, code: 100 },
        responseData: { currentProgramSceneName: 'Camera' },
      },
    });

    await expectAsync(currentScene).toBeResolvedTo('Camera');
    expect(service.connected).toBeTrue();
  });

  it('publishes external program scene changes from OBS events', async () => {
    await connectService();
    const changed: string[] = [];
    const subscription = service.sceneChanged$.subscribe((scene) => changed.push(scene));

    socket.emit({
      op: 5,
      d: { eventType: 'SceneChanged', eventData: { sceneName: 'Camera' } },
    });

    expect(changed).toEqual(['Camera']);
    subscription.unsubscribe();
  });

  it('enters reconnecting state and schedules automatic recovery after an unexpected close', async () => {
    const states: string[] = [];
    const messages: string[] = [];
    const attempts: number[] = [];
    const stateSubscription = service.connectionState$.subscribe((state) => states.push(state));
    const attemptSubscription = service.reconnectAttempt$.subscribe((attempt) =>
      attempts.push(attempt),
    );
    const lostSubscription = service.connectionLost$.subscribe((message) => messages.push(message));

    await connectService();
    expect(states[states.length - 1]).toBe('CONNECTED');

    socket.close();

    expect(states[states.length - 1]).toBe('RECONNECTING');
    expect(attempts[attempts.length - 1]).toBe(1);
    expect(messages.length).toBe(1);
    const internals = service as unknown as { reconnectTimer?: ReturnType<typeof setTimeout> };
    expect(internals.reconnectTimer).toBeDefined();

    service.disconnect();
    expect(states[states.length - 1]).toBe('DISCONNECTED');
    expect(internals.reconnectTimer).toBeUndefined();
    expect(attempts[attempts.length - 1]).toBe(0);
    stateSubscription.unsubscribe();
    attemptSubscription.unsubscribe();
    lostSubscription.unsubscribe();
  });

  it('rejects in-flight requests when OBS unexpectedly disconnects', async () => {
    await connectService();

    const currentScene = service.currentScene();
    socket.close();

    await expectAsync(currentScene).toBeRejectedWithError('OBS connection closed.');
    expect(service.connected).toBeFalse();
  });

  it('reconnects after the backoff and publishes the recovered scene list', async () => {
    jasmine.clock().install();
    try {
      await connectService();
      const recoveredSocket = new FakeWebSocket('ws://127.0.0.1:4455');
      (window.WebSocket as unknown as jasmine.Spy).and.returnValue(
        recoveredSocket as unknown as WebSocket,
      );
      const recoveredScenes: Array<{ sceneName: string; sceneIndex: number }> = [
        { sceneName: 'Live Scorebug', sceneIndex: 0 },
      ];
      let emittedScenes: Array<{ sceneName: string; sceneIndex: number }> | undefined;
      const subscription = service.reconnected$.subscribe((scenes) => (emittedScenes = scenes));

      socket.close();
      jasmine.clock().tick(1000);
      await Promise.resolve();

      expect(recoveredSocket.sent).toEqual([]);
      recoveredSocket.emit({ op: 0, d: { rpcVersion: 1 } });
      await Promise.resolve();
      recoveredSocket.emit({ op: 2, d: {} });
      await Promise.resolve();

      const request = recoveredSocket.lastRequest();
      expect(request.d['requestType']).toBe('GetSceneList');
      recoveredSocket.emit({
        op: 7,
        d: {
          requestId: request.d['requestId'],
          requestStatus: { result: true, code: 100 },
          responseData: { scenes: recoveredScenes },
        },
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(service.connected).toBeTrue();
      expect(emittedScenes).toEqual(recoveredScenes);
      subscription.unsubscribe();
    } finally {
      service.disconnect();
      jasmine.clock().uninstall();
    }
  });

  it('disconnects when the initial scene snapshot fails', async () => {
    const states: string[] = [];
    const subscription = service.connectionState$.subscribe((state) => states.push(state));
    const connecting = service.connect('ws://127.0.0.1:4455', '');

    socket.emit({ op: 0, d: { rpcVersion: 1 } });
    await Promise.resolve();
    socket.emit({ op: 2, d: {} });
    await Promise.resolve();

    const request = socket.lastRequest();
    expect(request.d['requestType']).toBe('GetSceneList');
    socket.emit({
      op: 7,
      d: {
        requestId: request.d['requestId'],
        requestStatus: { result: false, code: 500, comment: 'Scene collection unavailable.' },
      },
    });

    await expectAsync(connecting).toBeRejectedWithError('Scene collection unavailable.');
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(service.connected).toBeFalse();
    expect(states[states.length - 1]).toBe('DISCONNECTED');
    const internals = service as unknown as { reconnectTimer?: ReturnType<typeof setTimeout> };
    expect(internals.reconnectTimer).toBeUndefined();
    subscription.unsubscribe();
  });

  it('retries when the recovered scene snapshot fails', async () => {
    jasmine.clock().install();
    try {
      await connectService();
      const recoveredSocket = new FakeWebSocket('ws://127.0.0.1:4455');
      (window.WebSocket as unknown as jasmine.Spy).and.returnValue(
        recoveredSocket as unknown as WebSocket,
      );
      const states: string[] = [];
      const subscription = service.connectionState$.subscribe((state) => states.push(state));

      socket.close();
      jasmine.clock().tick(1000);
      await Promise.resolve();

      recoveredSocket.emit({ op: 0, d: { rpcVersion: 1 } });
      await Promise.resolve();
      recoveredSocket.emit({ op: 2, d: {} });
      await Promise.resolve();

      const request = recoveredSocket.lastRequest();
      expect(request.d['requestType']).toBe('GetSceneList');
      recoveredSocket.emit({
        op: 7,
        d: {
          requestId: request.d['requestId'],
          requestStatus: { result: false, code: 500, comment: 'Scene collection unavailable.' },
        },
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(recoveredSocket.readyState).toBe(FakeWebSocket.CLOSED);
      expect(service.connected).toBeFalse();
      expect(states[states.length - 1]).toBe('RECONNECTING');
      const internals = service as unknown as {
        reconnectTimer?: ReturnType<typeof setTimeout>;
        reconnectAttempts: number;
      };
      expect(internals.reconnectTimer).toBeDefined();
      expect(internals.reconnectAttempts).toBe(2);
      subscription.unsubscribe();
    } finally {
      service.disconnect();
      jasmine.clock().uninstall();
    }
  });

  it('rejects malformed scene-list responses instead of returning an empty list', async () => {
    const connecting = service.connect('ws://127.0.0.1:4455', '');
    socket.emit({ op: 0, d: { rpcVersion: 1 } });
    await Promise.resolve();
    socket.emit({ op: 2, d: {} });
    await Promise.resolve();

    const request = socket.lastRequest();
    socket.emit({
      op: 7,
      d: {
        requestId: request.d['requestId'],
        requestStatus: { result: true, code: 100 },
        responseData: { scenes: null },
      },
    });

    await expectAsync(connecting).toBeRejectedWithError('OBS returned an invalid scene list.');
  });

  it('times out a stalled OBS request without corrupting the active connection', async () => {
    jasmine.clock().install();
    try {
      await connectService();

      const timedOutRequest = service.currentScene();
      const request = socket.lastRequest();
      expect(request.d['requestType']).toBe('GetCurrentProgramScene');

      jasmine.clock().tick(8000);
      await expectAsync(timedOutRequest).toBeRejectedWithError(
        'OBS request timed out: GetCurrentProgramScene',
      );
      expect(service.connected).toBeTrue();

      const nextRequest = service.currentScene();
      const next = socket.lastRequest();
      expect(next.d['requestId']).not.toBe(request.d['requestId']);
      socket.emit({
        op: 7,
        d: {
          requestId: next.d['requestId'],
          requestStatus: { result: true, code: 100 },
          responseData: { currentProgramSceneName: 'Scoreboard' },
        },
      });

      await expectAsync(nextRequest).toBeResolvedTo('Scoreboard');
      expect(service.connected).toBeTrue();
    } finally {
      service.disconnect();
      jasmine.clock().uninstall();
    }
  });

  it(
    'ignores late responses for timed-out requests after their correlation is removed',
    async () => {
      jasmine.clock().install();
      try {
        await connectService();
  
        const timedOutRequest = service.currentScene();
        const request = socket.lastRequest();
        jasmine.clock().tick(8000);
        await expectAsync(timedOutRequest).toBeRejected();
  
        socket.emit({
          op: 7,
          d: {
            requestId: request.d['requestId'],
            requestStatus: { result: true, code: 100 },
            responseData: { currentProgramSceneName: 'Stale Scene' },
          },
        });
  
        const pending = service.currentScene();
        const next = socket.lastRequest();
        socket.emit({
          op: 7,
          d: {
            requestId: next.d['requestId'],
            requestStatus: { result: true, code: 100 },
            responseData: { currentProgramSceneName: 'Live Scene' },
          },
        });
  
        await expectAsync(pending).toBeResolvedTo('Live Scene');
        expect(service.connected).toBeTrue();
      } finally {
        service.disconnect();
        jasmine.clock().uninstall();
    },
  );
});
