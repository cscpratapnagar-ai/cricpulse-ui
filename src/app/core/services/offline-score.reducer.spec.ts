import { LiveScore } from './live-score.service';
import { isTransientOfflineSyncStatus, offlineQueueIdentityError, projectOfflineDelivery } from './offline-score.reducer';
import { QueuedDelivery } from './offline-scoring.store';

const baseScore = (): LiveScore => ({
  inningsId: 'innings-1',
  matchId: 'match-1',
  inningsNumber: 1,
  runs: 0,
  wickets: 0,
  legalBalls: 0,
  totalOvers: 20,
  status: 'LIVE',
  targetRuns: null,
  currentOver: 0,
  currentBall: 0,
  strikerId: 'batter-1',
  nonStrikerId: 'batter-2',
  currentBowlerId: 'bowler-1',
  batters: [],
  bowlers: [],
  overs: [],
  recentBalls: [],
  fallOfWickets: [],
  partnership: { batterOneId: 'batter-1', batterTwoId: 'batter-2', runs: 0, balls: 0 },
});

function command(id: string, overrides: Partial<QueuedDelivery['payload']> = {}): QueuedDelivery {
  return {
    commandId: id,
    matchId: 'match-1',
    inningsId: 'innings-1',
    createdAt: Number(id),
    payload: {
      inningsId: 'innings-1',
      overNumber: 0,
      ballNumber: 1,
      strikerId: 'batter-1',
      nonStrikerId: 'batter-2',
      bowlerId: 'bowler-1',
      batRuns: 0,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
      ...overrides,
    },
  };
}

describe('offlineQueueIdentityError', () => {
  it('allows a delivery only when match, queue innings and payload innings all match', () => {
    expect(offlineQueueIdentityError(command('identity-1'), 'match-1', 'innings-1')).toBeNull();
  });

  it('rejects a command from another match', () => {
    expect(offlineQueueIdentityError(command('identity-2'), 'match-2', 'innings-1')).toMatch(/different match/);
  });

  it('rejects a command from another innings', () => {
    const item = command('identity-3');
    item.inningsId = 'innings-2';
    expect(offlineQueueIdentityError(item, 'match-1', 'innings-1')).toMatch(/different innings/);
  });

  it('rejects payload innings mismatch even if queue metadata is correct', () => {
    const item = command('identity-4', { inningsId: 'other-innings' });
    expect(offlineQueueIdentityError(item, 'match-1', 'innings-1')).toMatch(/payload innings/);
  });

  it('rejects legacy commands without a verified match identity', () => {
    const item = command('identity-5');
    delete item.matchId;
    expect(offlineQueueIdentityError(item, 'match-1', 'innings-1')).toMatch(/no verified match identity/);
  });
});

