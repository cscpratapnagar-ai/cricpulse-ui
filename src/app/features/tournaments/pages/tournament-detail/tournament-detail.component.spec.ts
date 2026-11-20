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
    component.editing = false;
    component.savingEdit = false;
    component.statusChanging = false;
    component.editErrors = {};
    component.editDraft = { name: '', format: 'T20', overs: 20, location: '', startDate: '' };
    component.t = null;
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
    component.managerPanelOpen = false;
    component.tournamentManagers = [];
    component.managerCandidates = [];
    component.managerSearch = '';
    component.selectedManagerCandidateId = '';
    component.managerLoading = false;
    component.managerSearching = false;
    component.managerBusy = false;
    component.managerError = '';
    component.managerMessage = '';
    component.canManageManagers = false;
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
      patch: jasmine.createSpy('patch'),
      delete: jasmine.createSpy('delete'),
    };
    component.loadChildren = jasmine.createSpy('loadChildren');
    return component;
  }

  it('preloads draft values and opens the edit form only for draft tournaments', () => {
    const component = createComponent();
    component.t = {
      id: 't-1', name: 'Summer Cup', format: 'T20', overs: 20,
      location: 'Surat', startDate: '2026-12-01', status: 'DRAFT',
    };

    component.beginEdit();

    expect(component.editing).toBeTrue();
    expect(component.editDraft).toEqual({
      name: 'Summer Cup', format: 'T20', overs: 20, location: 'Surat', startDate: '2026-12-01',
    });
    component.cancelEdit();
    component.t.status = 'ACTIVE';
    component.beginEdit();
    expect(component.editing).toBeFalse();
  });

  it('validates tournament edits before sending an API request', () => {
    const component = createComponent();
    component.t = { id: 't-1', name: 'Cup', format: 'T20', overs: 20, location: null, startDate: null, status: 'DRAFT' };
    component.editing = true;
    component.editDraft = { name: '  ', format: 'T20', overs: 20, location: '', startDate: '' };

    component.saveEdit();

    expect(component.editErrors['name']).toBe('Tournament name is required.');
    expect((component as any).http.patch).not.toHaveBeenCalled();
  });

  it('persists valid tournament edits and updates the displayed model', () => {
    const component = createComponent();
    component.t = { id: 't-1', name: 'Old Cup', format: 'T20', overs: 20, location: null, startDate: null, status: 'DRAFT' };
    component.editing = true;
    component.editDraft = { name: 'New Cup', format: 'ODI', overs: 50, location: 'Navsari', startDate: '2026-12-10' };
    const updated = { ...component.t, name: 'New Cup', format: 'ODI', overs: 50, location: 'Navsari', startDate: '2026-12-10' };
    (component as any).http.patch.and.returnValue(of(updated));

    component.saveEdit();

    expect((component as any).http.patch).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1',
      { name: 'New Cup', format: 'ODI', overs: 50, location: 'Navsari', startDate: '2026-12-10' },
    );
    expect(component.t).toEqual(updated);
    expect(component.editing).toBeFalse();
    expect(component.savingEdit).toBeFalse();
  });

  it('requires confirmation and uses the guarded lifecycle endpoint', () => {
    const component = createComponent();
    component.t = { id: 't-1', name: 'Cup', format: 'T20', overs: 20, location: null, startDate: null, status: 'DRAFT' };
    spyOn(window, 'confirm').and.returnValue(true);
    const updated = { ...component.t, status: 'ACTIVE' };
    (component as any).http.patch.and.returnValue(of(updated));

    component.changeStatus('ACTIVE');

    expect(window.confirm).toHaveBeenCalled();
    expect((component as any).http.patch).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/status', { status: 'ACTIVE' },
    );
    expect(component.t?.status).toBe('ACTIVE');
    expect(component.statusChanging).toBeFalse();
  });

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

  it('loads tournament managers and the owner-only management capability', () => {
    const component = createComponent();
    const managers = [
      {
        tournamentId: 't-1',
        userId: 'u-2',
        fullName: 'Tournament Manager',
        email: 'manager@example.com',
        role: 'MANAGER' as const,
        assignedAt: '2026-11-19T10:00:00Z',
      },
    ];
    (component as any).http.get.and.returnValue(of({ managers, canManage: true }));

    component.toggleManagerPanel();

    expect((component as any).http.get).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/staff',
    );
    expect(component.tournamentManagers).toEqual(managers);
    expect(component.canManageManagers).toBeTrue();
    expect(component.managerPanelOpen).toBeTrue();
  });

  it('searches only after at least two characters are entered', () => {
    const component = createComponent();
    component.managerSearch = 'a';

    component.searchManagerCandidates();

    expect(component.managerError).toContain('at least 2 characters');
    expect((component as any).http.get).not.toHaveBeenCalled();
  });

  it('assigns a selected registered user as tournament manager', () => {
    const component = createComponent();
    component.selectedManagerCandidateId = 'u-3';
    (component as any).http.put.and.returnValue(of({}));
    (component as any).http.get.and.returnValue(of({ managers: [], canManage: true }));

    component.assignTournamentManager();

    expect((component as any).http.put).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/staff/manager',
      { userId: 'u-3' },
    );
    expect(component.managerMessage).toContain('access granted');
    expect(component.managerBusy).toBeFalse();
  });

  it('removes a delegated tournament manager through the owner-scoped API', () => {
    const component = createComponent();
    const manager = {
      tournamentId: 't-1',
      userId: 'u-4',
      fullName: 'Former Manager',
      email: 'former@example.com',
      role: 'MANAGER' as const,
      assignedAt: '2026-11-19T10:00:00Z',
    };
    (component as any).http.delete.and.returnValue(of({}));
    (component as any).http.get.and.returnValue(of({ managers: [], canManage: true }));

    component.removeTournamentManager(manager);

    expect((component as any).http.delete).toHaveBeenCalledWith(
      'http://api.test/api/tournaments/t-1/staff/manager/u-4',
    );
    expect(component.managerMessage).toContain('no longer has tournament manager access');
  });

  it('loads a delegated manager workspace without granting owner-only manager administration', () => {
    const component = createComponent();
    const managers = [
      {
        tournamentId: 't-1',
        userId: 'u-2',
        fullName: 'Delegated Manager',
        email: 'manager@example.com',
        role: 'MANAGER' as const,
        assignedAt: '2026-11-20T08:00:00Z',
      },
    ];
    (component as any).http.get.and.returnValue(of({ managers, canManage: false }));

    component.loadTournamentManagers();

    expect(component.tournamentManagers).toEqual(managers);
    expect(component.canManageManagers).toBeFalse();
    expect(component.managerLoading).toBeFalse();
    expect((component as any).http.put).not.toHaveBeenCalled();
    expect((component as any).http.delete).not.toHaveBeenCalled();
  });

  it('shows an access-denied message when an unassigned user cannot load organiser access', () => {
    const component = createComponent();
    (component as any).http.get.and.returnValue(
      throwError(() => ({ status: 404, error: { message: 'Tournament not found.' } })),
    );

    component.loadTournamentManagers();

    expect(component.managerLoading).toBeFalse();
    expect(component.managerError).toBe('Tournament not found.');
    expect(component.canManageManagers).toBeFalse();
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
