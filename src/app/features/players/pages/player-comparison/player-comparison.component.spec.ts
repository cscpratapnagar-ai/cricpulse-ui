import { PlayerComparisonComponent } from './player-comparison.component';

describe('PlayerComparisonComponent', () => {
  it('should expose the component class', () => expect(PlayerComparisonComponent).toBeTruthy());

  it('treats lower economy as the better bowling result', () => {
    const component = Object.create(PlayerComparisonComponent.prototype) as PlayerComparisonComponent;
    component.comparison = {
      left: { playerId: 'a', name: 'A', role: 'Bowler', teamName: 'A', matches: 10, runs: 100, average: 10, strikeRate: 100, wickets: 12, economy: 5.4, fours: 8, sixes: 2 },
      right: { playerId: 'b', name: 'B', role: 'Bowler', teamName: 'B', matches: 10, runs: 120, average: 12, strikeRate: 110, wickets: 10, economy: 6.1, fours: 10, sixes: 2 },
    };

    const economy = component.metrics.find((metric) => metric.label === 'ECONOMY')!;

    expect(component.metricWinner(economy)).toBe('left');
    expect(component.advantage(economy)).toContain('lower economy');
  });

  it('calculates boundary share from recorded fours, sixes and runs', () => {
    const component = Object.create(PlayerComparisonComponent.prototype) as PlayerComparisonComponent;
    component.comparison = {
      left: { playerId: 'a', name: 'A', role: 'Batter', teamName: 'A', matches: 5, runs: 100, average: 20, strikeRate: 120, wickets: 0, economy: 0, fours: 10, sixes: 5 },
      right: { playerId: 'b', name: 'B', role: 'Batter', teamName: 'B', matches: 5, runs: 100, average: 20, strikeRate: 120, wickets: 0, economy: 0, fours: 5, sixes: 2 },
    };

    expect(component.boundaryProfile?.left).toBe(70);
    expect(component.boundaryProfile?.right).toBe(32);
  });

  it('does not produce a career edge when core indicators are tied', () => {
    const component = Object.create(PlayerComparisonComponent.prototype) as PlayerComparisonComponent;
    component.comparison = {
      left: { playerId: 'a', name: 'A', role: 'Player', teamName: 'A', matches: 5, runs: 100, average: 20, strikeRate: 120, wickets: 5, economy: 6, fours: 5, sixes: 2 },
      right: { playerId: 'b', name: 'B', role: 'Player', teamName: 'B', matches: 5, runs: 100, average: 20, strikeRate: 120, wickets: 5, economy: 6, fours: 5, sixes: 2 },
    };

    expect(component.edgeSummary?.label).toBe('Balanced profile');
  });
});
