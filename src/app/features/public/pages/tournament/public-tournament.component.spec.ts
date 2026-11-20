import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { routes } from '../../../../app.routes';
import { PublicTournamentComponent } from './public-tournament.component';

describe('PublicTournamentComponent', () => {
  let routeParams: BehaviorSubject<ParamMap>;

  beforeEach(() => {
    routeParams = new BehaviorSubject(convertToParamMap({ id: 't-1' }));
    TestBed.configureTestingModule({
      imports: [PublicTournamentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: routeParams.asObservable() },
        },
      ],
    });
  });

  it('keeps the public tournament route open while protecting the organizer dashboard', () => {
    const publicRoute = routes.find((route) => route.path === 'tournament/:id');
    const dashboardRoute = routes.find((route) => route.path === 'dashboard');

    expect(publicRoute).toBeDefined();
    expect(publicRoute?.canActivate).toBeUndefined();
    expect(dashboardRoute?.canActivate?.length).toBeGreaterThan(0);
  });

  it('loads a public tournament summary without requiring an authenticated user', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);

    const request = http.expectOne(`${API_BASE_URL}/public/tournaments/t-1`);
    expect(request.request.method).toBe('GET');
    request.flush({
      tournamentId: 't-1',
      tournamentName: 'City Premier League',
      format: 'T20',
      overs: 20,
      status: 'ACTIVE',
      totalFixtures: 4,
      completedFixtures: 3,
      scheduledFixtures: 1,
      liveFixtures: 0,
      completionPercentage: 75,
      pointsTable: [
        {
          teamId: 'a',
          teamName: 'Falcons',
          played: 3,
          wins: 3,
          losses: 0,
          ties: 0,
          noResults: 0,
          points: 6,
          nrr: 1.25,
          recentForm: ['W', 'W', 'W'],
        },
      ],
      fixtures: [
        {
          matchId: 'm1',
          fixtureNumber: 1,
          stage: 'LEAGUE',
          status: 'COMPLETED',
          teamAName: 'Falcons',
          teamBName: 'Tigers',
          winnerName: 'Falcons',
          scheduledAt: null,
        },
        {
          matchId: 'm2',
          fixtureNumber: 4,
          stage: 'QUALIFIER_1',
          status: 'SCHEDULED',
          teamAName: 'Falcons',
          teamBName: 'Tigers',
          winnerName: null,
          scheduledAt: null,
        },
      ],
    });

    expect(fixture.componentInstance.tournament?.tournamentName).toBe('City Premier League');
    expect(fixture.componentInstance.leagueFixtures).toHaveSize(1);
    expect(fixture.componentInstance.playoffFixtures).toHaveSize(1);
    expect(fixture.componentInstance.stageLabel('QUALIFIER_1')).toBe('Qualifier 1');
    expect(fixture.componentInstance.loading).toBeFalse();
    fixture.destroy();
    http.verify();
  });

  it('cancels the previous request and loads the tournament when the route id changes', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);
    const firstRequest = http.expectOne(`${API_BASE_URL}/public/tournaments/t-1`);

    routeParams.next(convertToParamMap({ id: 't-2' }));

    expect(firstRequest.cancelled).toBeTrue();
    const secondRequest = http.expectOne(`${API_BASE_URL}/public/tournaments/t-2`);
    secondRequest.flush({
      tournamentId: 't-2',
      tournamentName: 'Regional Cup',
      format: 'T10',
      overs: 10,
      status: 'ACTIVE',
      totalFixtures: 0,
      completedFixtures: 0,
      scheduledFixtures: 0,
      liveFixtures: 0,
      completionPercentage: 0,
      pointsTable: [],
      fixtures: [],
    });

    expect(fixture.componentInstance.tournamentId).toBe('t-2');
    expect(fixture.componentInstance.tournament?.tournamentName).toBe('Regional Cup');
    expect(fixture.componentInstance.loading).toBeFalse();
    fixture.destroy();
    http.verify();
  });

  it('shows a safe retry state and issues a fresh request when retried', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(`${API_BASE_URL}/public/tournaments/t-1`)
      .flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.loadError).toBeTrue();
    expect(fixture.componentInstance.tournament).toBeNull();
    expect(fixture.componentInstance.loading).toBeFalse();

    fixture.componentInstance.refresh();
    const retry = http.expectOne(`${API_BASE_URL}/public/tournaments/t-1`);
    retry.flush({
      tournamentId: 't-1',
      tournamentName: 'Recovered Cup',
      format: 'T20',
      overs: 20,
      status: 'ACTIVE',
      totalFixtures: 0,
      completedFixtures: 0,
      scheduledFixtures: 0,
      liveFixtures: 0,
      completionPercentage: 0,
      pointsTable: [],
      fixtures: [],
    });

    expect(fixture.componentInstance.tournament?.tournamentName).toBe('Recovered Cup');
    expect(fixture.componentInstance.loadError).toBeFalse();
    fixture.destroy();
    http.verify();
  });

  it('shows an error state without calling the API when the route id is missing', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);
    const initialRequest = http.expectOne(`${API_BASE_URL}/public/tournaments/t-1`);

    routeParams.next(convertToParamMap({}));

    expect(initialRequest.cancelled).toBeTrue();
    expect(fixture.componentInstance.tournamentId).toBe('');
    expect(fixture.componentInstance.loadError).toBeTrue();
    expect(fixture.componentInstance.loading).toBeFalse();
    http.expectNone((request) => request.url.includes('/public/tournaments/'));
    fixture.destroy();
    http.verify();
  });

  it('renders ties and recent form in the public points table', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${API_BASE_URL}/public/tournaments/t-1`).flush({
      tournamentId: 't-1',
      tournamentName: 'City Premier League',
      format: 'T20',
      overs: 20,
      status: 'ACTIVE',
      totalFixtures: 3,
      completedFixtures: 3,
      scheduledFixtures: 0,
      liveFixtures: 0,
      completionPercentage: 100,
      pointsTable: [
        {
          teamId: 'a',
          teamName: 'Falcons',
          played: 3,
          wins: 1,
          losses: 1,
          ties: 1,
          noResults: 0,
          points: 3,
          nrr: 0.125,
          recentForm: ['W', 'T', 'L'],
        },
      ],
      fixtures: [],
    });

    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('.standings-panel table') as HTMLTableElement;
    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) =>
      cell.textContent?.trim(),
    );
    const row = table.querySelector('tbody tr') as HTMLTableRowElement;
    const cells = Array.from(row.cells).map((cell) => cell.textContent?.trim());

    expect(headers).toContain('T');
    expect(headers).toContain('FORM');
    expect(cells[5]).toBe('1');
    expect(cells[9]).toContain('W');
    expect(cells[9]).toContain('T');
    expect(cells[9]).toContain('L');
    expect(table.closest('[role="region"]')?.getAttribute('aria-label')).toBe(
      'Tournament points table',
    );
    fixture.destroy();
    http.verify();
  });
});
