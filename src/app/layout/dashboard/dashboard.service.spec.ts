import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api.config';
import { DashboardService, DashboardTeam } from './dashboard.service';

describe('DashboardService workspace selection', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  const workspaces: DashboardTeam[] = [
    {
      id: 'team-owner',
      name: 'Weekend Warriors',
      city: 'Surat',
      ownerId: 'user-1',
      role: 'OWNER',
      canManage: true,
    },
    {
      id: 'team-member',
      name: 'Coastal XI',
      city: 'Navsari',
      ownerId: 'user-2',
      role: 'PLAYER',
      canManage: false,
    },
  ];

  beforeEach(() => {
    localStorage.removeItem('cricketpulse_active_team_id');
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('cricketpulse_active_team_id');
  });

  it('loads all owned and member workspaces and selects the first by default', () => {
    service.loadWorkspace();

    const request = http.expectOne(`${API_BASE_URL}/teams/workspaces`);
    expect(request.request.method).toBe('GET');
    request.flush(workspaces);

    expect(service.workspaces()).toEqual(workspaces);
    expect(service.team()).toEqual(workspaces[0]);
    expect(localStorage.getItem('cricketpulse_active_team_id')).toBe('team-owner');
    expect(service.teamLoading()).toBeFalse();
  });

  it('restores the last selected workspace when it is still accessible', () => {
    localStorage.setItem('cricketpulse_active_team_id', 'team-member');
    service.loadWorkspace();
    http.expectOne(`${API_BASE_URL}/teams/workspaces`).flush(workspaces);

    expect(service.team()).toEqual(workspaces[1]);
  });

  it('switches only to a workspace returned by the server', () => {
    service.loadWorkspace();
    http.expectOne(`${API_BASE_URL}/teams/workspaces`).flush(workspaces);

    expect(service.selectWorkspace('team-member')).toBeTrue();
    expect(service.team()).toEqual(workspaces[1]);
    expect(localStorage.getItem('cricketpulse_active_team_id')).toBe('team-member');
    expect(service.selectWorkspace('unknown-team')).toBeFalse();
    expect(service.team()).toEqual(workspaces[1]);
  });

  it('keeps the previous workspace visible when a background reload fails', () => {
    service.loadWorkspace();
    http.expectOne(`${API_BASE_URL}/teams/workspaces`).flush(workspaces);
    service.selectWorkspace('team-member');

    service.loadWorkspace();
    http
      .expectOne(`${API_BASE_URL}/teams/workspaces`)
      .flush({ message: 'Temporary failure' }, { status: 503, statusText: 'Service Unavailable' });

    expect(service.team()).toEqual(workspaces[1]);
    expect(service.workspaces()).toEqual(workspaces);
    expect(service.teamError()).toBeTrue();
    expect(service.teamLoading()).toBeFalse();
  });
});
