import { MatchDetailComponent } from './match-detail.component';

describe('MatchDetailComponent', () => {
  it('should expose the component class', () => expect(MatchDetailComponent).toBeTruthy());

  it('starts with an honest empty matchup state', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;
    component.matchups = [];
    component.matchupsLoading = false;
    component.matchupsError = false;

    expect(component.matchups).toEqual([]);
    expect(component.matchupsLoading).toBe(false);
    expect(component.matchupsError).toBe(false);
  });

  it('starts with an empty phase analysis state', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;
    component.phaseAnalysis = [];
    component.phaseAnalysisLoading = false;
    component.phaseAnalysisError = false;

    expect(component.phaseAnalysis).toEqual([]);
    expect(component.phaseAnalysisLoading).toBe(false);
    expect(component.phaseAnalysisError).toBe(false);
  });

  it('labels innings phases for the phase analysis cards', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;

    expect(component.phaseLabel('POWERPLAY')).toBe('Powerplay');
    expect(component.phaseLabel('MIDDLE')).toBe('Middle overs');
    expect(component.phaseLabel('DEATH')).toBe('Death overs');
    expect(component.phaseTone('DEATH')).toBe('death');
  });

  it('starts with an honest empty partnership state', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;
    component.partnerships = [];
    component.partnershipsLoading = false;
    component.partnershipsError = false;

    expect(component.partnerships).toEqual([]);
    expect(component.partnershipsLoading).toBe(false);
    expect(component.partnershipsError).toBe(false);
  });


  it('starts with an honest empty bowling spell state', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;
    component.bowlingSpells = [];
    component.bowlingSpellsLoading = false;
    component.bowlingSpellsError = false;

    expect(component.bowlingSpells).toEqual([]);
    expect(component.bowlingSpellsLoading).toBe(false);
    expect(component.bowlingSpellsError).toBe(false);
  });

  it('formats dismissal labels for bowling wicket events', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;

    expect(component.dismissalLabel('RUN_OUT')).toBe('RUN OUT');
    expect(component.dismissalLabel('HIT_WICKET')).toBe('HIT WICKET');
  });

  it('returns no tactical readout before intelligence data is available', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;
    component.intelligence = null;

    expect(component.tacticalInsights()).toEqual([]);
    expect(component.intelligenceSampleLabel()).toBe('LIMITED SAMPLE');
  });

  it('explains chase pressure from the existing match intelligence payload', () => {
    const component = Object.create(MatchDetailComponent.prototype) as MatchDetailComponent;
    component.intelligence = {
      inningsNumber: 2,
      battingTeam: 'Falcons',
      status: 'LIVE',
      runs: 90,
      wickets: 4,
      legalBalls: 60,
      totalOvers: 20,
      inningsRunRate: 9,
      recentRuns: 12,
      recentDeliveries: 8,
      recentDots: 2,
      recentFours: 1,
      recentSixes: 1,
      recentWickets: 0,
      recentRunRate: 12,
      momentum: 'RISING',
      momentumScore: 80,
      projectedScore: 180,
      pressureIndex: 20,
      collapseRisk: 0,
      requiredRuns: 60,
      ballsRemaining: 60,
      requiredRate: 6,
      chasePressure: 'LOW',
    };

    const insights = component.tacticalInsights();

    expect(insights.length).toBe(3);
    expect(insights[0].title).toBe('Batting approach');
    expect(insights[0].signal).toBe('Rate is currently manageable');
    expect(insights[1].title).toBe('Bowling opportunity');
    expect(insights[2].signal).toBe('Momentum favours the batting side');
    expect(component.intelligenceSampleLabel()).toBe('RECENT SAMPLE');
  });
});
