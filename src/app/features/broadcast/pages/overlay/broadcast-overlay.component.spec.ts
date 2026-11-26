import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SKIP_GLOBAL_LOADING } from '../../../../core/interceptors/loading.interceptor';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';
import { BroadcastOverlayComponent } from './broadcast-overlay.component';

const score: LiveScore = {
  inningsId: 'innings-1',
  matchId: 'match-1',
  inningsNumber: 1,
  runs: 12,
  wickets: 0,
  legalBalls: 8,
  totalOvers: 20,
  status: 'LIVE',
  strikerId: 'batter-1',
  strikerName: 'A Batter',
  nonStrikerId: 'batter-2',
  nonStrikerName: 'B Batter',
  currentBowlerId: 'bowler-1',
  currentBowlerName: 'C Bowler',
  eventVersion: 1,
  recentBalls: [],
  batters: [
    {
      playerId: 'batter-1',
      playerName: 'A Batter',
      runs: 8,
      ballsFaced: 5,
      fours: 1,
      sixes: 0,
      out: false,
    },
    {
      playerId: 'batter-2',
      playerName: 'B Batter',
      runs: 4,
      ballsFaced: 3,
      fours: 0,
      sixes: 0,
      out: false,
    },
  ],
  bowlers: [
    {
      playerId: 'bowler-1',
      playerName: 'C Bowler',
      legalBalls: 8,
      runsConceded: 12,
      wickets: 0,
      wides: 0,
      noBalls: 0,
    },
  ],
  partnership: { batterOneId: 'batter-1', batterTwoId: 'batter-2', runs: 12, balls: 8 },
  fallOfWickets: [{ wicketNumber: 1, playerId: 'batter-1', runs: 8, overNumber: 1, ballNumber: 3 }],
};

