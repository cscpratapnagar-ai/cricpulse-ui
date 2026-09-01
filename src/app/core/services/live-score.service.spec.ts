import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { LiveScoreService } from './live-score.service';

describe('LiveScoreService', () => {
  let service: LiveScoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(LiveScoreService);
  });

  it('creates the service', () => expect(service).toBeTruthy());

  it('rejects an empty innings id', (done) => {
    service.watch('').subscribe({ error: (error) => {
      expect(error.message).toContain('Innings ID is required');
      done();
    }});
  });
});
