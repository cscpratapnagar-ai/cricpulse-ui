import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const workflow = readFileSync('.github/workflows/frontend-ci.yml', 'utf8');

assert.match(workflow, /permissions:\n  contents: read(?:\n|$)/, 'frontend CI must use read-only repository permissions');
assert.equal(
  (workflow.match(/run: npm ci --no-audit --no-fund/g) ?? []).length,
  2,
  'quality and production-build jobs must install exactly from the lockfile',
);
assert.equal(
  (workflow.match(/persist-credentials: false/g) ?? []).length,
  2,
  'checkout credentials must not persist in either CI job',
);
for (const forbidden of ['contents: write', 'git push', 'git commit', 'git fetch origin', 'git checkout -B', 'Normalize branch formatting']) {
  assert.ok(!workflow.includes(forbidden), `frontend CI must not contain ${forbidden}`);
}
assert.match(workflow, /npm run format:check/, 'formatting must be validated without mutating the branch');
assert.match(workflow, /npm run ci:policy:audit/, 'CI must execute its own policy regression audit');

console.log('PASS: frontend CI is read-only, lockfile-reproducible, and non-mutating');
