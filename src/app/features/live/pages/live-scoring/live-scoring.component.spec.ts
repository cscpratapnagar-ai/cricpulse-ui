import {
  DELIVERY_WICKET_OPTIONS,
  LiveScoringV2Component,
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

describe('socket reconnect score recovery', () => {
  it(
    'requests immediate authoritative recovery after a disconnected socket reconnects when score is loaded',
    () => {
    expect(
      shouldRecoverLiveScoreAfterSocketConnect('DISCONNECTED', 'CONNECTED', true),
    ).toBeTrue();
    expect(shouldRecoverLiveScoreAfterSocketConnect('ERROR', 'CONNECTED', true)).toBeTrue();
    expect(
      shouldRecoverLiveScoreAfterSocketConnect('CONNECTING', 'CONNECTED', true),
    ).toBeTrue();
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
