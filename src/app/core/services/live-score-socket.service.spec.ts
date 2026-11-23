import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import { LiveScoreSocketService } from './live-score-socket.service';

describe('LiveScoreSocketService', () => {
  let service: LiveScoreSocketService;
  let activateSpy: jasmine.Spy;
  let subscribeSpy: jasmine.Spy;
  let deactivateSpy: jasmine.Spy;

  beforeEach(() => {
    service = new LiveScoreSocketService();
    localStorage.removeItem('cricketpulse_access_token');

    activateSpy = spyOn(Client.prototype, 'activate').and.callFake(function (this: Client): void {
      this.onConnect?.({} as IFrame);
    });
    subscribeSpy = spyOn(Client.prototype, 'subscribe').and.returnValue({
      id: 'live-score-test',
      unsubscribe: jasmine.createSpy('unsubscribe'),
    } as unknown as StompSubscription);
    deactivateSpy = spyOn(Client.prototype, 'deactivate').and.returnValue(Promise.resolve());
  });

  afterEach(() => {
    service.disconnect();
  });

  function connect(inningsId = 'innings-a'): (message: unknown) => void {
    service.connect(inningsId, onScore);
    expect(activateSpy).toHaveBeenCalled();
    expect(subscribeSpy).toHaveBeenCalledWith(`/topic/innings/${inningsId}`, jasmine.any(Function));
    return subscribeSpy.calls.mostRecent().args[1] as (message: unknown) => void;
  }

  let onScore: jasmine.Spy;

  beforeEach(() => {
    onScore = jasmine.createSpy('onScore');
  });

  function emit(handler: (message: unknown) => void, payload: Record<string, unknown>): void {
    handler({ body: JSON.stringify(payload) } as IMessage);
  }

  it('publishes the timestamp of the latest accepted score event', () => {
    const handler = connect();
    let lastMessageAt: Date | null = null;
    service.lastMessageAt$.subscribe((value) => (lastMessageAt = value));

    emit(handler, { inningsId: 'innings-a', eventVersion: 1, runs: 1 });

    expect(lastMessageAt instanceof Date).toBeTrue();
  });

  it('ignores stale events without refreshing the last-message timestamp', () => {
    const handler = connect();
    emit(handler, { inningsId: 'innings-a', eventVersion: 2, runs: 2 });
    let lastMessageAt: Date | null = null;
    service.lastMessageAt$.subscribe((value) => (lastMessageAt = value));
    const acceptedAt = lastMessageAt;

    emit(handler, { inningsId: 'innings-a', eventVersion: 1, runs: 1 });

    expect(lastMessageAt).toBe(acceptedAt);
  });

  it('reports websocket loss as reconnecting and resets attempts after reconnect', () => {
    let state = '';
    let attempts = 0;
    service.state$.subscribe((value) => (state = value));
    service.reconnectAttempts$.subscribe((value) => (attempts = value));
    activateSpy.and.callFake(function (this: Client): void {
      this.onWebSocketClose?.({} as CloseEvent);
    });

    service.connect('innings-a', onScore);

    expect(state).toBe('RECONNECTING');
    expect(attempts).toBe(1);

    activateSpy.and.callFake(function (this: Client): void {
      this.onConnect?.({} as IFrame);
    });
    service.connect('innings-a', onScore);

    expect(state).toBe('CONNECTED');
    expect(attempts).toBe(0);
  });

  it('delivers only strictly newer authoritative versions', () => {
    const handler = connect();

    emit(handler, { inningsId: 'innings-a', eventVersion: 10, runs: 4 });
    emit(handler, { inningsId: 'innings-a', eventVersion: 10, runs: 4 });
    emit(handler, { inningsId: 'innings-a', eventVersion: 9, runs: 2 });
    emit(handler, { inningsId: 'innings-a', eventVersion: 11, runs: 6 });

    expect(onScore).toHaveBeenCalledTimes(2);
    const deliveredRuns = onScore.calls
      .allArgs()
      .map(([score]) => (score as { runs: number }).runs);
    expect(deliveredRuns).toEqual([4, 6]);
  });

  it('ignores snapshots belonging to a different innings', () => {
    const handler = connect('innings-a');

    emit(handler, { inningsId: 'innings-b', eventVersion: 1, runs: 99 });
    emit(handler, { inningsId: 'innings-a', eventVersion: 1, runs: 1 });

    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(
      jasmine.objectContaining({
        inningsId: 'innings-a',
        runs: 1,
      }),
    );
  });

  it('ignores malformed JSON without terminating the live subscription', () => {
    const handler = connect();

    handler({ body: '{invalid-json' } as IMessage);
    emit(handler, { inningsId: 'innings-a', eventVersion: 1, runs: 1 });

    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(jasmine.objectContaining({ runs: 1 }));
  });

  it('resets the version baseline when switching to another innings', () => {
    const firstHandler = connect('innings-a');
    emit(firstHandler, { inningsId: 'innings-a', eventVersion: 20, runs: 20 });

    const secondHandler = connect('innings-b');
    emit(secondHandler, { inningsId: 'innings-b', eventVersion: 1, runs: 1 });

    expect(onScore).toHaveBeenCalledTimes(2);
    expect(deactivateSpy).toHaveBeenCalled();
  });

  it('does not allow a stale subscription callback to update a replacement connection', () => {
    const staleHandler = connect('innings-a');
    const currentHandler = connect('innings-b');

    emit(staleHandler, { inningsId: 'innings-a', eventVersion: 99, runs: 99 });
    emit(currentHandler, { inningsId: 'innings-b', eventVersion: 1, runs: 1 });

    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(
      jasmine.objectContaining({
        inningsId: 'innings-b',
        runs: 1,
      }),
    );
  });
});
