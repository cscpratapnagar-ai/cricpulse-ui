import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TeamsComponent } from './teams.component';

describe('TeamsComponent', () => {
  let component: TeamsComponent;
  let fixture: ComponentFixture<TeamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsComponent);
    component = fixture.componentInstance;
  });

  it('loads teams and restores the saved active team', () => {
    const http = (component as any).http;
    spyOn(http, 'get').and.returnValue(
      of([
        { id: 'team-1', name: 'First XI', ownerId: 'owner-1' },
        { id: 'team-2', name: 'Second XI', ownerId: 'owner-1' },
      ]),
    );
    localStorage.setItem('cricketpulse_active_team_id', 'team-2');

    component.loadTeams();

    expect(component.teams.length).toBe(2);
    expect(component.activeTeamId).toBe('team-2');
    expect(component.loading).toBeFalse();
    expect(component.error).toBeFalse();
  });

  it('falls back to an empty error state when team loading fails', () => {
    const http = (component as any).http;
    spyOn(http, 'get').and.returnValue(throwError(() => new Error('network')));

    component.loadTeams();

    expect(component.teams).toEqual([]);
    expect(component.activeTeam).toBeNull();
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('persists selection and navigates to the selected team', () => {
    const router = TestBed.inject(Router);
    const team = { id: 'team-7', name: 'Cricket Club', ownerId: 'owner-1' };
    spyOn(router, 'navigate');

    component.openTeam(team);

    expect(localStorage.getItem('cricketpulse_active_team_id')).toBe('team-7');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard/teams', 'team-7']);
  });
});
