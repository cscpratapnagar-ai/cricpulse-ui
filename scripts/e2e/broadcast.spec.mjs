import { expect, test } from '@playwright/test';

const match = {
  id: 'match-e2e',
  name: 'CricPulse Browser Cup',
  format: 'T20',
  status: 'LIVE',
  totalOvers: 20,
  teamAId: 'team-a',
  teamBId: 'team-b',
  teamAName: 'Falcons',
  teamBName: 'Titans',
  currentInningsId: 'innings-e2e',
};

const innings = {
  inningsId: 'innings-e2e',
  matchId: 'match-e2e',
  inningsNumber: 1,
  battingTeamId: 'team-a',
  bowlingTeamId: 'team-b',
  runs: 42,
  wickets: 1,
  legalBalls: 24,
  status: 'LIVE',
};

const score = {
  ...innings,
  totalOvers: 20,
  eventVersion: 24,
  strikerId: 'batter-a',
  strikerName: 'A Batter',
  nonStrikerId: 'batter-b',
  nonStrikerName: 'B Batter',
  currentBowlerId: 'bowler-a',
  currentBowlerName: 'C Bowler',
  recentBalls: [],
  batters: [],
  bowlers: [],
};

async function stubPublicMatchApi(page) {
  await page.route('**/api/auth/ws-ticket', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/public/matches/match-e2e/scorecard', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/public/matches/match-e2e/current-innings', (route) =>
    route.fulfill({ json: innings }),
  );
  await page.route('**/api/public/matches/match-e2e', (route) =>
    route.fulfill({ json: match }),
  );
  await page.route('**/api/public/innings/innings-e2e', (route) =>
    route.fulfill({ json: score }),
  );
}

test('public match centre renders the authoritative live score in a real browser', async ({
  page,
}) => {
  await stubPublicMatchApi(page);

  await page.goto('/match/match-e2e');

  await expect(page.locator('.hero h1')).toHaveText('CricPulse Browser Cup');
  await expect(page.locator('.score')).toContainText('42');
  await expect(page.locator('.score')).toContainText('/1');
  await expect(page.locator('.overs')).toContainText('4.0');
});

test('OBS broadcast overlay renders the same public innings snapshot', async ({ page }) => {
  await stubPublicMatchApi(page);
  await page.route('**/api/public/matches/match-e2e/broadcast-state', (route) =>
    route.fulfill({
      json: {
        match,
        innings: [{ score, battingTeamId: 'team-a', bowlingTeamId: 'team-b' }],
      },
    }),
  );

  await page.goto('/broadcast/match-e2e/overlay?mode=strip');

  await expect(page.locator('.legacy-team')).toContainText('Falcons');
  await expect(page.locator('.legacy-score')).toContainText('42');
  await expect(page.locator('.legacy-score')).toContainText('/1');
  await expect(page.locator('.legacy-over')).toContainText('4.0');
});

test('public match centre recovers after the first score snapshot request fails', async ({
  page,
}) => {
  let snapshotAttempts = 0;
  await stubPublicMatchApi(page);
  await page.unroute('**/api/public/innings/innings-e2e');
  await page.route('**/api/public/innings/innings-e2e', (route) => {
    snapshotAttempts += 1;
    if (snapshotAttempts === 1) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({ json: score });
  });

  await page.goto('/match/match-e2e');

  await expect(page.locator('.score')).toContainText('42', { timeout: 12_000 });
  expect(snapshotAttempts).toBeGreaterThanOrEqual(2);
});
