import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TournamentQualificationComponent } from './tournament-qualification.component';

describe('TournamentQualificationComponent', () => {
  const api = 'http://api.test/api';
  const tournamentId = 't-1';
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

  function fixture(
    stage: string,
    matchId: string,
    status = 'SCHEDULED',
    teamAId = 't1',
    teamBId = 't2',
  ) {
    const names: Record<string, string> = {
      t1: 'Titans',
      t2: 'Riders',
      t3: 'Kings',
      t4: 'Warriors',
    };
    return {
      matchId,
      fixtureNumber: 7,
      stage,
      matchName: stage,
      teamAId,
      teamAName: names[teamAId] ?? 'Team A',
      teamBId,
      teamBName: names[teamBId] ?? 'Team B',
      status,
      scheduledAt: null,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => tournamentId } } },
        },
      ],
    });
  });

  function createComponent() {
    const component = TestBed.runInInjectionContext(() => new TournamentQualificationComponent());
    const http = TestBed.inject(HttpTestingController);
    component.loading = false;
    return { component, http };
  }

  function flushInitialLoad(
    http: HttpTestingController,
    fixtures: ReturnType<typeof fixture>[],
    status = 'ACTIVE',
  ) {
    http.expectOne(`${api}/tournaments/${tournamentId}`).flush({ status });
    http.expectOne(`${api}/tournaments/${tournamentId}/qualification`).flush(preview);
    http.expectOne(`${api}/tournaments/${tournamentId}/fixtures`).flush(fixtures);
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it(
    'loads tournament status, qualification table and persisted fixtures through Angular HTTP',
    () => {
      const { component, http } = createComponent();

      component.load();
      flushInitialLoad(http, [
        fixture('LEAGUE', 'l1', 'COMPLETED'),
        fixture('LEAGUE', 'l2', 'COMPLETED'),
      ]);

      expect(component.preview).toEqual(preview);
      expect(component.fixtures.length).toBe(2);
      expect(component.leagueComplete).toBeTrue();
      expect(component.loading).toBeFalse();
  );;

  it(
    'keeps progression disabled until the tournament is active and all league fixtures are complete',
    () => {
      const { component, http } = createComponent();

      component.load();
      flushInitialLoad(
        http,
        [fixture('LEAGUE', 'l1', 'COMPLETED'), fixture('LEAGUE', 'l2', 'SCHEDULED')],
        'DRAFT',
      );

      expect(component.canProgress).toBeFalse();
      component.tournamentStatus = 'ACTIVE';
      expect(component.canProgress).toBeFalse();
      component.fixtures[1].status = 'COMPLETED';
      expect(component.canProgress).toBeTrue();
  );;

  it(
    'uses persisted backend fixtures for all four stages without generating local fixtures',
    () => {
      const { component, http } = createComponent();
      const persisted = [
        fixture('QUALIFIER_1', 'q1'),
        fixture('ELIMINATOR', 'e1', 'SCHEDULED', 't3', 't4'),
        fixture('QUALIFIER_2', 'q2', 'SCHEDULED', 't2', 't3'),
        fixture('FINAL', 'f1', 'SCHEDULED', 't1', 't3'),
      ];

      component.load();
      flushInitialLoad(http, persisted);

      expect(component.fixtureFor('QUALIFIER_1')?.matchId).toBe('q1');
      expect(component.fixtureFor('ELIMINATOR')?.matchId).toBe('e1');
      expect(component.fixtureFor('QUALIFIER_2')?.matchId).toBe('q2');
      expect(component.fixtureFor('FINAL')?.matchId).toBe('f1');
      expect(component.teamNames('ELIMINATOR')).toEqual(['Kings', 'Warriors']);
  );;

  it('posts progression only after the user action and reloads authoritative fixtures', () => {
    const { component, http } = createComponent();
    component.preview = preview as any;
    component.tournamentStatus = 'ACTIVE';
    component.fixtures = [fixture('LEAGUE', 'l1', 'COMPLETED')];

    component.syncPlayoffs();
    http
      .expectOne(`${api}/tournaments/${tournamentId}/playoffs/progress`)
      .flush({
        status: 'INITIAL_PLAYOFFS_CREATED',
        message: 'Qualifier 1 and Eliminator created.',
      });

    expect(component.progressMessage).toContain('Qualifier 1');
    flushInitialLoad(http, [
      fixture('LEAGUE', 'l1', 'COMPLETED'),
      fixture('QUALIFIER_1', 'q1'),
      fixture('ELIMINATOR', 'e1'),
    ]);
    expect(component.fixtures.map((item) => item.stage)).toContain('QUALIFIER_1');
    expect(component.fixtures.map((item) => item.stage)).toContain('ELIMINATOR');
  });

  it('does not issue a second progression request while the first request is pending', () => {
    const { component, http } = createComponent();
    component.preview = preview as any;
    component.tournamentStatus = 'ACTIVE';
    component.fixtures = [fixture('LEAGUE', 'l1', 'COMPLETED')];

    component.syncPlayoffs();
    component.syncPlayoffs();

    const requests = http.match(`${api}/tournaments/${tournamentId}/playoffs/progress`);
    expect(requests.length).toBe(1);
    requests[0].flush({ status: 'WAITING_FOR_QUALIFIER_RESULTS', message: 'Waiting for results.' });
    flushInitialLoad(http, [
      fixture('LEAGUE', 'l1', 'COMPLETED'),
      fixture('QUALIFIER_1', 'q1'),
      fixture('ELIMINATOR', 'e1', 'SCHEDULED', 't3', 't4'),
    ]);
  });

  it('hydrates a backend-confirmed Super Over winner from the final match result', () => {
    const { component, http } = createComponent();
    const final = fixture('FINAL', 'final-super-over', 'COMPLETED');

    component.load();
    flushInitialLoad(http, [final]);

    http
      .expectOne(`${api}/matches/final-super-over/result`)
      .flush({ winningTeamId: 't2', resultText: 'Won in Super Over' });
    expect(component.winnerName('FINAL')).toBe('Riders');
    expect(component.championName).toBe('Riders');
  });

  it('does not crown a champion without an authoritative winner id', () => {
    const { component, http } = createComponent();

    component.load();
    flushInitialLoad(http, [fixture('FINAL', 'final-no-winner', 'COMPLETED')]);
    http
      .expectOne(`${api}/matches/final-no-winner/result`)
      .flush({ resultText: 'Result pending confirmation' });

    expect(component.championName).toBe('');
    expect(component.winnerName('FINAL')).toBe('');
  });

  it('surfaces forbidden API responses without fabricating bracket fixtures', () => {
    const { component, http } = createComponent();

    component.load();
    http
      .expectOne(`${api}/tournaments/${tournamentId}`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Forbidden');
    expect(component.fixtures).toEqual([]);
    http.expectNone(`${api}/tournaments/${tournamentId}/playoffs/progress`);
  });

  it('surfaces progression conflicts and resets the busy flag for a safe retry', () => {
    const { component, http } = createComponent();
    component.preview = preview as any;
    component.tournamentStatus = 'ACTIVE';
    component.fixtures = [fixture('LEAGUE', 'l1', 'COMPLETED')];

    component.syncPlayoffs();
    http
      .expectOne(`${api}/tournaments/${tournamentId}/playoffs/progress`)
      .flush({ message: 'League stage is not ready.' }, { status: 409, statusText: 'Conflict' });

    expect(component.progressBusy).toBeFalse();
    expect(component.error).toBe('League stage is not ready.');
  });

  it('keeps empty qualification data non-actionable', () => {
    const { component, http } = createComponent();

    component.load();
    http.expectOne(`${api}/tournaments/${tournamentId}`).flush({ status: 'ACTIVE' });
    http.expectOne(`${api}/tournaments/${tournamentId}/qualification`).flush({
      eligible: false,
      message: 'Not enough completed fixtures.',
      table: [],
      qualifiers: [],
    });
    http.expectOne(`${api}/tournaments/${tournamentId}/fixtures`).flush([]);

    expect(component.preview?.table).toEqual([]);
    expect(component.canProgress).toBeFalse();
    expect(component.fixtures).toEqual([]);
  });
});
