import { LiveScore } from './live-score.service';
import {
  offlineDeliveryMatchesRecentBall,
  restoreOfflineQueueProjection,
} from './offline-score.reducer';
import { OfflineScoringStore, QueuedDelivery } from './offline-scoring.store';

/**
 * Runtime-level IndexedDB regression tests that join the durable store and the
 * offline projection. Existing unit tests cover each in isolation; these tests
 * exercise the browser-persistence boundary across fresh store instances.
 */
describe('Offline scoring runtime certification (IndexedDB + projection)', () => {
  const store = new OfflineScoringStore();

  function score(inningsId: string, matchId: string): LiveScore {
    return {
      inningsId,
      matchId,
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
    };
  }

  function delivery(
    commandId: string,
    matchId: string,
    inningsId: string,
    createdAt: number,
    payload: Partial<QueuedDelivery['payload']>,
  ): QueuedDelivery {
    return {
      commandId,
      matchId,
      inningsId,
      createdAt,
      payload: {
        inningsId,
        overNumber: 0,
        ballNumber: 1,
        strikerId: 'batter-1',
        nonStrikerId: 'batter-2',
        bowlerId: 'bowler-1',
        batRuns: 0,
        extraRuns: 0,
        extraType: null,
        wicketType: null,
        legalDelivery: true,
        ...payload,
      },
    };
  }

  it('restores snapshot, session and ordered pending deliveries after a cold store restart without duplicating projection', async () => {
    const runId = `runtime-restart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const matchId = `${runId}-match`;
    const inningsId = `${runId}-innings`;
    const commandIds = [`${runId}-wide`, `${runId}-four`, `${runId}-single`];
    const snapshot = score(inningsId, matchId);
    const session = { matchId, inningsId, selectedBowlerId: 'bowler-1' };

    const queue = [
      delivery(commandIds[0], matchId, inningsId, 100, {
        extraType: 'WIDE',
        extraRuns: 1,
        legalDelivery: false,
      }),
      delivery(commandIds[1], matchId, inningsId, 101, { batRuns: 4 }),
      delivery(commandIds[2], matchId, inningsId, 102, { ballNumber: 2, batRuns: 1 }),
    ];

    await store.saveSession(matchId, session);
    await store.saveSnapshot(snapshot);
    for (const item of queue) await store.enqueue(item);

    // A new instance simulates the service being recreated after a page reload.
    const restartedStore = new OfflineScoringStore();
    const restoredSession = await restartedStore.loadSession<typeof session>(matchId);
    const restoredSnapshot = await restartedStore.loadSnapshot(inningsId);
    const restoredQueue = await restartedStore.list(inningsId);

    expect(restoredSession).toEqual(session);
    expect(restoredSnapshot).toEqual(snapshot);
    expect(restoredQueue.map((item) => item.commandId)).toEqual(commandIds);

    const restored = restoreOfflineQueueProjection(
      restoredSnapshot!,
      restoredQueue,
      matchId,
      inningsId,
    );

    expect(restored.blocked).toBeFalse();
    expect(restored.error).toBeNull();
    expect(restored.restoredDeliveries).toBe(3);
    expect(restored.score.runs).toBe(6);
    expect(restored.score.legalBalls).toBe(2);
    expect(restored.score.recentBalls?.map((ball) => ball.deliveryId)).toEqual(commandIds);

    // Re-enqueueing after restart with the original command IDs must not fork
    // the local projection or create duplicate queue records.
    await restartedStore.enqueue(queue[0]);
    const afterRetry = await restartedStore.list(inningsId);
    expect(afterRetry.length).toBe(3);
    expect(afterRetry.map((item) => item.commandId)).toEqual(commandIds);
  });

  it('acknowledges a delivery by persisting the confirmed snapshot and removing only that command', async () => {
    const runId = `runtime-ack-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const matchId = `${runId}-match`;
    const inningsId = `${runId}-innings`;
    const first = delivery(`${runId}-first`, matchId, inningsId, 200, { batRuns: 4 });
    const second = delivery(`${runId}-second`, matchId, inningsId, 201, {
      ballNumber: 2,
      batRuns: 1,
    });
    await store.enqueue(first);
    await store.enqueue(second);

    const authoritative = {
      ...score(inningsId, matchId),
      runs: 4,
      legalBalls: 1,
      currentOver: 0,
      currentBall: 1,
      recentBalls: [
        {
          deliveryId: first.commandId,
          overNumber: 0,
          ballNumber: 1,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 4,
          extraRuns: 0,
          extraType: null,
          wicketType: null,
          legalDelivery: true,
          totalRuns: 4,
        },
      ],
    };

    // A fresh store instance observes the same records, then commits the
    // acknowledgement transaction across the queue and confirmed snapshot.
    const restartedStore = new OfflineScoringStore();
    await restartedStore.acknowledgeDelivery(first.commandId, authoritative);

    expect(await restartedStore.loadSnapshot(inningsId)).toEqual(authoritative);
    expect(await restartedStore.list(inningsId)).toEqual([
      jasmine.objectContaining({ commandId: second.commandId }),
    ]);
  });

  it('blocks and preserves a persisted multi-device fork after a cold restart without partially applying either delivery', async () => {
    const runId = `runtime-device-conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const matchId = `${runId}-match`;
    const inningsId = `${runId}-innings`;
    const snapshot = score(inningsId, matchId);
    const deviceA = delivery(`${runId}-device-a`, matchId, inningsId, 300, {
      batRuns: 1,
      ballNumber: 1,
    });
    const deviceB = delivery(`${runId}-device-b`, matchId, inningsId, 301, {
      batRuns: 4,
      ballNumber: 1,
    });

    await store.saveSnapshot(snapshot);
    await store.enqueue(deviceA);
    await store.enqueue(deviceB);

    // Reload boundary: neither device's locally queued delivery is trusted
    // until the queue is reconciled against the authoritative server state.
    const restartedStore = new OfflineScoringStore();
    const restoredSnapshot = await restartedStore.loadSnapshot(inningsId);
    const restoredQueue = await restartedStore.list(inningsId);

    expect(restoredQueue.map((item) => item.commandId)).toEqual([
      deviceA.commandId,
      deviceB.commandId,
    ]);
    const restored = restoreOfflineQueueProjection(
      restoredSnapshot!,
      restoredQueue,
      matchId,
      inningsId,
    );

    expect(restored.blocked).toBeTrue();
    expect(restored.error).toContain('Multiple devices recorded different legal deliveries');
    expect(restored.restoredDeliveries).toBe(0);
    expect(restored.score!).toBe(restoredSnapshot!);
    expect(restored.score!.runs).toBe(0);
    expect(restored.score!.legalBalls).toBe(0);

    // A conflict is not silently discarded: both original commands remain
    // available for manual reconciliation.
    const retainedQueue = await restartedStore.list(inningsId);
    expect(retainedQueue.map((item) => item.commandId)).toEqual([
      deviceA.commandId,
      deviceB.commandId,
    ]);
  });

  it('reconciles a lost POST response by exact command ID after reconnect and atomically acknowledges it', async () => {
    const runId = `runtime-lost-response-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const matchId = `${runId}-match`;
    const inningsId = `${runId}-innings`;
    const command = delivery(`${runId}-command`, matchId, inningsId, 400, {
      batRuns: 4,
      ballNumber: 1,
    });
    await store.saveSnapshot(score(inningsId, matchId));
    await store.enqueue(command);

    // The server committed the POST, but the browser lost its response. On
    // reconnect, the authoritative GET contains the original command ID.
    const serverBall = {
      deliveryId: command.commandId,
      overNumber: 0,
      ballNumber: 1,
      strikerId: 'batter-1',
      nonStrikerId: 'batter-2',
      bowlerId: 'bowler-1',
      batRuns: 4,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
      legalDelivery: true,
      totalRuns: 4,
    };
    const authoritative = {
      ...score(inningsId, matchId),
      runs: 4,
      legalBalls: 1,
      recentBalls: [serverBall],
    };

    const restartedStore = new OfflineScoringStore();
    const pending = await restartedStore.list(inningsId);
    expect(pending).toEqual([jasmine.objectContaining({ commandId: command.commandId })]);
    expect(offlineDeliveryMatchesRecentBall(pending[0], serverBall)).toBeTrue();

    await restartedStore.acknowledgeDelivery(command.commandId, authoritative);

    expect(await restartedStore.list(inningsId)).toEqual([]);
    expect(await restartedStore.loadSnapshot(inningsId)).toEqual(authoritative);
  });

  it('does not clear a pending command when the reconnect snapshot contains a different delivery ID', async () => {
    const runId = `runtime-unmatched-response-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const matchId = `${runId}-match`;
    const inningsId = `${runId}-innings`;
    const command = delivery(`${runId}-queued-command`, matchId, inningsId, 500, {
      batRuns: 2,
      ballNumber: 1,
    });
    await store.enqueue(command);

    const unrelatedServerBall = {
      deliveryId: `${runId}-different-command`,
      overNumber: 0,
      ballNumber: 1,
      strikerId: 'batter-1',
      nonStrikerId: 'batter-2',
      bowlerId: 'bowler-1',
      batRuns: 2,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
      legalDelivery: true,
      totalRuns: 2,
    };
    const restartedStore = new OfflineScoringStore();
    const pending = await restartedStore.list(inningsId);

    expect(offlineDeliveryMatchesRecentBall(pending[0], unrelatedServerBall)).toBeFalse();
    expect(await restartedStore.list(inningsId)).toEqual([
      jasmine.objectContaining({ commandId: command.commandId }),
    ]);
  });


  it(
    'restores wides and no-balls without advancing the legal-ball cursor across an over boundary',
    async () => {
      const runId = `runtime-over-boundary-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const matchId = `${runId}-match`;
      const inningsId = `${runId}-innings`;
      const snapshot = score(inningsId, matchId);
      const queue = [
        delivery(`${runId}-wide`, matchId, inningsId, 600, {
          ballNumber: 1,
          extraType: 'WIDE',
          extraRuns: 1,
          legalDelivery: false,
        }),
        delivery(`${runId}-no-ball`, matchId, inningsId, 601, {
          ballNumber: 2,
          batRuns: 1,
          extraType: 'NO_BALL',
          extraRuns: 1,
          legalDelivery: false,
        }),
        ...Array.from({ length: 6 }, (_, index) =>
          delivery(`${runId}-legal-${index + 1}`, matchId, inningsId, 602 + index, {
            ballNumber: index + 1,
            batRuns: 1,
          }),
        ),
      ];

      await store.saveSnapshot(snapshot);
      for (const item of queue) await store.enqueue(item);

      const restartedStore = new OfflineScoringStore();
      const restored = restoreOfflineQueueProjection(
        (await restartedStore.loadSnapshot(inningsId))!,
        await restartedStore.list(inningsId),
        matchId,
        inningsId,
      );

      expect(restored.blocked).toBeFalse();
      expect(restored.restoredDeliveries).toBe(8);
      expect(restored.score.runs).toBe(9);
      expect(restored.score.legalBalls).toBe(6);
      expect(restored.score.currentOver).toBe(1);
      expect(restored.score.currentBall).toBe(0);
      expect(restored.score.overs).toEqual([
        jasmine.objectContaining({
          overNumber: 0,
          runs: 9,
          legalBalls: 6,
          wides: 1,
          noBalls: 1,
          completed: true,
        }),
      ]);
      expect(restored.score.recentBalls?.map((ball) => ball.deliveryId)).toEqual(
        queue.map((item) => item.commandId),
      );
    },
  );
});
