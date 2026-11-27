import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Client } from '@stomp/stompjs';
import { LiveScoreConnectionState } from '../../../../core/services/live-score.service';
import { PublicLiveScoreComponent } from './public-live-score.component';

describe('PublicLiveScoreComponent', () => {
  it('should expose the component class', () => expect(PublicLiveScoreComponent).toBeTruthy());

  it('labels every public live connection state clearly', () => {
    const component = Object.create(PublicLiveScoreComponent.prototype) as PublicLiveScoreComponent;

    expect(component.connectionLabel('CONNECTED')).toBe('LIVE UPDATES CONNECTED');
    expect(component.connectionLabel('CONNECTING')).toBe('CONNECTING TO LIVE SCORE');
    expect(component.connectionLabel('RECONNECTING')).toBe('RECONNECTING');
    expect(component.connectionLabel('ERROR')).toBe('LIVE FEED INTERRUPTED');
    expect(component.connectionLabel('DISCONNECTED')).toBe('LIVE FEED DISCONNECTED');
  });

  it('explains that the last confirmed score remains visible during reconnect', () => {
    const component = Object.create(PublicLiveScoreComponent.prototype) as PublicLiveScoreComponent;
    const state: LiveScoreConnectionState = 'RECONNECTING';

    expect(component.connectionMessage(state)).toContain('last confirmed score');
    expect(component.connectionMessage('CONNECTED')).toContain('Instant score updates');
    expect(component.connectionMessage('ERROR')).toContain('Retrying automatically');
  });
});

describe('PublicLiveScoreComponent live innings polling', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLiveScoreComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'match-1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    spyOn(Client.prototype, 'activate').and.stub();
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('does not cancel a slow current-innings request when the next poll interval arrives', fakeAsync(() => {
    const fixture = TestBed.createComponent(PublicLiveScoreComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/matches/match-1'))
      .flush({
        id: 'match-1',
        name: 'Reliability Test',
        format: 'T20',
        status: 'LIVE',
      });
    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/matches/match-1/scorecard'))
      .flush([]);

    fixture.detectChanges();
    tick(0);

    const slowPoll = httpMock.expectOne((request) =>
      request.url.endsWith('/api/public/matches/match-1/current-innings'),
    );

    tick(5000);

    expect(slowPoll.cancelled).toBeFalse();
    httpMock.expectNone((request) =>
      request.url.endsWith('/api/public/matches/match-1/current-innings'),
    );

    slowPoll.flush({
      inningsId: 'innings-1',
      matchId: 'match-1',
      inningsNumber: 1,
      battingTeamId: 'team-a',
      runs: 12,
      wickets: 0,
      legalBalls: 8,
      status: 'LIVE',
    });

    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/innings/innings-1'))
      .flush({
        inningsId: 'innings-1',
        matchId: 'match-1',
        inningsNumber: 1,
        runs: 12,
        wickets: 0,
        legalBalls: 8,
        eventVersion: 1,
      });

    fixture.destroy();
  }));

  it('switches to the replacement innings and disposes the previous score watcher', fakeAsync(() => {
    const fixture = TestBed.createComponent(PublicLiveScoreComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/matches/match-1'))
      .flush({
        id: 'match-1',
        name: 'Innings Switch Test',
        format: 'T20',
        status: 'LIVE',
      });
    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/matches/match-1/scorecard'))
      .flush([]);

    tick(0);
    const firstDiscovery = httpMock.expectOne((request) =>
      request.url.endsWith('/api/public/matches/match-1/current-innings'),
    );
    firstDiscovery.flush({
      inningsId: 'innings-1',
      matchId: 'match-1',
      inningsNumber: 1,
      battingTeamId: 'team-a',
      runs: 10,
      wickets: 0,
      legalBalls: 6,
      status: 'LIVE',
    });

    const firstScoreSnapshot = httpMock.expectOne((request) =>
      request.url.endsWith('/api/public/innings/innings-1'),
    );

    tick(5000);
    const secondDiscovery = httpMock.expectOne((request) =>
      request.url.endsWith('/api/public/matches/match-1/current-innings'),
    );
    secondDiscovery.flush({
      inningsId: 'innings-2',
      matchId: 'match-1',
      inningsNumber: 2,
      battingTeamId: 'team-b',
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      status: 'LIVE',
    });

    expect(firstScoreSnapshot.cancelled).toBeTrue();
    httpMock.expectOne((request) => request.url.endsWith('/api/public/innings/innings-2'));

    fixture.destroy();
  }));

  it('continues innings discovery after a temporary current-innings API failure', fakeAsync(() => {
    const fixture = TestBed.createComponent(PublicLiveScoreComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/matches/match-1'))
      .flush({
        id: 'match-1',
        name: 'Polling Recovery Test',
        format: 'T20',
        status: 'LIVE',
      });
    httpMock
      .expectOne((request) => request.url.endsWith('/api/public/matches/match-1/scorecard'))
      .flush([]);

    tick(0);
    httpMock
      .expectOne((request) =>
        request.url.endsWith('/api/public/matches/match-1/current-innings'),
      )
      .flush(
        { message: 'temporary failure' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    tick(5000);
    httpMock
      .expectOne((request) =>
        request.url.endsWith('/api/public/matches/match-1/current-innings'),
      )
      .flush({
        inningsId: 'innings-recovered',
        matchId: 'match-1',
        inningsNumber: 1,
        battingTeamId: 'team-a',
        runs: 4,
        wickets: 0,
        legalBalls: 3,
        status: 'LIVE',
      });

    httpMock.expectOne((request) =>
      request.url.endsWith('/api/public/innings/innings-recovered'),
    );

    fixture.destroy();
  }));
});
