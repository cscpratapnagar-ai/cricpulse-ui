import {
  appendAuthoritativeScoreDiagnostics,
  buildOfflineQueueDiagnostics,
  DELIVERY_WICKET_OPTIONS,
  LiveScoringV2Component,
  isScorerLeaseConflict,
  resolveScorerLeaseToken,
  requiresWicketFielder,
  shouldRecoverLiveScoreAfterSocketConnect,
} from './live-scoring.component';

describe('LiveScoringV2Component', () => {
  it('should expose the component class', () => expect(LiveScoringV2Component).toBeTruthy());

  it('offers every dismissal supported by the delivery API exactly once', () => {
    expect(DELIVERY_WICKET_OPTIONS.map((option) => option.value)).toEqual([
      'BOWLED',
      'CAUGHT',
      'LBW',
      'RUN_OUT',
      'STUMPED',
      'HIT_WICKET',
      'HIT_BALL_TWICE',
      'OBSTRUCTING_THE_FIELD',
    ]);
  });
});

describe('fielding attribution requirements', () => {
  it('requires a selected fielder for caught, run-out and stumped dismissals', () => {
    expect(requiresWicketFielder('CAUGHT')).toBeTrue();
    expect(requiresWicketFielder('RUN_OUT')).toBeTrue();
    expect(requiresWicketFielder('STUMPED')).toBeTrue();
  });

  it('does not require a fielder for other dismissal types', () => {
    expect(requiresWicketFielder('BOWLED')).toBeFalse();
    expect(requiresWicketFielder('LBW')).toBeFalse();
    expect(requiresWicketFielder('HIT_WICKET')).toBeFalse();
    expect(requiresWicketFielder(null)).toBeFalse();
  });
});

describe('scorer lease token isolation across tabs', () => {
  it('rotates a cloned session token when another tab is already using it', async () => {
    const token = await resolveScorerLeaseToken(
      'shared-token',
      async () => true,
      () => 'new-tab-token',
    );
    expect(token).toBe('new-tab-token');
  });

  it('preserves the session token when no other tab is using it', async () => {
    const token = await resolveScorerLeaseToken(
      'current-tab-token',
      async () => false,
      () => 'unused-token',
    );
    expect(token).toBe('current-tab-token');
  });

  it('creates a token for a new session without a stored token', async () => {
    const token = await resolveScorerLeaseToken(
      null,
      async () => false,
      () => 'fresh-token',
    );
    expect(token).toBe('fresh-token');
  });
});

describe('scorer lease conflict recovery', () => {
  it('offers retry only for an active lease conflict', () => {
    expect(isScorerLeaseConflict({ status: 409 })).toBeTrue();
    expect(isScorerLeaseConflict({ status: 0 })).toBeFalse();
    expect(isScorerLeaseConflict({ status: 403 })).toBeFalse();
    expect(isScorerLeaseConflict(null)).toBeFalse();
  });
});

describe('socket reconnect score recovery', () => {
  it('requests immediate authoritative recovery after a disconnected socket reconnects when score is loaded', () => {
    expect(shouldRecoverLiveScoreAfterSocketConnect('DISCONNECTED', 'CONNECTED', true)).toBeTrue();
    expect(shouldRecoverLiveScoreAfterSocketConnect('ERROR', 'CONNECTED', true)).toBeTrue();
    expect(shouldRecoverLiveScoreAfterSocketConnect('CONNECTING', 'CONNECTED', true)).toBeTrue();
  });

  it('does not trigger recovery before score is loaded', () => {
    expect(
      shouldRecoverLiveScoreAfterSocketConnect('DISCONNECTED', 'CONNECTED', false),
    ).toBeFalse();
  });

  it('does not trigger repeated recovery while the socket remains connected', () => {
    expect(shouldRecoverLiveScoreAfterSocketConnect('CONNECTED', 'CONNECTED', true)).toBeFalse();
  });

  it('does not trigger recovery for non-connected states', () => {
    expect(shouldRecoverLiveScoreAfterSocketConnect('CONNECTED', 'CONNECTING', true)).toBeFalse();
    expect(shouldRecoverLiveScoreAfterSocketConnect('DISCONNECTED', 'ERROR', true)).toBeFalse();
  });
});

