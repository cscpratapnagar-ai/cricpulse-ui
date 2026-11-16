import { DELIVERY_WICKET_OPTIONS, LiveScoringV2Component } from './live-scoring.component';

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
