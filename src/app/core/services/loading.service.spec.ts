import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => service.reset());

  it('does not show loading before the display delay', fakeAsync(() => {
    service.start();

    tick(119);
    expect(service.isLoading()).toBeFalse();

    tick(1);
    expect(service.isLoading()).toBeTrue();
  }));

  it('keeps loading visible until all overlapping requests finish', fakeAsync(() => {
    service.start();
    service.start();
    tick(120);

    service.stop();
    tick(180);
    expect(service.isLoading()).toBeTrue();

    service.stop();
    tick(180);
    expect(service.isLoading()).toBeFalse();
  }));

  it('cancels a pending display when the request finishes quickly', fakeAsync(() => {
    service.start();
    tick(50);
    service.stop();
    tick(500);

    expect(service.isLoading()).toBeFalse();
  }));
});
