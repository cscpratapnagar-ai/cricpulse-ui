import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SKIP_GLOBAL_LOADING } from '../interceptors/loading.interceptor';
import { Client, StompSubscription } from '@stomp/stompjs';
import {
  LiveScoreService,
  decideLiveScoreFrame,
  shouldAcceptLiveScoreSnapshot,
  scoringDeliveryHeaders,
} from './live-score.service';

describe('LiveScoreService', () => {
  let service: LiveScoreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LiveScoreService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(Client.prototype, 'activate').and.stub();
  });

  it('creates the service', () => expect(service).toBeTruthy());

  it('cancels the initial REST snapshot request when the watcher unsubscribes', () => {
    const watcher = service.watch('innings-1').subscribe();
    const request = httpMock.expectOne((candidate) =>
      candidate.url.endsWith('/api/public/innings/innings-1'),
    );

    watcher.unsubscribe();

    expect(request.cancelled).toBeTrue();
  });

  it('cancels an in-flight reconciliation request when the watcher unsubscribes', () => {
    const activateSpy = Client.prototype.activate as jasmine.Spy;
    activateSpy.and.callFake(function (this: Client) {
      this.onConnect({} as never);
    });
    spyOn(Client.prototype, 'subscribe').and.returnValue({
      id: 'test-subscription',
      unsubscribe: jasmine.createSpy('unsubscribe'),
    } as unknown as StompSubscription);

    const watcher = service.watch('innings-2').subscribe();
    const requests = httpMock.match((candidate) =>
      candidate.url.endsWith('/api/public/innings/innings-2'),
    );

    expect(requests.length).toBe(2);
    expect(requests[0].request.context.get(SKIP_GLOBAL_LOADING)).toBeFalse();
    expect(requests[1].request.context.get(SKIP_GLOBAL_LOADING)).toBeTrue();
    requests[0].flush({
      inningsId: 'innings-2',
      matchId: 'match-1',
      inningsNumber: 1,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      eventVersion: 1,
    });

    watcher.unsubscribe();

    expect(requests[1].cancelled).toBeTrue();
  });

  it('uses the versioned REST recovery snapshot to reject stale WebSocket frames', () => {
    const activateSpy = Client.prototype.activate as jasmine.Spy;
    activateSpy.and.callFake(function (this: Client) {
      this.onConnect({} as never);
    });
    const subscribeSpy = spyOn(Client.prototype, 'subscribe').and.returnValue({
      id: 'versioned-recovery-subscription',
      unsubscribe: jasmine.createSpy('unsubscribe'),
    } as unknown as StompSubscription);

    const receivedRuns: number[] = [];
    const watcher = service.watch('innings-recovery').subscribe((snapshot) => {
      receivedRuns.push(snapshot.runs);
    });
    const snapshots = httpMock.match((candidate) =>
      candidate.url.endsWith('/api/public/innings/innings-recovery'),
    );

    expect(snapshots.length).toBe(2);
    snapshots[0].flush({
      inningsId: 'innings-recovery',
      matchId: 'match-1',
      inningsNumber: 1,
      runs: 12,
      wickets: 0,
      legalBalls: 8,
      eventVersion: 7,
    });
    snapshots[1].flush({
      inningsId: 'innings-recovery',
      matchId: 'match-1',
      inningsNumber: 1,
      runs: 12,
      wickets: 0,
      legalBalls: 8,
      eventVersion: 7,
    });

    const onMessage = subscribeSpy.calls.mostRecent().args[1] as (message: {
      body: string;
    }) => void;
    onMessage({
      body: JSON.stringify({
        inningsId: 'innings-recovery',
        runs: 99,
        wickets: 1,
        legalBalls: 9,
        eventVersion: 6,
      }),
    });
    expect(receivedRuns).toEqual([12, 12]);

    onMessage({
      body: JSON.stringify({
        inningsId: 'innings-recovery',
        runs: 13,
        wickets: 0,
        legalBalls: 9,
        eventVersion: 8,
      }),
    });
    expect(receivedRuns).toEqual([12, 12, 13]);

    watcher.unsubscribe();
  });

  it('publishes connection and reconnect lifecycle without ending the score watcher', () => {
    const activateSpy = Client.prototype.activate as jasmine.Spy;
    let activeClient: Client | undefined;
    activateSpy.and.callFake(function (this: Client) {
      activeClient = this;
      this.onConnect({} as never);
    });
    spyOn(Client.prototype, 'subscribe').and.returnValue({
      id: 'connection-state-subscription',
      unsubscribe: jasmine.createSpy('unsubscribe'),
    } as unknown as StompSubscription);

    const states: string[] = [];
    const stateSubscription = service.connectionState$.subscribe((state) => states.push(state));
    const watcher = service.watch('innings-state').subscribe();

    expect(activeClient).toBeDefined();
    activeClient!.onWebSocketClose?.(new CloseEvent('close'));
    expect(states.slice(-3)).toEqual(['CONNECTING', 'CONNECTED', 'RECONNECTING']);

    watcher.unsubscribe();
    expect(states[states.length - 1]).toBe('DISCONNECTED');
    stateSubscription.unsubscribe();
  });

  it('keeps an initial feed error visible until the automatic retry starts', () => {
    const states: string[] = [];
    const stateSubscription = service.connectionState$.subscribe((state) => states.push(state));
    const watcher = service.watch('innings-error').subscribe({ error: () => undefined });
    const request = httpMock.expectOne((candidate) =>
      candidate.url.endsWith('/api/public/innings/innings-error'),
    );

    request.flush({}, { status: 503, statusText: 'Unavailable' });

    expect(states[states.length - 1]).toBe('ERROR');
    watcher.unsubscribe();
    stateSubscription.unsubscribe();
  });

  it('rejects an empty innings id', (done) => {
    service.watch('').subscribe({
      error: (error) => {
        expect(error.message).toContain('Innings ID is required');
        done();
      },
    });
  });
});

