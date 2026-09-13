import { MatchesComponent } from './matches.component';

describe('MatchesComponent', () => {
  function createComponent(): MatchesComponent {
    return Object.create(MatchesComponent.prototype) as MatchesComponent;
  }

  it('should expose the component class', () => expect(MatchesComponent).toBeTruthy());

  it('normalizes backend match statuses for the UI filters', () => {
    const component = createComponent();

    expect(component.normalizeStatus('UPCOMING')).toBe('SCHEDULED');
    expect(component.normalizeStatus('CREATED')).toBe('SCHEDULED');
    expect(component.normalizeStatus('READY')).toBe('SCHEDULED');
    expect(component.normalizeStatus('FINISHED')).toBe('COMPLETED');
    expect(component.normalizeStatus('RESULT')).toBe('COMPLETED');
    expect(component.normalizeStatus('LIVE')).toBe('LIVE');
  });

  it('returns stable team initials for match cards', () => {
    const component = createComponent();

    expect(component.initials('Mumbai Indians')).toBe('MI');
    expect(component.initials('Gujarat')).toBe('G');
    expect(component.initials('')).toBe('TM');
  });

  it('clears a search through the empty-state action', () => {
    const component = createComponent();
    component.query = 'missing match';

    component.handleEmptyAction();

    expect(component.query).toBe('');
  });

  it('formats invalid or missing schedules safely', () => {
    const component = createComponent();

    expect(component.displayDate()).toBe('Schedule pending');
    expect(component.displayDate('not-a-date')).toBe('not-a-date');
    expect(component.timeHint({
      id: '1',
      name: 'Test',
      format: 'T20',
      status: 'SCHEDULED',
      teamAId: 'a',
      teamBId: 'b',
    })).toBe('Time pending');
  });
});
