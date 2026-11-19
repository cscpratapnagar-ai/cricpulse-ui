import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TournamentAnalyticsComponent } from './tournament-analytics.component';

describe('TournamentAnalyticsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TournamentAnalyticsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'tournament-1' } } },
        },
        {
          provide: HttpClient,
          useValue: { get: () => of({}) },
        },
      ],
    });
  });

  it('should expose the component class', () => {
    expect(TournamentAnalyticsComponent).toBeTruthy();
  });

  it('should expose consolidated tournament player performance rows', () => {
    const fixture = TestBed.createComponent(TournamentAnalyticsComponent);
    fixture.componentInstance.analytics = {
      playerPerformances: [
        {
          playerId: 'player-1',
          playerName: 'A Player',
          matches: 2,
          battingInnings: 2,
          runs: 84,
          highestScore: 60,
          dismissals: 1,
          battingBalls: 55,
          battingAverage: 84,
          strikeRate: 152.73,
          bowlingInnings: 2,
          bowlingBalls: 24,
          runsConceded: 30,
          wickets: 4,
          bowlingAverage: 7.5,
          economy: 7.5,
          bowlingStrikeRate: 6,
          catches: 2,
          runOuts: 1,
          stumpings: 1,
          totalFieldingContributions: 4,
        },
      ],
    } as NonNullable<typeof fixture.componentInstance.analytics>;

    expect(fixture.componentInstance.playerPerformances.length).toBe(1);
    expect(fixture.componentInstance.playerPerformances[0].totalFieldingContributions).toBe(4);
  });
});
