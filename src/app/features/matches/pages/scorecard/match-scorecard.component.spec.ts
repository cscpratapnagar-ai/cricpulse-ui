import { MatchScorecardComponent } from './match-scorecard.component';

describe('MatchScorecardComponent', () => {
  it('should expose the component class', () => expect(MatchScorecardComponent).toBeTruthy());

  it('filters fielding contributions to the selected innings', () => {
    const getter = Object.getOwnPropertyDescriptor(
      MatchScorecardComponent.prototype,
      'currentInningsFielders',
    )?.get;
    const component = {
      selectedInnings: 2,
      fieldingAnalysis: [
        {
          inningsNumber: 1,
          fielderId: 'fielder-1',
          fielderName: 'First Innings Fielder',
        },
        {
          inningsNumber: 2,
          fielderId: 'fielder-2',
          fielderName: 'Second Innings Fielder',
        },
      ],
    };

    expect(getter?.call(component)).toEqual([component.fieldingAnalysis[1]]);
  });
});
