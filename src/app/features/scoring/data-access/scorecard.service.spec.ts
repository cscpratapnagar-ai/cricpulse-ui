import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ScorecardService } from './scorecard.service';

const scorecardFixture = {
  inningsId: 'innings-1',
  inningsNumber: 1,
  teamName: 'Team A',
  runs: 120,
  wickets: 4,
  legalBalls: 90,
  extras: 8,
  batting: [],
  bowling: [],
  fallOfWickets: [],
};

describe('ScorecardService', () => {
  let service: ScorecardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScorecardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the scorecard endpoint for a valid match id', () => {
    service.getScorecard('match-42').subscribe((scorecard) => {
      expect(scorecard).toEqual(scorecardFixture);
    });

    const request = http.expectOne(
      'http://localhost:8080/api/matches/match-42/scorecard',
    );
    expect(request.request.method).toBe('GET');
    request.flush(scorecardFixture);
  });

  it('rejects an empty match id before making a request', () => {
    expect(() => service.getScorecard('')).toThrowError('Match ID is required');
    http.expectNone(() => true);
  });
});