describe('projectOfflineDelivery', () => {
  it('projects a legal boundary and advances batter and bowler figures', () => {
    const next = projectOfflineDelivery(baseScore(), command('cmd-1', { batRuns: 4 }));
    expect(next.runs).toBe(4);
    expect(next.legalBalls).toBe(1);
    expect(next.batters?.[0]).toEqual(
      jasmine.objectContaining({
        playerId: 'batter-1',
        runs: 4,
        ballsFaced: 1,
        fours: 1,
      }),
    );
    expect(next.bowlers?.[0]).toEqual(
      jasmine.objectContaining({
        playerId: 'bowler-1',
        runsConceded: 4,
        legalBalls: 1,
      }),
    );
    expect(next.recentBalls?.length).toBe(1);
  });

  it('does not advance the legal ball for a wide and rotates strike only for completed wide runs', () => {
    const next = projectOfflineDelivery(
      baseScore(),
      command('cmd-2', {
        extraType: 'WIDE',
        extraRuns: 2,
      }),
    );
    expect(next.runs).toBe(2);
    expect(next.legalBalls).toBe(0);
    expect(next.strikerId).toBe('batter-2');
    expect(next.nonStrikerId).toBe('batter-1');
  });

  it('handles wicket replacement and resets the partnership', () => {
    const next = projectOfflineDelivery(
      baseScore(),
      command('cmd-3', {
        wicketType: 'BOWLED',
        dismissedPlayerId: 'batter-1',
        newBatterId: 'batter-3',
      }),
    );
    expect(next.wickets).toBe(1);
    expect(next.strikerId).toBe('batter-3');
    expect(next.batters?.find((b) => b.playerId === 'batter-1')?.out).toBeTrue();
    expect(next.partnership).toEqual(
      jasmine.objectContaining({
        batterOneId: 'batter-3',
        runs: 0,
        balls: 0,
      }),
    );
    expect(next.fallOfWickets?.length).toBe(1);
  });

  it('rejects a queued delivery whose match ID differs from the score snapshot', () => {
    const item = command('cmd-match-mismatch');
    item.matchId = 'other-match';
    expect(() => projectOfflineDelivery(baseScore(), item)).toThrowError(/different match/);
  });

  it('rejects a queued command based on a stale batting state', () => {
    const score = { ...baseScore(), strikerId: 'changed-batter' };
    expect(() => projectOfflineDelivery(score, command('cmd-4'))).toThrowError(/does not match/);
  });

  it('completes an innings at the configured over limit', () => {
    const score = { ...baseScore(), legalBalls: 119, currentOver: 19, currentBall: 5 };
    const next = projectOfflineDelivery(
      score,
      command('cmd-5', {
        overNumber: 19,
        ballNumber: 6,
        batRuns: 1,
      }),
    );
    expect(next.legalBalls).toBe(120);
    expect(next.status).toBe('COMPLETED');
  });

  it('keeps a no-ball out of legal-ball and batter-ball counts while charging the bowler', () => {
    const next = projectOfflineDelivery(
      baseScore(),
      command('cmd-6', { extraType: 'NO_BALL', extraRuns: 1, batRuns: 2 }),
    );
    expect(next.runs).toBe(3);
    expect(next.legalBalls).toBe(0);
    expect(next.batters?.[0].runs).toBe(2);
    expect(next.batters?.[0].ballsFaced).toBe(0);
    expect(next.bowlers?.[0].runsConceded).toBe(3);
    expect(next.bowlers?.[0].legalBalls).toBe(0);
    expect(next.bowlers?.[0].noBalls).toBe(1);
  });

  it('records byes as team runs without charging the bowler', () => {
    const next = projectOfflineDelivery(
      baseScore(),
      command('cmd-7', { extraType: 'BYE', extraRuns: 2 }),
    );
    expect(next.runs).toBe(2);
    expect(next.legalBalls).toBe(1);
    expect(next.bowlers?.[0].runsConceded).toBe(0);
    expect(next.bowlers?.[0].legalBalls).toBe(1);
    expect(next.overs?.[0].byes).toBe(2);
    expect(next.overs?.[0].runs).toBe(2);
  });

  it('completes the second innings as soon as the target is reached', () => {
    const score = { ...baseScore(), inningsNumber: 2, targetRuns: 5, runs: 4 };
    const next = projectOfflineDelivery(score, command('cmd-8', { batRuns: 1 }));
    expect(next.runs).toBe(5);
    expect(next.status).toBe('COMPLETED');
  });

  it('completes an innings on the tenth wicket without requiring a replacement batter', () => {
    const score = { ...baseScore(), wickets: 9 };
    const next = projectOfflineDelivery(
      score,
      command('cmd-9', { wicketType: 'BOWLED', dismissedPlayerId: 'batter-1' }),
    );
    expect(next.wickets).toBe(10);
    expect(next.strikerId).toBeNull();
    expect(next.status).toBe('COMPLETED');
  });
});

describe('isTransientOfflineSyncStatus', () => {
  it('retries network, timeout, early, throttling and server errors', () => {
    [0, 408, 425, 429, 500, 502, 503, 599].forEach((status) => {
      expect(isTransientOfflineSyncStatus(status)).withContext(String(status)).toBeTrue();
    });
  });

  it('does not retry permanent client or invalid statuses', () => {
    [400, 401, 403, 404, 409, 422, 499, 600, 'invalid'].forEach((status) => {
      expect(isTransientOfflineSyncStatus(status)).withContext(String(status)).toBeFalse();
    });
  });
});
