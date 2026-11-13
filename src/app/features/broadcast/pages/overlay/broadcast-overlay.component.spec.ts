import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { of } from 'rxjs';
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
    { playerId: 'batter-1', playerName: 'A Batter', runs: 8, ballsFaced: 5, fours: 1, sixes: 0, out: false },
    { playerId: 'batter-2', playerName: 'B Batter', runs: 4, ballsFaced: 3, fours: 0, sixes: 0, out: false },
  ],
  bowlers: [
    { playerId: 'bowler-1', playerName: 'C Bowler', legalBalls: 8, runsConceded: 12, wickets: 0, wides: 0, noBalls: 0 },
  ],
  partnership: { batterOneId: 'batter-1', batterTwoId: 'batter-2', runs: 12, balls: 8 },
};

describe('BroadcastOverlayComponent browser runtime', () => {
  let fixture: ComponentFixture<BroadcastOverlayComponent>;
  let http: jasmine.SpyObj<HttpClient>;
  let liveScore: jasmine.SpyObj<LiveScoreService>;
  let document: Document;
  let mode: string;

  const createOverlay = () => {
    fixture = TestBed.createComponent(BroadcastOverlayComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    mode = 'auto';
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
        { provide: ActivatedRoute, useValue: {
          snapshot: {
            paramMap: { get: () => 'match-1' },
            queryParamMap: { get: (key: string) => key === 'mode' ? mode : null },
          },
        } },
        { provide: HttpClient, useValue: http },
        { provide: LiveScoreService, useValue: liveScore },
      ],
    }).compileComponents();

    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('loads the public match state and renders a live transparent scorebug', () => {
    createOverlay();

    expect(http.get).toHaveBeenCalledWith(
      jasmine.stringMatching(/\/api\/public\/matches\/match-1\/broadcast-state$/),
    );
    expect(liveScore.watch).toHaveBeenCalledWith('innings-1');
    expect(document.documentElement.classList.contains('cricpulse-overlay-mode')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.scorebug')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('12');
    expect(fixture.nativeElement.textContent).toContain('Falcons');
  });

  it('renders the legacy strip scene when strip mode is selected', () => {
    mode = 'strip';
    createOverlay();

    expect(fixture.nativeElement.querySelector('.legacy-strip')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.scorebug')).toBeNull();
  });

  it('detects a new boundary and exposes the automatic FOUR moment', fakeAsync(() => {
    const component = createOverlay();
    const boundary = {
      ...score,
      runs: 16,
      eventVersion: 2,
      recentBalls: [{
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
      }],
    };

    component.onScore(boundary);
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('FOUR');
    expect(component.autoEvent?.title).toBe('FOUR');
  }));

  it('detects wickets before boundary and milestone moments', fakeAsync(() => {
    const component = createOverlay();
    component.onScore({
      ...score,
      runs: 12,
      wickets: 1,
      eventVersion: 2,
      recentBalls: [{
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
      }],
    });
    flushMicrotasks();

    expect(component.autoEvent?.kind).toBe('WICKET');
  }));

  it('removes the OBS transparency class when the overlay is destroyed', () => {
    createOverlay();
    expect(document.documentElement.classList.contains('cricpulse-overlay-mode')).toBeTrue();

    fixture.destroy();

    expect(document.documentElement.classList.contains('cricpulse-overlay-mode')).toBeFalse();
  });
});
