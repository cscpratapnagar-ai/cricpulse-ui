import { of, throwError } from 'rxjs';

import { TournamentDetailComponent } from './tournament-detail.component';

describe('TournamentDetailComponent', () => {
  function createComponent() {
    const component = Object.create(
      TournamentDetailComponent.prototype,
    ) as TournamentDetailComponent;
    (component as any).api = 'http://api.test/api';
    component.id = 't-1';
    component.loading = false;
    component.busy = false;
    component.actionError = '';
    component.actionMessage = '';
    component.teams = [];
    component.availableTeams = [];
    component.fixtures = [];
    component.availableMatches = [];
    component.points = [];
    component.teamToAdd = '';
    component.matchToAdd = '';
    (component as any).http = { post: jasmine.createSpy('post') };
    component.loadChildren = jasmine.createSpy('loadChildren');
    return component;
  }

  it('blocks fixture generation until at least two teams are registered', () => {
    const component = createComponent();
    component.generateFixtures();

    expect((component as any).http.post).not.toHaveBeenCalled();
    expect(component.actionError).toContain('at least 2 teams');
  });

  it('generates fixtures and reports generated pairings', () => {
    const component = createComponent();
    component.teams = [
      { id: 'a', name: 'A', city: null, seed: null },
      { id: 'b', name: 'B', city: null, seed: null },
    ];
    (component as any).http.post.and.returnValue(
      of({ tournamentId: 't-1', generated: 3, skipped: 1, totalPairs: 4, fixtures: [] }),
    );

    component.generateFixtures();

    expect(component.busy).toBeFalse();
    expect(component.actionMessage).toContain('3 league fixtures generated');
    expect(component.loadChildren).toHaveBeenCalled();
  });

  it('prevents linking a match whose teams are not registered', () => {
    const component = createComponent();
    component.matchToAdd = 'm-1';
    component.availableMatches = [
      { id: 'm-1', name: 'A vs B', status: 'SCHEDULED', teamAId: 'a', teamBId: 'b' },
    ];

    component.linkMatch();

    expect(component.actionError).toContain('Both teams');
    expect((component as any).http.post).not.toHaveBeenCalled();
  });

  it('adds a selected team and reloads tournament data', () => {
    const component = createComponent();
    component.teamToAdd = 'team-1';
    (component as any).http.post.and.returnValue(of({}));

    component.addTeam();

    expect((component as any).http.post).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/teams/team-1',
      null,
    );
    expect(component.actionMessage).toContain('Team added');
    expect(component.loadChildren).toHaveBeenCalled();
  });

  it('surfaces fixture generation errors', () => {
    const component = createComponent();
    component.teams = [
      { id: 'a', name: 'A', city: null, seed: null },
      { id: 'b', name: 'B', city: null, seed: null },
    ];
    (component as any).http.post.and.returnValue(
      throwError(() => ({ error: { message: 'Generation failed' } })),
    );

    component.generateFixtures();

    expect(component.busy).toBeFalse();
    expect(component.actionError).toBe('Generation failed');
  });
});