describe('decideLiveScoreFrame', () => {
  it('ignores duplicate and stale versions', () => {
    expect(decideLiveScoreFrame(7, 7)).toBe('ignore');
    expect(decideLiveScoreFrame(6, 7)).toBe('ignore');
  });

  it('requests reconciliation when an authoritative version is skipped', () => {
    expect(decideLiveScoreFrame(9, 7)).toBe('reconcile');
  });

  it('accepts the next authoritative version', () => {
    expect(decideLiveScoreFrame(8, 7)).toBe('accept');
  });

  it('accepts frames without a usable version', () => {
    expect(decideLiveScoreFrame(undefined, 7)).toBe('accept');
    expect(decideLiveScoreFrame(Number.NaN, 7)).toBe('accept');
  });
});

describe('shouldAcceptLiveScoreSnapshot', () => {
  it('rejects a REST snapshot older than the latest websocket event', () => {
    expect(shouldAcceptLiveScoreSnapshot(6, 7)).toBe(false);
  });

  it('accepts an equal or newer authoritative snapshot', () => {
    expect(shouldAcceptLiveScoreSnapshot(7, 7)).toBe(true);
    expect(shouldAcceptLiveScoreSnapshot(8, 7)).toBe(true);
  });

  it('accepts snapshots without a usable version for backward compatibility', () => {
    expect(shouldAcceptLiveScoreSnapshot(undefined, 7)).toBe(true);
    expect(shouldAcceptLiveScoreSnapshot(Number.NaN, 7)).toBe(true);
  });
});

describe('scoringDeliveryHeaders', () => {
  it('includes the stable command id and current scorer lease for replay writes', () => {
    expect(scoringDeliveryHeaders('command-123', 'lease-456')).toEqual({
      'X-Command-Id': 'command-123',
      'X-Scorer-Lease': 'lease-456',
    });
  });
});
