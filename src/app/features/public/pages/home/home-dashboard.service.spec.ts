import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { HomeDashboardService } from './home-dashboard.service';

describe('HomeDashboardService', () => {
  let service: HomeDashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HomeDashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HomeDashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads workspace matches, teams and unique player count', () => {
    service.load();

    const matchesRequest = http.expectOne(`${API_BASE_URL}/matches`);
    const teamsRequest = http.expectOne(`${API_BASE_URL}/teams/mine`);

    matchesRequest.flush([
      {
        id: 'live-1',
        name: 'Live Match',
        format: 'T20',
        status: 'IN_PROGRESS',
        teamAName: 'Alpha',
        teamBName: 'Beta',
      },
      {
        id: 'next-1',
        name: 'Next Match',
        format: 'T20',
        status: 'SCHEDULED',
        scheduledAt: '2099-01-01T18:30:00+05:30',
        teamAName: 'Gamma',
        teamBName: 'Delta',
      },
    ]);
    teamsRequest.flush([
      { id: 'team-1', name: 'Alpha', city: 'Pune' },
      { id: 'team-2', name: 'Beta', city: 'Pune' },
    ]);

    http
      .expectOne(`${API_BASE_URL}/teams/team-1/players`)
      .flush([{ playerId: 'player-1' }, { playerId: 'player-2' }]);
    http
      .expectOne(`${API_BASE_URL}/teams/team-2/players`)
      .flush([{ playerId: 'player-2' }, { playerId: 'player-3' }]);

    expect(service.liveMatches().length).toBe(1);
    expect(service.nextMatch()?.id).toBe('next-1');
    expect(service.teams().length).toBe(2);
    expect(service.playerCount()).toBe(3);
    expect(service.loading()).toBeFalse();
  });

  it('normalizes backend match statuses for dashboard classification', () => {
    expect(service.normalizeStatus('IN_PROGRESS')).toBe('LIVE');
    expect(service.normalizeStatus('PLAYING')).toBe('LIVE');
    expect(service.normalizeStatus('READY')).toBe('SCHEDULED');
    expect(service.normalizeStatus('FINISHED')).toBe('COMPLETED');
  });
});
