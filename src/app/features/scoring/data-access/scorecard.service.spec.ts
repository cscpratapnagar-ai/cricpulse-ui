import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ScorecardService } from './scorecard.service';

describe('ScorecardService', () => {
  let service: ScorecardService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ScorecardService);
  });

  it('creates the service', () => expect(service).toBeTruthy());

  it('rejects an empty match id', () => {
    expect(() => service.getScorecard('')).toThrowError('Match ID is required');
  });
});
