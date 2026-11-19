import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TournamentsComponent } from './tournaments.component';

describe('TournamentsComponent', () => {
  let component: TournamentsComponent;
  let fixture: ComponentFixture<TournamentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentsComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentsComponent);
    component = fixture.componentInstance;
  });

  it('should expose the component class', () => expect(TournamentsComponent).toBeTruthy());

  it('preserves the tournament directory when a refresh fails', () => {
    const http = (component as any).http;
    const existing = [{
      id: 't1', name: 'Summer Cup', format: 'T20', overs: 20,
      location: 'Surat', startDate: null, status: 'ACTIVE', createdAt: '2026-01-01',
    }];
    component.tournaments = existing;
    (component as any).hasLoaded = true;
    spyOn(http, 'get').and.returnValue(throwError(() => new Error('offline')));

    component.load();

    expect(component.tournaments).toBe(existing);
    expect(component.refreshError).toBeTrue();
    expect(component.loadError).toBeFalse();
    expect(component.loading).toBeFalse();
    expect(component.refreshing).toBeFalse();
  });

  it('updates the tournament directory after a successful refresh', () => {
    const http = (component as any).http;
    (component as any).hasLoaded = true;
    spyOn(http, 'get').and.returnValue(of([]));

    component.load();

    expect(component.tournaments).toEqual([]);
    expect(component.refreshError).toBeFalse();
    expect(component.loading).toBeFalse();
    expect(component.refreshing).toBeFalse();
  });
});
