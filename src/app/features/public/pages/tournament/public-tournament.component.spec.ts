import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { PublicTournamentComponent } from './public-tournament.component';

describe('PublicTournamentComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PublicTournamentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 't-1' } } },
        },
      ],
    });
  });

  it('loads a public tournament summary without requiring an authenticated user', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

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
      pointsTable: [{ teamId: 'a', teamName: 'Falcons', played: 3, wins: 3, losses: 0, ties: 0, noResults: 0, points: 6, nrr: 1.25, recentForm: ['W', 'W', 'W'] }],
      fixtures: [
        { matchId: 'm1', fixtureNumber: 1, stage: 'LEAGUE', status: 'COMPLETED', teamAName: 'Falcons', teamBName: 'Tigers', winnerName: 'Falcons', scheduledAt: null },
        { matchId: 'm2', fixtureNumber: 4, stage: 'QUALIFIER_1', status: 'SCHEDULED', teamAName: 'Falcons', teamBName: 'Tigers', winnerName: null, scheduledAt: null },
      ],
    });

    expect(fixture.componentInstance.tournament?.tournamentName).toBe('City Premier League');
    expect(fixture.componentInstance.leagueFixtures).toHaveSize(1);
    expect(fixture.componentInstance.playoffFixtures).toHaveSize(1);
    expect(fixture.componentInstance.stageLabel('QUALIFIER_1')).toBe('Qualifier 1');
    expect(fixture.componentInstance.loading).toBeFalse();
    http.verify();
  });

  it('shows a safe retry state when the public tournament endpoint is unavailable', () => {
    const fixture = TestBed.createComponent(PublicTournamentComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/public/tournaments/t-1`).flush(
      { message: 'Not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(fixture.componentInstance.loadError).toBeTrue();
    expect(fixture.componentInstance.tournament).toBeNull();
    expect(fixture.componentInstance.loading).toBeFalse();
    http.verify();
  });
});
