import { of, throwError } from 'rxjs';

import { TournamentQualificationComponent } from './tournament-qualification.component';

describe('TournamentQualificationComponent', () => {
  const preview = {
    eligible: true,
    message: 'Top four teams are projected.',
    table: [
      {
        teamId: 't1',
        teamName: 'Titans',
        played: 3,
        wins: 3,
        losses: 0,
        ties: 0,
        points: 6,
        runsFor: 300,
        runsAgainst: 210,
        nrr: 1.5,
      },
      {
        teamId: 't2',
        teamName: 'Riders',
        played: 3,
        wins: 2,
        losses: 1,
        ties: 0,
        points: 4,
        runsFor: 260,
        runsAgainst: 230,
        nrr: 0.5,
      },
      {
        teamId: 't3',
        teamName: 'Kings',
        played: 3,
        wins: 1,
        losses: 2,
        ties: 0,
        points: 2,
        runsFor: 220,
        runsAgainst: 250,
        nrr: -0.5,
      },
      {
        teamId: 't4',
        teamName: 'Warriors',
        played: 3,
        wins: 0,
        losses: 3,
        ties: 0,
        points: 0,
        runsFor: 190,
        runsAgainst: 280,
        nrr: -1.5,
      },
    ],
    qualifiers: [],
  };

  function fixture(stage: string, matchId: string, status = 'SCHEDULED') {
    return {
      matchId,
      fixtureNumber: 7,
      stage,
      matchName: stage,
      teamAId: 't1',
      teamAName: 'Titans',
      teamBId: 't2',
      teamBName: 'Riders',
      status,
      scheduledAt: null,
    };
  }

  function createComponent() {
    const component = Object.create(
      TournamentQualificationComponent.prototype,
    ) as TournamentQualificationComponent;
    component.id = 't-1';
    (component as any).api = 'http://api.test/api';
    component.loading = false;
    component.progressBusy = false;
    component.preview = preview as any;
    component.tournamentStatus = 'ACTIVE';
    component.fixtures = [];
    component.winnerByMatch = {};
    component.progress = null;
    component.error = '';
    component.progressMessage = '';
    (component as any).http = {
      get: jasmine.createSpy('get'),
      post: jasmine.createSpy('post'),
    };
    return component;
  }

  it('enables progression only after every league fixture is completed', () => {
    const component = createComponent();
    component.fixtures = [
      fixture('LEAGUE', 'l-1', 'COMPLETED'),
      fixture('LEAGUE', 'l-2', 'SCHEDULED'),
    ];

    expect(component.leagueComplete).toBeFalse();
    expect(component.canProgress).toBeFalse();

    component.fixtures[1].status = 'COMPLETED';
    expect(component.leagueComplete).toBeTrue();
    expect(component.canProgress).toBeTrue();
  });

  it('does not enable progression until the tournament is active', () => {
    const component = createComponent();
    component.tournamentStatus = 'DRAFT';
    component.fixtures = [fixture('LEAGUE', 'l-1', 'COMPLETED')];

    expect(component.leagueComplete).toBeTrue();
    expect(component.canProgress).toBeFalse();
  });

  it('does not enable progression when there are no league fixtures', () => {
    const component = createComponent();
    component.fixtures = [fixture('QUALIFIER_1', 'q1')];

    expect(component.leagueComplete).toBeFalse();
    expect(component.canProgress).toBeFalse();
  });

  it('uses the top two seeds for Qualifier 1 and third/fourth seeds for Eliminator', () => {
    const component = createComponent();

    expect(component.projectedTeams('QUALIFIER_1')).toEqual(['Titans', 'Riders']);
    expect(component.projectedTeams('ELIMINATOR')).toEqual(['Kings', 'Warriors']);
    expect(component.projectedTeams('QUALIFIER_2')).toEqual([
      'Qualifier 1 loser',
      'Eliminator winner',
    ]);
    expect(component.projectedTeams('FINAL')).toEqual(['Qualifier 1 winner', 'Qualifier 2 winner']);
  });

  it('loads qualification standings and persisted tournament fixtures together', () => {
    const component = createComponent();
    const fixtures = [fixture('QUALIFIER_1', 'q1')];
    (component as any).http.get.and.returnValues(
      of({ status: 'ACTIVE' }),
      of(preview),
      of(fixtures),
    );

    component.load();

    expect((component as any).http.get).toHaveBeenCalledWith('http://api.test/api/tournaments/t-1');
    expect((component as any).http.get).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/qualification',
    );
    expect((component as any).http.get).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/fixtures',
    );
    expect(component.preview).toEqual(preview);
    expect(component.fixtures).toEqual(fixtures);
    expect(component.loading).toBeFalse();
  });

  it('surfaces a failed tournament workspace request', () => {
    const component = createComponent();
    (component as any).http.get.and.returnValue(
      throwError(() => ({ error: { message: 'Access denied' } })),
    );

    component.load();

    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Access denied');
  });

  it('posts the explicit organiser progression action and reloads authoritative data', () => {
    const component = createComponent();
    component.fixtures = [fixture('LEAGUE', 'l-1', 'COMPLETED')];
    const response = {
      status: 'INITIAL_PLAYOFFS_CREATED',
      message: 'Qualifier 1 and Eliminator fixtures have been generated.',
      qualifier1: fixture('QUALIFIER_1', 'q1'),
      eliminator: fixture('ELIMINATOR', 'e1'),
    };
    (component as any).http.post.and.returnValue(of(response));
    spyOn(component, 'load');

    component.syncPlayoffs();

    expect((component as any).http.post).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/playoffs/progress',
      null,
    );
    expect(component.progressMessage).toContain('Qualifier 1');
    expect(component.progressBusy).toBeFalse();
    expect(component.load).toHaveBeenCalled();
  });

  it('does not call the progression API while league fixtures are incomplete', () => {
    const component = createComponent();
    component.fixtures = [fixture('LEAGUE', 'l-1', 'SCHEDULED')];

    component.syncPlayoffs();

    expect((component as any).http.post).not.toHaveBeenCalled();
  });

  it('resolves fixture winners only from the match result winner id', () => {
    const component = createComponent();
    component.fixtures = [fixture('QUALIFIER_1', 'q1', 'COMPLETED')];
    component.winnerByMatch = { q1: 't2' };

    expect(component.fixtureFor('QUALIFIER_1')?.matchId).toBe('q1');
    expect(component.winnerName('QUALIFIER_1')).toBe('Riders');
    expect(component.winnerName('ELIMINATOR')).toBe('');
  });

  it('maps the confirmed final winner to the champion label', () => {
    const component = createComponent();
    component.fixtures = [fixture('FINAL', 'final-1', 'COMPLETED')];
    component.progress = {
      status: 'CHAMPION_CROWNED',
      message: 'Champion confirmed',
      championTeamId: 't1',
    } as any;

    expect(component.championName).toBe('Titans');
  });

  it('returns match-centre navigation only for persisted playoff fixtures', () => {
    const component = createComponent();

    expect(component.fixtureRoute('QUALIFIER_1')).toBeNull();
    component.fixtures = [fixture('QUALIFIER_1', 'q1')];
    expect(component.fixtureRoute('QUALIFIER_1')).toEqual(['/matches', 'q1']);
  });
});
