import { LiveScore } from './live-score.service';
import { OfflineScoringStore, QueuedDelivery } from './offline-scoring.store';

function score(inningsId: string, runs = 0): LiveScore {
  return {
    inningsId,
    matchId: 'match-1',
    inningsNumber: 1,
    runs,
    wickets: 0,
    legalBalls: runs ? 1 : 0,
    totalOvers: 20,
    status: 'LIVE',
    strikerId: 'batter-1',
    nonStrikerId: 'batter-2',
    currentBowlerId: 'bowler-1',
    batters: [],
    bowlers: [],
    overs: [],
    recentBalls: [],
    fallOfWickets: [],
  };
}

function queued(commandId: string, inningsId: string, createdAt: number): QueuedDelivery {
  return {
    commandId,
    inningsId,
    createdAt,
    payload: {
      inningsId,
      overNumber: 0,
      ballNumber: 1,
      strikerId: 'batter-1',
      nonStrikerId: 'batter-2',
      bowlerId: 'bowler-1',
      batRuns: 1,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
    },
  };
}

describe('OfflineScoringStore (IndexedDB)', () => {
  const store = new OfflineScoringStore();
  const inningsId = 'offline-store-test-innings';

  it('persists queued commands and enforces increasing local sequence timestamps per innings', async () => {
    await store.enqueue(queued('offline-store-cmd-1', inningsId, 100));
    await store.enqueue(queued('offline-store-cmd-2', inningsId, 100));
    await store.enqueue(queued('offline-store-cmd-3', inningsId, 50));

    const items = await store.list(inningsId);
    expect(items.map((item) => item.commandId)).toEqual([
      'offline-store-cmd-1',
      'offline-store-cmd-2',
      'offline-store-cmd-3',
    ]);
    expect(items[1].createdAt).toBeGreaterThan(items[0].createdAt);
    expect(items[2].createdAt).toBeGreaterThan(items[1].createdAt);
    expect(await store.count(inningsId)).toBe(3);
  });

  it('atomically acknowledges a command by removing it and saving the authoritative snapshot', async () => {
    const command = queued('offline-store-ack', inningsId, 200);
    await store.enqueue(command);
    const authoritative = score(inningsId, 4);

    await store.acknowledgeDelivery(command.commandId, authoritative);

    expect(
      (await store.list(inningsId)).some((item) => item.commandId === command.commandId),
    ).toBeFalse();
    expect(await store.loadSnapshot(inningsId)).toEqual(authoritative);
  });

  it('persists blocked and pending reconciliation states', async () => {
    const command = queued('offline-store-block', inningsId, 300);
    await store.enqueue(command);

    await store.markInningsQueueBlocked(inningsId);
    expect(
      (await store.list(inningsId)).find((item) => item.commandId === command.commandId)
        ?.syncStatus,
    ).toBe('BLOCKED');

    await store.markInningsQueuePending(inningsId);
    expect(
      (await store.list(inningsId)).find((item) => item.commandId === command.commandId)
        ?.syncStatus,
    ).toBe('PENDING');
  });

  it('restores a saved match session after reload', async () => {
    const session = { matchId: 'match-1', inningsId, selectedBowlerId: 'bowler-2' };
    await store.saveSession('offline-store-test-match', session);
    expect(await store.loadSession('offline-store-test-match')).toEqual(session);
  });
});
