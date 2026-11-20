import { of, throwError } from 'rxjs';

import { TournamentScheduleComponent } from './tournament-schedule.component';

describe('TournamentScheduleComponent', () => {
  function createComponent() {
    const component = Object.create(
      TournamentScheduleComponent.prototype,
    ) as TournamentScheduleComponent;
    (component as any).http = {
      get: jasmine.createSpy('get'),
      post: jasmine.createSpy('post'),
    };
    component.id = 't-1';
    component.loading = false;
    component.busy = '';
    component.message = '';
    component.error = '';
    component.conflictMessage = '';
    component.generateMode = 'SINGLE_ROUND_ROBIN';
    component.generateBusy = false;
    component.t = { id: 't-1', name: 'City Cup', format: 'T20', overs: 20 };
    component.fixtures = [
      {
        matchId: 'm-1',
        fixtureNumber: 1,
        stage: 'LEAGUE',
        matchName: 'A vs B',
        teamAName: 'A',
        teamBName: 'B',
        status: 'SCHEDULED',
        scheduledAt: null,
      },
    ];
    component.draft = { 'm-1': '2026-12-01T18:30' };
    return component;
  }

  it('generates the selected round-robin mode and refreshes the fixture list', () => {
    const component = createComponent();
    (component as any).http.post.and.returnValue(
      of({
        generated: 6,
        skipped: 0,
        totalPairs: 6,
        fixtures: component.fixtures,
      }),
    );
    component.generateMode = 'DOUBLE_ROUND_ROBIN';

    component.generateFixtures();

    expect((component as any).http.post).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/fixtures/generate?mode=DOUBLE_ROUND_ROBIN',
      null,
    );
    expect(component.generateBusy).toBeFalse();
    expect(component.fixtures).toHaveSize(1);
    expect(component.message).toContain('6 fixture(s) generated');
    expect(component.error).toBe('');
  });

  it('does not submit a second fixture-generation request while one is in flight', () => {
    const component = createComponent();
    component.generateBusy = true;

    component.generateFixtures();

    expect((component as any).http.post).not.toHaveBeenCalled();
  });

  it('reports fixture generation failures and restores the busy state', () => {
    const component = createComponent();
    (component as any).http.post.and.returnValue(
      throwError(() => ({ error: { message: 'Tournament is locked.' } })),
    );

    component.generateFixtures();

    expect(component.generateBusy).toBeFalse();
    expect(component.error).toBe('Tournament is locked.');
  });

  it('schedules a fixture with an ISO timestamp and updates the returned schedule', () => {
    const component = createComponent();
    const scheduledAt = '2026-12-01T13:00:00.000Z';
    (component as any).http.post.and.returnValue(of({ scheduledAt }));

    component.save(component.fixtures[0]);

    const [url, body] = (component as any).http.post.calls.mostRecent().args;
    expect(url).toBe('http://api.test/api/tournaments/t-1/fixtures/m-1/schedule');
    expect(body.scheduledAt).toBe(new Date('2026-12-01T18:30').toISOString());
    expect(component.fixtures[0].scheduledAt).toBe(scheduledAt);
    expect(component.busy).toBe('');
    expect(component.message).toContain('scheduled successfully');
    expect(component.error).toBe('');
  });

  it('preserves the selected local time and shows a conflict-specific recovery message', () => {
    const component = createComponent();
    const selected = component.draft['m-1'];
    (component as any).http.post.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'A team already has a fixture at this time.' },
      })),
    );

    component.save(component.fixtures[0]);

    expect(component.draft['m-1']).toBe(selected);
    expect(component.conflictMessage).toContain('already has a fixture');
    expect(component.error).toBe('');
    expect(component.busy).toBe('');
  });

  it('reports non-conflict scheduling failures separately', () => {
    const component = createComponent();
    (component as any).http.post.and.returnValue(
      throwError(() => ({ status: 400, error: { message: 'Fixture time must be in the future.' } })),
    );

    component.save(component.fixtures[0]);

    expect(component.error).toBe('Fixture time must be in the future.');
    expect(component.conflictMessage).toBe('');
    expect(component.busy).toBe('');
  });

  it('formats valid fixture timestamps and safely rejects invalid timestamps', () => {
    const component = createComponent();

    expect(component.format('not-a-date')).toContain('Invalid Date');
    expect(component.format('2026-12-01T13:00:00.000Z')).not.toContain('Invalid Date');
  });
});
