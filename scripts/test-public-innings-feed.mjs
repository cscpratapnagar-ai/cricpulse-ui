import assert from 'node:assert/strict';
import test from 'node:test';
import { NEVER, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { createPublicLiveFeed } from '../src/app/public-live-innings-feed.mjs';

test('keeps a slow current-innings request alive across later poll ticks', () => {
  const scheduler = new TestScheduler((actual, expected) => assert.deepEqual(actual, expected));
  scheduler.run(() => {
    const pending = new Subject();
    let requests = 0;
    const subscription = createPublicLiveFeed(
      { get: () => { requests += 1; return pending; } },
      '/api',
      'match-1',
      { watchPublic: () => NEVER },
      5,
      scheduler
    ).subscribe();

    scheduler.schedule(() => assert.equal(requests, 1), 6);
    scheduler.schedule(() => {
      pending.next({ inningsId: 'innings-1' });
      pending.complete();
    }, 7);
    scheduler.schedule(() => assert.equal(requests, 2), 11);
    scheduler.schedule(() => subscription.unsubscribe(), 12);
    scheduler.flush();
  });
});

test('switches and disposes the previous score watcher when innings changes', () => {
  const scheduler = new TestScheduler((actual, expected) => assert.deepEqual(actual, expected));
  scheduler.run(() => {
    const requests = [new Subject(), new Subject()];
    const watchers = [];
    let requestIndex = 0;
    let firstWatcherClosed = false;
    const feed = createPublicLiveFeed(
      { get: () => requests[requestIndex++] },
      '/api',
      'match-1',
      { watchPublic: (inningsId) => {
        watchers.push(inningsId);
        const stream = new Subject();
        return inningsId === 'innings-1'
          ? stream.pipe(finalize(() => { firstWatcherClosed = true; }))
          : stream;
      } },
      5,
      scheduler
    );
    const subscription = feed.subscribe();
    scheduler.schedule(() => {
      requests[0].next({ inningsId: 'innings-1' });
      requests[0].complete();
    }, 1);
    scheduler.schedule(() => {
      requests[1].next({ inningsId: 'innings-2' });
      requests[1].complete();
    }, 6);
    scheduler.schedule(() => {
      assert.deepEqual(watchers, ['innings-1', 'innings-2']);
      assert.equal(firstWatcherClosed, true);
      subscription.unsubscribe();
    }, 8);
    scheduler.flush();
  });
});
