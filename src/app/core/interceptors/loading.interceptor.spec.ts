import { HttpContext, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import {
  loadingInterceptor,
  SHOW_GLOBAL_LOADING,
  SKIP_GLOBAL_LOADING,
} from './loading.interceptor';

describe('loadingInterceptor', () => {
  let loading: {
    start: jasmine.Spy;
    stop: jasmine.Spy;
  };

  beforeEach(() => {
    loading = {
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: LoadingService, useValue: loading }],
    });
  });

  it('keeps ordinary and background requests silent by default', () => {
    TestBed.runInInjectionContext(() => {
      const request = new HttpRequest('GET', '/api/matches');

      loadingInterceptor(request, () => of(new HttpResponse({ status: 200 }))).subscribe();

      expect(loading.start).not.toHaveBeenCalled();
      expect(loading.stop).not.toHaveBeenCalled();
    });
  });

  it('starts and stops the global loader only when explicitly requested', () => {
    TestBed.runInInjectionContext(() => {
      const request = new HttpRequest('POST', '/api/matches', null, {
        context: new HttpContext().set(SHOW_GLOBAL_LOADING, true),
      });

      loadingInterceptor(request, () => of(new HttpResponse({ status: 200 }))).subscribe();

      expect(loading.start).toHaveBeenCalledTimes(1);
      expect(loading.stop).toHaveBeenCalledTimes(1);
    });
  });

  it('allows the skip token to override an explicit global-loading request', () => {
    TestBed.runInInjectionContext(() => {
      const request = new HttpRequest('GET', '/api/matches', null, {
        context: new HttpContext().set(SHOW_GLOBAL_LOADING, true).set(SKIP_GLOBAL_LOADING, true),
      });

      loadingInterceptor(request, () => of(new HttpResponse({ status: 200 }))).subscribe();

      expect(loading.start).not.toHaveBeenCalled();
      expect(loading.stop).not.toHaveBeenCalled();
    });
  });

  it('exports an interceptor function', () => {
    expect(typeof loadingInterceptor).toBe('function');
  });
});
