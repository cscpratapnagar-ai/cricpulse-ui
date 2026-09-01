import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should load statistics and calculate totals', () => {
    const fixture = TestBed.createComponent(AnalyticsComponent);
    const component = fixture.componentInstance;
    const request = http.expectOne('http://localhost:8080/api/players/statistics');

    request.flush([
      {
        playerId: '1',
        playerName: 'Player One',
        matches: 2,
        runs: 120,
        highestScore: 80,
        battingAverage: 60,
        strikeRate: 130,
        wickets: 2,
        economy: 6,
      },
      {
        playerId: '2',
        playerName: 'Player Two',
        matches: 2,
        runs: 80,
        highestScore: 50,
        battingAverage: 40,
        strikeRate: 110,
        wickets: 5,
        economy: 5,
      },
    ]);

    expect(component.loading).toBeFalse();
    expect(component.totalRuns).toBe(200);
    expect(component.totalWickets).toBe(7);
    expect(component.runsLeader?.playerId).toBe('1');
    expect(component.wicketLeader?.playerId).toBe('2');
  });

  it('should rank players by the selected metric', () => {
    const fixture = TestBed.createComponent(AnalyticsComponent);
    const component = fixture.componentInstance;
    const request = http.expectOne('http://localhost:8080/api/players/statistics');
    request.flush([]);

    component.players = [
      {
        playerId: '1',
        playerName: 'A',
        matches: 1,
        runs: 10,
        highestScore: 10,
        battingAverage: 10,
        strikeRate: 100,
        wickets: 1,
        economy: 5,
      },
      {
        playerId: '2',
        playerName: 'B',
        matches: 1,
        runs: 30,
        highestScore: 30,
        battingAverage: 30,
        strikeRate: 150,
        wickets: 3,
        economy: 4,
      },
    ];
    component.metric = 'wickets';

    expect(component.ranked.map((player) => player.playerId)).toEqual(['2', '1']);
    expect(component.metricValue(component.ranked[0])).toBe('3');
  });
});
