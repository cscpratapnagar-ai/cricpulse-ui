import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PlayersComponent } from './players.component';

describe('PlayersComponent', () => {
  let component: PlayersComponent;
  let fixture: ComponentFixture<PlayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayersComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayersComponent);
    component = fixture.componentInstance;
  });

  it('loads player statistics and clears loading state', () => {
    const http = (component as any).http;
    spyOn(http, 'get').and.returnValue(
      of([
        {
          playerId: 'p1',
          playerName: 'Run Maker',
          matches: 4,
          runs: 180,
          highestScore: 80,
          battingAverage: 45,
          strikeRate: 120,
          wickets: 0,
          economy: 0,
        },
      ]),
    );

    component.loadPlayers();

    expect(component.players.length).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeFalse();
  });

  it('shows an error state when statistics loading fails', () => {
    const http = (component as any).http;
    spyOn(http, 'get').and.returnValue(throwError(() => new Error('network')));

    component.loadPlayers();

    expect(component.players).toEqual([]);
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('filters by search and player role', () => {
    component.players = [
      {
        playerId: 'p1',
        playerName: 'All Rounder',
        matches: 3,
        runs: 100,
        highestScore: 60,
        battingAverage: 50,
        strikeRate: 120,
        wickets: 5,
        economy: 6,
      },
      {
        playerId: 'p2',
        playerName: 'Bowling Star',
        matches: 3,
        runs: 0,
        highestScore: 0,
        battingAverage: 0,
        strikeRate: 0,
        wickets: 7,
        economy: 5,
      },
    ];

    component.query = 'all';
    component.setRole('allrounders');

    expect(component.filtered.map((player) => player.playerId)).toEqual(['p1']);
  });

  it('resets pagination when changing sort or role', () => {
    component.page = 3;
    component.setRole('bowlers');

    expect(component.page).toBe(1);

    component.page = 2;
    component.sortBy('wickets');

    expect(component.sort).toBe('wickets');
    expect(component.page).toBe(1);
  });
});
