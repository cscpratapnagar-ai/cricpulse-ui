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
    component.staffPanelMatchId = null;
    component.staffAssignments = [];
    component.staffCandidates = [];
    component.staffSearch = '';
    component.selectedStaffCandidateId = '';
    component.selectedStaffRole = 'SCORER';
    component.staffLoading = false;
    component.staffSearching = false;
    component.staffBusy = false;
    component.staffError = '';
    component.staffMessage = '';
    (component as any).staffRoles = [
      { value: 'SCORER', label: 'Scorer' },
      { value: 'STREAMER', label: 'Broadcast operator' },
      { value: 'UMPIRE', label: 'Umpire' },
      { value: 'COMMENTATOR', label: 'Commentator' },
    ];
    (component as any).http = {
      get: jasmine.createSpy('get'),
      post: jasmine.createSpy('post'),
      put: jasmine.createSpy('put'),
      delete: jasmine.createSpy('delete'),
    };
    component.loadChildren = jasmine.createSpy('loadChildren');
    return component;
  }

  it('loads match staff when an organiser opens a fixture staff panel', () => {
    const component = createComponent();
    const staff = [
      {
        matchId: 'm-1',
        userId: 'u-1',
        fullName: 'Match Scorer',
        email: 'scorer@example.com',
        role: 'SCORER' as const,
        assignedAt: '2026-11-19T10:00:00Z',
      },
    ];
    (component as any).http.get.and.returnValue(of(staff));

    component.toggleStaffPanel({
      matchId: 'm-1',
      fixtureNumber: 1,
      stage: 'LEAGUE',
      matchName: 'Fixture 1',
      teamAName: 'A',
      teamBName: 'B',
      status: 'SCHEDULED',
    });

    expect((component as any).http.get).toHaveBeenCalledWith(
      'http://api.test/api/matches/m-1/staff',
    );
    expect(component.staffAssignments).toEqual(staff);
    expect(component.staffPanelMatchId).toBe('m-1');
  });

  it('requires a registered user selection before assigning match staff', () => {
    const component = createComponent();
    component.staffPanelMatchId = 'm-1';

    component.assignMatchStaff();

    expect(component.staffError).toContain('Search and select');
    expect((component as any).http.put).not.toHaveBeenCalled();
  });

  it('assigns a selected user to the chosen match-scoped role', () => {
    const component = createComponent();
    component.staffPanelMatchId = 'm-1';
    component.selectedStaffCandidateId = 'u-2';
    component.selectedStaffRole = 'STREAMER';
    (component as any).http.put.and.returnValue(
      of({
        matchId: 'm-1',
        userId: 'u-2',
        fullName: 'Broadcast Operator',
        email: 'operator@example.com',
        role: 'STREAMER',
        assignedAt: '2026-11-19T10:00:00Z',
      }),
    );
    (component as any).http.get.and.returnValue(of([]));

    component.assignMatchStaff();

    expect((component as any).http.put).toHaveBeenCalledWith(
      'http://api.test/api/matches/m-1/staff/streamer',
      { userId: 'u-2' },
    );
    expect(component.staffMessage).toContain('Broadcast Operator assigned');
    expect(component.staffBusy).toBeFalse();
  });

  it('routes each fixture to the correct next operator action', () => {
    const component = createComponent();
    const live = { matchId: 'm-live', status: 'LIVE' } as any;
    const scheduled = { matchId: 'm-next', status: 'SCHEDULED' } as any;
    const completed = { matchId: 'm-done', status: 'COMPLETED' } as any;

    expect(component.workflowRoute(live)).toEqual(['/matches', 'm-live', 'live-scoring']);
    expect(component.workflowAction(live)).toBe('Open live scoring');
    expect(component.workflowRoute(scheduled)).toEqual(['/matches', 'm-next', 'playing-xi']);
    expect(component.workflowAction(scheduled)).toBe('Continue match setup');
    expect(component.workflowRoute(completed)).toEqual(['/matches', 'm-done', 'result']);
    expect(component.workflowAction(completed)).toBe('View match result');
  });

  it('summarises fixture operations by live, scheduled and completed status', () => {
    const component = createComponent();
    component.fixtures = [
      { matchId: '1', status: 'LIVE' } as any,
      { matchId: '2', status: 'SCHEDULED' } as any,
      { matchId: '3', status: 'COMPLETED' } as any,
      { matchId: '4', status: 'SCHEDULED' } as any,
    ];

    expect(component.liveFixtures).toHaveSize(1);
    expect(component.upcomingFixtures).toHaveSize(2);
    expect(component.completedFixtures).toHaveSize(1);
  });

  it('formats fixture times safely for end users', () => {
    const component = createComponent();

    expect(component.scheduledLabel(null)).toBe('Time not scheduled');
    expect(component.scheduledLabel('not-a-date')).toBe('Schedule needs review');
    expect(component.scheduledLabel('2026-11-19T10:00:00+05:30')).not.toBe('Schedule needs review');
  });

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
