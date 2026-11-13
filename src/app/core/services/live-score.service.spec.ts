import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  LiveScoreService,
  decideLiveScoreFrame,
  shouldAcceptLiveScoreSnapshot,
} from './live-score.service';

describe('LiveScoreService', () => {
  let service: LiveScoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(LiveScoreService);
  });

  it('creates the service', () => expect(service).toBeTruthy());

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
