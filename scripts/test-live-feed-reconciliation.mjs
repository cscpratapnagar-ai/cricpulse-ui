import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldAcceptLiveScoreVersion } from '../src/app/live-score-reconciliation.mjs';

test('accepts the first versioned snapshot', () => {
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: 1 }, undefined), true);
});
test('rejects duplicate and stale event versions', () => {
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: 7 }, 7), false);
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: 6 }, 7), false);
});
test('accepts a strictly newer version', () => {
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: 8 }, 7), true);
});
test('rejects unversioned payloads after versioned state exists', () => {
  assert.equal(shouldAcceptLiveScoreVersion({}, 7), false);
});
test('allows an initial legacy snapshot only before a version is known', () => {
  assert.equal(shouldAcceptLiveScoreVersion({}, undefined), true);
});
test('rejects invalid, negative and unsafe versions', () => {
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: -1 }, undefined), false);
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: Number.MAX_SAFE_INTEGER + 1 }, undefined), false);
  assert.equal(shouldAcceptLiveScoreVersion({ eventVersion: Number.NaN }, undefined), false);
});
