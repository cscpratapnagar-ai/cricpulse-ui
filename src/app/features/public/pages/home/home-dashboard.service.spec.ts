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

    const matches = http.expectOne(`${API_BASE_URL}/matches`);
    const teams = http.expectOne(`${API_BASE_URL}/teams/mine`);

    matches.flush([
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
    teams.flush([
      { id: 'team-1', name: 'Alpha', city: 'Pune' },
      { id: 'team-2', name: 'Beta', city: 'Pune' },
    ]);

    const firstPlayers = http.expectOne(`${API_BASE_URL}/teams/team-1/players`);
    const secondPlayers = http.expectOne(`${API_BASE_URL}/teams/team-2/players`);
    firstPlayers.flush([{ playerId: 'player-1' }, { playerId: 'player-2' }]);
    secondPlayers.flush([{ playerId: 'player-2' }, { playerId: 'player-3' }]);

    expect(service.liveMatches().length).toBe(1);
    expect(service.nextMatch()?.id).toBe('next-1');
    expect(service.teams().length).toBe(2);
    expect(service.playerCount()).toBe(3);
    expect(service.loading()).toBeFalse();
    expect(service.refreshing()).toBeFalse();
    expect(service.error()).toBeFalse();
  });

  it('keeps successful sections available when one dashboard request fails', () => {
    service.load();

    const matches = http.expectOne(`${API_BASE_URL}/matches`);
    const teams = http.expectOne(`${API_BASE_URL}/teams/mine`);
    matches.flush([{ id: 'm1', name: 'Match', format: 'T20', status: 'LIVE' }]);
    teams.flush([], { status: 503, statusText: 'Unavailable' });

    expect(service.matches().length).toBe(1);
    expect(service.teams()).toEqual([]);
    expect(service.matchesError()).toBeFalse();
    expect(service.teamsError()).toBeTrue();
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeTrue();
  });

  it('preserves previously loaded data when a background refresh fails', () => {
    service.load();

    const initialMatches = http.expectOne(`${API_BASE_URL}/matches`);
    const initialTeams = http.expectOne(`${API_BASE_URL}/teams/mine`);
    initialMatches.flush([{ id: 'm1', name: 'Match', format: 'T20', status: 'LIVE' }]);
    initialTeams.flush([{ id: 't1', name: 'Alpha' }]);
    http.expectOne(`${API_BASE_URL}/teams/t1/players`).flush([{ playerId: 'p1' }]);

    service.load();
    expect(service.refreshing()).toBeTrue();
    expect(service.loading()).toBeFalse();

    const refreshedMatches = http.expectOne(`${API_BASE_URL}/matches`);
    const refreshedTeams = http.expectOne(`${API_BASE_URL}/teams/mine`);
    refreshedMatches.flush([], { status: 503, statusText: 'Unavailable' });
    refreshedTeams.flush([{ id: 't1', name: 'Alpha updated' }]);
    http.expectOne(`${API_BASE_URL}/teams/t1/players`).flush([{ playerId: 'p1' }]);

    expect(service.matches()[0].id).toBe('m1');
    expect(service.teams()[0].name).toBe('Alpha updated');
    expect(service.matchesError()).toBeTrue();
    expect(service.refreshing()).toBeFalse();
  });

  it('normalizes backend match statuses for dashboard classification', () => {
    expect(service.normalizeStatus('IN_PROGRESS')).toBe('LIVE');
    expect(service.normalizeStatus('PLAYING')).toBe('LIVE');
    expect(service.normalizeStatus('READY')).toBe('SCHEDULED');
    expect(service.normalizeStatus('FINISHED')).toBe('COMPLETED');
  });
});
