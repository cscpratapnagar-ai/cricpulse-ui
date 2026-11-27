import assert from 'node:assert/strict';
import test from 'node:test';
import { NEVER, Subject } from 'rxjs';
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
    scheduler.schedule(() => pending.next({ inningsId: 'innings-1' }), 7);
    scheduler.schedule(() => assert.equal(requests, 2), 11);
    scheduler.schedule(() => subscription.unsubscribe(), 12);
    scheduler.flush();
  });
});

test('switches the score watcher when the active innings changes', () => {
  const scheduler = new TestScheduler((actual, expected) => assert.deepEqual(actual, expected));
  scheduler.run(() => {
    const first = new Subject();
    const second = new Subject();
    let requests = 0;
    const watched = [];
    const feed = createPublicLiveFeed(
      { get: () => {
        requests += 1;
        return requests === 1 ? new Subject().pipe((source) => {
          scheduler.schedule(() => source.subscribe({ next: () => {} }), 0);
          return first;
        }) : second;
      } },
      '/api',
      'match-1',
      { watchPublic: (inningsId) => {
        watched.push(inningsId);
        return NEVER;
      } },
      5,
      scheduler
    );
    const subscription = feed.subscribe();
    scheduler.schedule(() => first.next({ inningsId: 'innings-1' }), 1);
    scheduler.schedule(() => second.next({ inningsId: 'innings-2' }), 6);
    scheduler.schedule(() => {
      assert.deepEqual(watched, ['innings-1', 'innings-2']);
      subscription.unsubscribe();
    }, 8);
    scheduler.flush();
  });
});
