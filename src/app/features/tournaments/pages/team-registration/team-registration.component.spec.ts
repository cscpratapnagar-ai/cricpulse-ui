import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamRegistrationComponent } from './team-registration.component';

describe('TeamRegistrationComponent', () => {
  let fixture: ComponentFixture<TeamRegistrationComponent>;
  let component: TeamRegistrationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamRegistrationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'id' ? 'tournament-1' : null) },
              routeConfig: { path: 'tournament/:id/register' },
              data: { registrationMode: 'public' },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with an editable eleven-player roster', () => {
    expect(component.players.length).toBe(11);
    expect(component.players[0].jerseyNumber).toBe(1);
    expect(component.players[10].jerseyNumber).toBe(11);
  });

  it('allows adding players up to the thirty-player limit', () => {
    for (let index = 0; index < 25; index += 1) component.addPlayer();
    expect(component.players.length).toBe(30);
    component.addPlayer();
    expect(component.players.length).toBe(30);
  });

  it('does not allow the roster to shrink below two players', () => {
    while (component.players.length > 2) component.removePlayer(0);
    component.removePlayer(0);
    expect(component.players.length).toBe(2);
  });

  it('identifies public registration mode from the route', () => {
    expect(component.manageMode).toBeFalse();
    expect(component.tournamentId).toBe('tournament-1');
  });
});