describe('BroadcastOverlayComponent browser runtime', () => {
  let fixture: ComponentFixture<BroadcastOverlayComponent>;
  let http: jasmine.SpyObj<HttpClient>;
  let liveScore: jasmine.SpyObj<LiveScoreService>;
  let document: Document;
  let mode: string;
  let queryValues: Record<string, string> = {};

  const createOverlay = () => {
    fixture = TestBed.createComponent(BroadcastOverlayComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    mode = 'auto';
    queryValues = {};
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    liveScore = jasmine.createSpyObj<LiveScoreService>('LiveScoreService', ['watch']);
    http.get.and.returnValue(
      of({
        match: {
          id: 'match-1',
          name: 'Final Match',
          format: 'T20',
          status: 'LIVE',
          teamAId: 'team-a',
          teamBId: 'team-b',
          teamAName: 'Falcons',
          teamBName: 'Titans',
          currentInningsId: 'innings-1',
        },
        innings: [{ score, battingTeamId: 'team-a', bowlingTeamId: 'team-b' }],
      }) as never,
    );
    liveScore.watch.and.returnValue(of(score));

    await TestBed.configureTestingModule({
      imports: [BroadcastOverlayComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'match-1' },
              queryParamMap: {
                get: (key: string) => (key === 'mode' ? mode : queryValues[key] || null),
              },
            },
          },
        },
        { provide: HttpClient, useValue: http },
        { provide: LiveScoreService, useValue: liveScore },
      ],
    }).compileComponents();

    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('shows the sponsor moment for an automatic completed-over event', () => {
    mode = 'auto';
    queryValues = { overSponsor: 'true', sponsorName: 'Shree Motors' };
    const component = createOverlay();
    component.autoEvent = {
      kind: 'OVER_COMPLETE',
      title: 'OVER COMPLETE',
      detail: '10.0 OVERS · 8 RUNS',
      mark: 'OV',
      version: 10,
    };
    fixture.detectChanges();

    expect(component.isOverSponsorEvent).toBeTrue();
    expect(fixture.nativeElement.querySelector('.sponsor-graphic')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Shree Motors');
  });
  it('renders a sponsor graphic without requiring live score data', () => {
    mode = 'sponsor';
    queryValues = {
      sponsorType: 'MAIN_SPONSOR',
      sponsorName: 'Shree Motors',
      sponsorTagline: 'Drive with trust',
      sponsorLabel: 'POWERED BY',
      duration: '15',
    };
    createOverlay();

    expect(http.get).not.toHaveBeenCalled();
    const graphic = fixture.nativeElement.querySelector('.sponsor-graphic') as HTMLElement;
    expect(graphic).not.toBeNull();
    expect(graphic.textContent).toContain('Shree Motors');
    expect(graphic.textContent).toContain('Drive with trust');
    expect(graphic.style.getPropertyValue('--sponsor-duration')).toBe('15s');
  });

  it('marks the feed stale when refresh fails after a match snapshot was loaded', () => {
    const component = createOverlay();
    expect(component.broadcastHealth).toBe('LIVE');

    http.get.and.returnValue(throwError(() => ({ status: 503 })) as never);
    (component as unknown as { refreshBroadcastState: () => void }).refreshBroadcastState();

    expect(component.broadcastHealth).toBe('STALE');
    expect(component.broadcastError).toContain('Unable to load');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.broadcast-health')?.textContent).toContain(
      'STALE DATA',
    );
  });

  it('marks the feed as unavailable when the initial broadcast request fails', () => {
    http.get.and.returnValue(throwError(() => ({ status: 503 })) as never);
    const component = createOverlay();

    expect(component.broadcastHealth).toBe('ERROR');
    expect(component.broadcastError).toContain('Unable to load');
  });

  it('loads the public match state and renders a live transparent scorebug', () => {
    createOverlay();

    expect(String(http.get.calls.first().args[0])).toContain(
      '/api/public/matches/match-1/broadcast-state',
    );
    const requestOptions = http.get.calls.first().args[1] as {
      context: import('@angular/common/http').HttpContext;
    };
    expect(requestOptions.context.get(SKIP_GLOBAL_LOADING)).toBeTrue();
    expect(liveScore.watch).toHaveBeenCalledWith('innings-1');
    expect(document.documentElement.classList.contains('cricpulse-overlay-mode')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.cp-scorebug')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('12');
    expect(fixture.nativeElement.textContent).toContain('Falcons');
  });

  it('renders a fall-of-wickets graphic with dismissed batter, score and over', () => {
    mode = 'fall-of-wickets';
    createOverlay();

    const graphic = fixture.nativeElement.querySelector('.fall-of-wickets-graphic');
    expect(graphic).not.toBeNull();
    expect(graphic.textContent).toContain('FALL OF WICKETS');
    expect(graphic.textContent).toContain('A Batter');
    expect(graphic.textContent).toContain('1.3 OV');
    expect(graphic.textContent).toContain('8');
  });

  it('renders the innings-break graphic with completed score and limited-overs target', () => {
    mode = 'innings-break';
    createOverlay();

    const graphic = fixture.nativeElement.querySelector('.innings-break-graphic') as HTMLElement;
    expect(graphic).not.toBeNull();
    expect(graphic.textContent).toContain('INNINGS BREAK');
    expect(graphic.textContent).toContain('Falcons');
    expect(graphic.textContent).toContain('12/0');
    expect(graphic.textContent).toContain('1.2 / 20');
    expect(graphic.querySelector('.innings-break-target')?.textContent).toContain('13');
    expect(graphic.textContent).toContain('Titans');
  });

  it('renders the official match result graphic with winner and both innings scorecards', () => {
    mode = 'match-result';
    const component = createOverlay();
    component.match = {
      id: 'match-1',
      name: 'Final Match',
      format: 'T20',
      status: 'COMPLETED',
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Falcons',
      teamBName: 'Titans',
      winningTeamId: 'team-b',
      resultType: 'WIN',
      resultText: 'Titans won by 4 wickets',
    };
    component.innings = [
      {
        score: { ...score, status: 'COMPLETED', runs: 145, wickets: 8, legalBalls: 120 },
        battingTeamId: 'team-a',
      },
      {
        score: {
          ...score,
          inningsId: 'innings-2',
          inningsNumber: 2,
          status: 'COMPLETED',
          runs: 146,
          wickets: 6,
          legalBalls: 114,
        },
        battingTeamId: 'team-b',
      },
    ];
    fixture.detectChanges();

    const graphic = fixture.nativeElement.querySelector('.match-result-graphic') as HTMLElement;
    expect(graphic).not.toBeNull();
    expect(graphic.textContent).toContain('CHAMPIONS');
    expect(graphic.textContent).toContain('Titans');
    expect(graphic.textContent).toContain('Titans won by 4 wickets');
    expect(graphic.textContent).toContain('145/8');
    expect(graphic.textContent).toContain('146/6');
    expect(graphic.querySelector('.winner')?.textContent).toContain('WINNER');
  });

  it('labels a tied result without inventing a winning team', () => {
    mode = 'match-result';
    const component = createOverlay();
    component.match = {
      id: 'match-1',
      name: 'Final Match',
      format: 'T20',
      status: 'COMPLETED',
      resultType: 'TIE',
      resultText: 'Match tied',
    };
    fixture.detectChanges();

    const graphic = fixture.nativeElement.querySelector('.match-result-graphic') as HTMLElement;
    expect(graphic.textContent).toContain('MATCH TIED');
    expect(graphic.textContent).toContain('Match tied');
    expect(graphic.querySelector('.match-result-heading > strong')).toBeNull();
  });

  it('renders the legacy strip scene when strip mode is selected', () => {
    mode = 'strip';
    createOverlay();

    expect(fixture.nativeElement.querySelector('.legacy-strip')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cp-scorebug')).toBeNull();
  });

  it('detects a new boundary and exposes the automatic FOUR moment', fakeAsync(() => {
    const component = createOverlay();
    const boundary = {
      ...score,
      runs: 16,
      eventVersion: 2,
      recentBalls: [
        {
          deliveryId: 'delivery-2',
          overNumber: 2,
          ballNumber: 3,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 4,
          extraRuns: 0,
          legalDelivery: true,
          totalRuns: 4,
        },
      ],
    };

    component.onScore(boundary);
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('FOUR');
    expect(component.autoEvent?.title).toBe('FOUR');
    fixture.detectChanges();
    const graphic = fixture.nativeElement.querySelector('.moment.four') as HTMLElement;
    expect(graphic).not.toBeNull();
    expect(graphic.getAttribute('aria-live')).toBe('polite');
    expect(graphic.getAttribute('aria-label')).toContain('FOUR');
  }));

  it('ignores stale score versions without regressing the event baseline', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({ ...score, eventVersion: 5, runs: 20, wickets: 0 });
    component.autoEvent = null;
    component.onScore({
      ...score,
      eventVersion: 4,
      runs: 20,
      wickets: 1,
      recentBalls: [
        {
          deliveryId: 'stale-wicket',
          overNumber: 2,
          ballNumber: 3,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 0,
          extraRuns: 0,
          wicketType: 'BOWLED',
          legalDelivery: true,
          totalRuns: 0,
        },
      ],
    });
    component.onScore({
      ...score,
      eventVersion: 6,
      runs: 21,
      wickets: 0,
      legalBalls: 9,
      recentBalls: [
        {
          deliveryId: 'current-single',
          overNumber: 2,
          ballNumber: 4,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 1,
          extraRuns: 0,
          legalDelivery: true,
          totalRuns: 1,
        },
      ],
    });
    flushMicrotasks();

    expect(component.autoEvent).toBeNull();
  }));

  it('detects a SIX event from the live score feed', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 18,
      eventVersion: 2,
      recentBalls: [
        {
          deliveryId: 'delivery-6',
          overNumber: 2,
          ballNumber: 3,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 6,
          extraRuns: 0,
          legalDelivery: true,
          totalRuns: 6,
        },
      ],
    });
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('SIX');
    expect(component.autoEvent?.title).toBe('SIX');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.six')).not.toBeNull();
  }));

  it('uses the newest delivery when the over contains an earlier FOUR and latest SIX', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 22,
      eventVersion: 2,
      recentBalls: [
        {
          deliveryId: 'delivery-earlier-four',
          overNumber: 2,
          ballNumber: 3,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 4,
          extraRuns: 0,
          legalDelivery: true,
          totalRuns: 4,
        },
        {
          deliveryId: 'delivery-latest-six',
          overNumber: 2,
          ballNumber: 4,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 6,
          extraRuns: 0,
          legalDelivery: true,
          totalRuns: 6,
        },
      ],
    });
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('SIX');
    expect(component.autoEvent?.mark).toBe('6');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.six')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.moment.four')).toBeNull();
  }));

  it('re-subscribes to the live score feed after a connection error', fakeAsync(() => {
    liveScore.watch.and.returnValues(
      throwError(() => new Error('WebSocket disconnected')),
      of(score),
    );

    createOverlay();
    expect(liveScore.watch).toHaveBeenCalledTimes(1);

    tick(2000);
    fixture.detectChanges();

    expect(liveScore.watch).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.cp-scorebug')).not.toBeNull();
  }));

  it('celebrates a batter reaching a half-century with a dedicated graphic', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 54,
      eventVersion: 2,
      batters: score.batters?.map((item) =>
        item.playerId === 'batter-1' ? { ...item, runs: 50, ballsFaced: 31 } : item,
      ),
    });
    flushMicrotasks();
    expect(component.autoEvent?.kind).toBe('MILESTONE');
    expect(component.autoEvent?.title).toBe('HALF-CENTURY');
    expect(component.autoEvent?.milestoneLevel).toBe(50);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.half-century')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('A Batter');
  }));

  it('celebrates a batter reaching a century with a distinct graphic', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 104,
      eventVersion: 2,
      batters: score.batters?.map((item) =>
        item.playerId === 'batter-1' ? { ...item, runs: 100, ballsFaced: 62 } : item,
      ),
    });
    flushMicrotasks();
    expect(component.autoEvent?.title).toBe('CENTURY');
    expect(component.autoEvent?.milestoneLevel).toBe(100);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.century')).not.toBeNull();
  }));

  it('detects an over-complete moment at the end of a legal over', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 15,
      legalBalls: 12,
      eventVersion: 2,
      recentBalls: [
        {
          deliveryId: 'delivery-over-end',
          overNumber: 2,
          ballNumber: 6,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 1,
          extraRuns: 0,
          legalDelivery: true,
          totalRuns: 1,
        },
      ],
    });
    flushMicrotasks();
    expect(component.autoEvent?.kind).toBe('OVER_COMPLETE');
    expect(component.autoEvent?.title).toBe('OVER COMPLETE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.over-complete')).not.toBeNull();
  }));

  it('detects wickets before boundary and milestone moments', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 12,
      wickets: 1,
      eventVersion: 2,
      recentBalls: [
        {
          deliveryId: 'delivery-w',
          overNumber: 2,
          ballNumber: 3,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 0,
          extraRuns: 0,
          wicketType: 'BOWLED',
          legalDelivery: true,
          totalRuns: 0,
        },
      ],
    });
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('WICKET');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.wicket')).not.toBeNull();
  }));

  it('detects a RUN_OUT wicket and shows the run-out detail in the OBS graphic', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 13,
      wickets: 1,
      eventVersion: 2,
      batters: score.batters?.map((item) =>
        item.playerId === 'batter-2' ? { ...item, out: true, dismissalType: 'RUN_OUT' } : item,
      ),
      recentBalls: [
        {
          deliveryId: 'delivery-run-out',
          overNumber: 2,
          ballNumber: 3,
          strikerId: 'batter-1',
          nonStrikerId: 'batter-2',
          bowlerId: 'bowler-1',
          batRuns: 1,
          extraRuns: 0,
          wicketType: 'RUN_OUT',
          legalDelivery: true,
          totalRuns: 1,
        },
      ],
    });
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('WICKET');
    expect(component.autoEvent?.detail).toBe('RUN OUT');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.moment.wicket')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.moment.wicket').textContent).toContain('RUN OUT');
  }));

  it('still detects a RUN_OUT when the wicket count updates before recentBalls', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      wickets: 1,
      eventVersion: 2,
      batters: score.batters?.map((item) =>
        item.playerId === 'batter-2' ? { ...item, out: true, dismissalType: 'RUN_OUT' } : item,
      ),
      recentBalls: [],
    });
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('WICKET');
    expect(component.autoEvent?.detail).toBe('RUN OUT');
  }));

  for (const wicketType of [
    'BOWLED',
    'CAUGHT',
    'LBW',
    'RUN_OUT',
    'STUMPED',
    'HIT_WICKET',
    'HIT_BALL_TWICE',
    'OBSTRUCTING_THE_FIELD',
  ]) {
    it(`shows an OBS wicket moment for ${wicketType}`, fakeAsync(() => {
      const component = createOverlay();
      component.onScore({
        ...score,
        wickets: 1,
        eventVersion: 2,
        recentBalls: [
          {
            deliveryId: 'delivery-' + wicketType,
            overNumber: 2,
            ballNumber: 3,
            strikerId: 'batter-1',
            nonStrikerId: 'batter-2',
            bowlerId: 'bowler-1',
            batRuns: 0,
            extraRuns: 0,
            wicketType,
            legalDelivery: true,
            totalRuns: 0,
          },
        ],
      });
      flushMicrotasks();

      expect(component.autoEvent?.kind).toBe('WICKET');
      expect(component.autoEvent?.detail).toBe(wicketType.replaceAll('_', ' '));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.moment.wicket')).not.toBeNull();
    }));
  }

  it('removes the OBS transparency class when the overlay is destroyed', () => {
    createOverlay();
    expect(document.documentElement.classList.contains('cricpulse-overlay-mode')).toBeTrue();

    fixture.destroy();

    expect(document.documentElement.classList.contains('cricpulse-overlay-mode')).toBeFalse();
  });
});
