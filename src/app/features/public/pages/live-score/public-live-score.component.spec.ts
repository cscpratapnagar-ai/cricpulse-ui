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
});
