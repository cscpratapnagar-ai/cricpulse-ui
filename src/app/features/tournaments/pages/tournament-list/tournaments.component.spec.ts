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

  it('keeps draft, upcoming, active, completed and cancelled statuses distinct', () => {
    const tournament = (id: string, status: string) => ({
      id,
      name: `Cup ${id}`,
      format: 'T20',
      overs: 20,
      location: null,
      startDate: null,
      status,
      createdAt: '2026-01-01',
    });
    component.tournaments = [
      tournament('draft', 'DRAFT'),
      tournament('upcoming', 'SCHEDULED'),
      tournament('active', 'IN_PROGRESS'),
      tournament('completed', 'FINISHED'),
      tournament('cancelled', 'CANCELLED'),
    ];

    expect(component.statusOptions.map((option) => option.value)).toContain('DRAFT');
    expect(component.statusOptions.map((option) => option.value)).toContain('CANCELLED');
    expect(component.draftCount).toBe(1);
    expect(component.upcomingCount).toBe(1);
    expect(component.activeCount).toBe(1);
    expect(component.completedCount).toBe(1);
    expect(component.cancelledCount).toBe(1);
    expect(component.progressFor(component.tournaments[0])).toBe(0);
    expect(component.progressFor(component.tournaments[4])).toBe(0);
  });

  it('filters tournaments by their normalized lifecycle status', () => {
    component.tournaments = [
      {
        id: '1',
        name: 'Draft Cup',
        format: 'T20',
        overs: 20,
        location: null,
        startDate: null,
        status: 'DRAFT',
        createdAt: '2026-01-01',
      },
      {
        id: '2',
        name: 'Live Cup',
        format: 'T20',
        overs: 20,
        location: null,
        startDate: null,
        status: 'IN_PROGRESS',
        createdAt: '2026-01-02',
      },
    ];

    component.statusFilter = 'DRAFT';
    expect(component.visibleTournaments.map((item) => item.id)).toEqual(['1']);

    component.statusFilter = 'ACTIVE';
    expect(component.visibleTournaments.map((item) => item.id)).toEqual(['2']);
  });

  it('preserves the tournament directory when a refresh fails', () => {
    const http = (component as any).http;
    const existing = [
      {
        id: 't1',
        name: 'Summer Cup',
        format: 'T20',
        overs: 20,
        location: 'Surat',
        startDate: null,
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      },
    ];
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
