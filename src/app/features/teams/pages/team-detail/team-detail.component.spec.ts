import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TeamDetailComponent } from './team-detail.component';

describe('TeamDetailComponent', () => {
  let component: TeamDetailComponent;
  let fixture: ComponentFixture<TeamDetailComponent>;
  const route = {
    snapshot: { paramMap: { get: () => 'team-1' } },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDetailComponent],
      providers: [provideHttpClient(), { provide: ActivatedRoute, useValue: route }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDetailComponent);
    component = fixture.componentInstance;
  });

  it('loads team, access, and members for the active route', () => {
    const http = (component as any).http;
    spyOn(http, 'get').and.returnValues(
      of({ id: 'team-1', name: 'Cricket Club', ownerId: 'owner-1' }),
      of({ teamId: 'team-1', role: 'OWNER', canManage: true }),
      of([
        {
          teamId: 'team-1',
          playerId: 'player-1',
          userId: 'user-1',
          fullName: 'Player One',
          email: 'player@example.com',
          role: 'PLAYER',
        },
      ]),
    );

    component.reload();

    expect(component.team?.name).toBe('Cricket Club');
    expect(component.access?.canManage).toBeTrue();
    expect(component.members.length).toBe(1);
    expect(component.loading).toBeFalse();
  });

  it('shows an error state when the team cannot be loaded', () => {
    const http = (component as any).http;
    spyOn(http, 'get').and.returnValue(
      throwError(() => ({ error: { message: 'Team unavailable' } })),
    );

    component.reload();

    expect(component.loadError).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.toast).toBe('Team unavailable');
    expect(component.toastType).toBe('error');
  });

  it('filters members by search and role', () => {
    component.members = [
      {
        teamId: 'team-1',
        playerId: 'p1',
        userId: 'u1',
        fullName: 'Virat Player',
        email: 'virat@example.com',
        role: 'CAPTAIN',
      },
      {
        teamId: 'team-1',
        playerId: 'p2',
        userId: 'u2',
        fullName: 'Bowler Player',
        email: 'bowler@example.com',
        role: 'PLAYER',
      },
    ];

    component.query = 'virat';
    component.roleFilter = 'CAPTAIN';

    expect(component.filteredMembers.map((member) => member.playerId)).toEqual(['p1']);
  });

  it('derives XI readiness without inventing match statistics', () => {
    component.members = Array.from({ length: 11 }, (_, index) => ({
      teamId: 'team-1',
      playerId: `p${index}`,
      userId: `u${index}`,
      fullName: `Player ${index}`,
      email: `player${index}@example.com`,
      role: 'PLAYER',
    }));

    expect(component.activePlayers).toBe(11);
    expect(component.squadHealth).toBe(100);
    expect(component.readinessLabel).toBe('XI READY');
    expect(component.readinessMessage).toContain('Enough playing members');
  });

  it('derives leadership and management coverage from roster roles', () => {
    component.members = [
      {
        teamId: 'team-1',
        playerId: 'captain',
        userId: 'u1',
        fullName: 'Captain One',
        email: 'captain@example.com',
        role: 'CAPTAIN',
      },
      {
        teamId: 'team-1',
        playerId: 'vice',
        userId: 'u2',
        fullName: 'Vice Captain',
        email: 'vice@example.com',
        role: 'VICE_CAPTAIN',
      },
      {
        teamId: 'team-1',
        playerId: 'manager',
        userId: 'u3',
        fullName: 'Manager One',
        email: 'manager@example.com',
        role: 'MANAGER',
      },
    ];

    expect(component.leadershipLabel).toBe('COMPLETE');
    expect(component.leadershipNames).toBe('Captain One · Vice Captain');
    expect(component.managementLabel).toBe('1 ACTIVE');
  });

  it('adds a member and resets the add form after success', () => {
    const http = (component as any).http;
    component.team = { id: 'team-1', name: 'Cricket Club', ownerId: 'owner-1' };
    component.access = { teamId: 'team-1', role: 'OWNER', canManage: true };
    component.email = 'player@example.com';
    component.role = 'CAPTAIN';
    component.showAdd = true;

    spyOn(http, 'post').and.returnValue(
      of({
        teamId: 'team-1',
        playerId: 'p1',
        userId: 'u1',
        fullName: 'New Player',
        email: 'player@example.com',
        role: 'CAPTAIN',
      }),
    );

    component.addMember();

    expect(component.members.length).toBe(1);
    expect(component.email).toBe('');
    expect(component.role).toBe('PLAYER');
    expect(component.showAdd).toBeFalse();
    expect(component.saving).toBeFalse();
  });

  it('does not remove the owner', () => {
    const owner = {
      teamId: 'team-1',
      playerId: 'owner-player',
      userId: 'owner-user',
      fullName: 'Owner',
      email: 'owner@example.com',
      role: 'OWNER',
    };

    component.requestRemove(owner);

    expect(component.confirmMember).toBeNull();
  });
});
