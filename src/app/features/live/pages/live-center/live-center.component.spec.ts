import { LiveCenterComponent } from './live-center.component';

describe('LiveCenterComponent', () => {
  it('should expose the component class', () => expect(LiveCenterComponent).toBeTruthy());

  it('formats legal balls as cricket overs', () => {
    const component = Object.create(LiveCenterComponent.prototype) as LiveCenterComponent;

    expect(component.overs(0)).toBe('0.0');
    expect(component.overs(5)).toBe('0.5');
    expect(component.overs(6)).toBe('1.0');
    expect(component.overs(17)).toBe('2.5');
  });

  it('derives the selected batting team name from the active match', () => {
    const component = Object.create(LiveCenterComponent.prototype) as LiveCenterComponent;
    component.activeMatch = {
      id: 'm1',
      name: 'Final',
      format: 'T20',
      status: 'SCHEDULED',
      teamAId: 'a',
      teamBId: 'b',
      teamAName: 'Alpha XI',
      teamBName: 'Beta XI',
    };
    component.battingTeamId = 'b';

    expect(component.battingTeamName).toBe('Beta XI');
  });

  it('builds team options only when a match is selected', () => {
    const component = Object.create(LiveCenterComponent.prototype) as LiveCenterComponent;
    component.activeMatch = null;
    expect(component.teamOptions).toEqual([]);

    component.activeMatch = {
      id: 'm1',
      name: 'League Match',
      format: 'T20',
      status: 'LIVE',
      teamAId: 'a',
      teamBId: 'b',
      teamAName: 'Alpha XI',
      teamBName: 'Beta XI',
    };

    expect(component.teamOptions).toEqual([
      { value: 'a', label: 'Alpha XI' },
      { value: 'b', label: 'Beta XI' },
    ]);
  });

  it('handles missing and invalid schedules without throwing', () => {
    const component = Object.create(LiveCenterComponent.prototype) as LiveCenterComponent;

    expect(component.displayDate()).toBe('Schedule pending');
    expect(component.displayDate('not-a-date')).toBe('not-a-date');
  });
});
