import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
  it('starts loading before the request and stops when the stream completes', () => {
    const loading = {
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: LoadingService, useValue: loading }],
    });

    TestBed.runInInjectionContext(() => {
      const request = new HttpRequest('GET', '/api/matches');

      loadingInterceptor(request, () => of(new HttpResponse({ status: 200 }))).subscribe();

      expect(loading.start).toHaveBeenCalledTimes(1);
      expect(loading.stop).toHaveBeenCalledTimes(1);
    });
  });

  it('exports an interceptor function', () => {
    expect(typeof loadingInterceptor).toBe('function');
  });
});
