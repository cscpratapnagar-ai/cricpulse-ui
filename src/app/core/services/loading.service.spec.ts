import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => service.reset());

  it('creates the service', () => expect(service).toBeTruthy());

  it('keeps loading hidden when reset', () => {
    service.start();
    service.reset();
    expect(service.isLoading()).toBeFalse();
  });
});