describe('offline queue recovery diagnostics', () => {
  const queued = (over: number, ball: number, commandId: string, overrides: Partial<any> = {}) => ({
    commandId,
    matchId: 'match-1',
    inningsId: 'innings-1',
    createdAt: 1700000000000,
    syncStatus: 'BLOCKED' as const,
    payload: {
      inningsId: 'innings-1',
      overNumber: over,
      ballNumber: ball,
      strikerId: 'striker-1',
      nonStrikerId: 'striker-2',
      bowlerId: 'bowler-1',
      batRuns: 2,
      extraRuns: 0,
      extraType: null,
      wicketType: null,
      legalDelivery: true,
      ...overrides,
    },
  });

  it('marks both forked legal deliveries and explains the full delivery outcome', () => {
    const result = buildOfflineQueueDiagnostics(
      [
        queued(0, 1, 'cmd-a', { batRuns: 4 }),
        queued(0, 1, 'cmd-b', {
          batRuns: 1,
          wicketType: 'RUN_OUT',
          dismissedPlayerId: 'striker-2',
          newBatterId: 'striker-3',
        }),
      ],
      'match-1',
      'innings-1',
    );

    expect(result.conflictPositions).toEqual(['1.1']);
    expect(result.items.every((item) => item.conflict)).toBeTrue();
    expect(result.items[0].summary).toContain('Total 4');
    expect(result.items[0].summary).toContain('LEGAL DELIVERY');
    expect(result.items[1].summary).toContain('RUN_OUT');
    expect(result.items[1].summary).toContain('striker-3');
    expect(result.report).toContain('[CONFLICT] 1.1');
    expect(result.report).toContain('match-1');
    expect(result.report).toContain('Do not sync or delete');
  });

  it('does not flag repeated wides/no-balls as legal-ball position forks', () => {
    const result = buildOfflineQueueDiagnostics(
      [
        queued(0, 1, 'wide-1', { legalDelivery: false, extraType: 'WIDE', extraRuns: 1 }),
        queued(0, 1, 'wide-2', { legalDelivery: false, extraType: 'WIDE', extraRuns: 2 }),
        queued(0, 1, 'legal-1'),
      ],
      'match-1',
      'innings-1',
    );

    expect(result.conflictPositions).toEqual([]);
    expect(result.items.some((item) => item.conflict)).toBeFalse();
    expect(result.items[0].summary).toContain('NON-LEGAL DELIVERY');
    expect(result.report).toContain('none identified');
  });

  it('keeps an empty queue report explicit and stable', () => {
    const result = buildOfflineQueueDiagnostics([], 'match-1', 'innings-1');
    expect(result.items).toEqual([]);
    expect(result.conflictPositions).toEqual([]);
    expect(result.report).toContain('Pending deliveries: 0');
  });
});

describe('authoritative score divergence report', () => {
  it('includes server snapshot identity, version, score, player state and recent balls', () => {
    const score: any = {
      matchId: 'match-1',
      inningsId: 'innings-1',
      eventVersion: 42,
      runs: 81,
      wickets: 3,
      legalBalls: 57,
      status: 'LIVE',
      strikerId: 'batter-a',
      nonStrikerId: 'batter-b',
      currentBowlerId: 'bowler-c',
      recentBalls: [
        {
          deliveryId: 'server-command-123',
          overNumber: 9,
          ballNumber: 4,
          strikerId: 'batter-a',
          nonStrikerId: 'batter-b',
          bowlerId: 'bowler-c',
          batRuns: 1,
          extraRuns: 0,
          extraType: null,
          wicketType: null,
          legalDelivery: true,
          totalRuns: 1,
        },
      ],
    };
    const report = appendAuthoritativeScoreDiagnostics('queue report', score, 'position mismatch');
    expect(report).toContain('Reconciliation reason: position mismatch');
    expect(report).toContain('Version=42');
    expect(report).toContain('Score=81/3');
    expect(report).toContain('Striker=batter-a');
    expect(report).toContain('server-command-123');
    expect(report).toContain('diagnostic only');
  });

  it('clearly records when no authoritative snapshot is available', () => {
    const report = appendAuthoritativeScoreDiagnostics('queue report', null, 'network down');
    expect(report).toContain('Reconciliation reason: network down');
    expect(report).toContain('Authoritative server snapshot: unavailable locally');
  });
});
