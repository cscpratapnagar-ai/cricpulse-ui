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
  it('recovers the saved session, confirmed snapshot and pending queue from a fresh store instance', async () => {
    const recoveryInningsId = 'offline-recovery-test-innings';
    const recoveryMatchId = 'offline-recovery-test-match';
    const recoveryCommandId = 'offline-recovery-test-command';
    const authoritative = score(recoveryInningsId, 12);
    const session = {
      matchId: recoveryMatchId,
      inningsId: recoveryInningsId,
      selectedBowlerId: 'bowler-2',
      match: { id: recoveryMatchId },
    };

    await store.saveSession(recoveryMatchId, session);
    await store.saveSnapshot(authoritative);
    await store.enqueue(queued(recoveryCommandId, recoveryInningsId, 500));

    // A new service instance has no cached database promise; it must read the
    // same durable IndexedDB records, as it would after a page reload.
    const restartedStore = new OfflineScoringStore();

    expect(await restartedStore.loadSession(recoveryMatchId)).toEqual(session);
    expect(await restartedStore.loadSnapshot(recoveryInningsId)).toEqual(authoritative);
    expect(await restartedStore.list(recoveryInningsId)).toEqual([
      jasmine.objectContaining({ commandId: recoveryCommandId, inningsId: recoveryInningsId }),
    ]);
  });

  it('keeps pending delivery queues isolated between innings', async () => {
    const inningsA = 'offline-isolation-innings-a';
    const inningsB = 'offline-isolation-innings-b';
    await store.enqueue(queued('offline-isolation-a-1', inningsA, 600));
    await store.enqueue(queued('offline-isolation-a-2', inningsA, 600));
    await store.enqueue(queued('offline-isolation-b-1', inningsB, 600));

    expect((await store.list(inningsA)).map((item) => item.commandId)).toEqual([
      'offline-isolation-a-1',
      'offline-isolation-a-2',
    ]);
    expect((await store.list(inningsB)).map((item) => item.commandId)).toEqual([
      'offline-isolation-b-1',
    ]);
    expect(await store.count(inningsA)).toBe(2);
    expect(await store.count(inningsB)).toBe(1);
  });

  it('removes only the selected pending command without affecting later commands', async () => {
    const removalInningsId = 'offline-removal-test-innings';
    await store.enqueue(queued('offline-removal-first', removalInningsId, 700));
    await store.enqueue(queued('offline-removal-second', removalInningsId, 700));

    await store.remove('offline-removal-first');

    expect((await store.list(removalInningsId)).map((item) => item.commandId)).toEqual([
      'offline-removal-second',
    ]);
  });
});
