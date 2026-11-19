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

  it('compares only the selected players using tournament performance rows', () => {
    const fixture = TestBed.createComponent(TournamentAnalyticsComponent);
    const component = fixture.componentInstance;
    component.analytics = {
      playerPerformances: [
        { playerId: 'p1', playerName: 'A', matches: 2, battingInnings: 2, runs: 80, highestScore: 50, dismissals: 2, battingBalls: 50, battingAverage: 40, strikeRate: 160, bowlingInnings: 1, bowlingBalls: 12, runsConceded: 10, wickets: 2, bowlingAverage: 5, economy: 5, bowlingStrikeRate: 6, catches: 1, runOuts: 0, stumpings: 0, totalFieldingContributions: 1 },
        { playerId: 'p2', playerName: 'B', matches: 2, battingInnings: 2, runs: 60, highestScore: 40, dismissals: 2, battingBalls: 48, battingAverage: 30, strikeRate: 125, bowlingInnings: 1, bowlingBalls: 12, runsConceded: 14, wickets: 1, bowlingAverage: 14, economy: 7, bowlingStrikeRate: 12, catches: 0, runOuts: 1, stumpings: 0, totalFieldingContributions: 1 },
      ],
    } as NonNullable<typeof component.analytics>;
    component.setCompareLeft('p1');
    component.setCompareRight('p2');
    expect(component.tournamentComparison?.left.runs).toBe(80);
    expect(component.comparisonMetrics.find((metric) => metric.label === 'Economy')?.lower).toBe(true);
    component.setCompareRight('p1');
    expect(component.tournamentComparison).toBeNull();
  });
});
