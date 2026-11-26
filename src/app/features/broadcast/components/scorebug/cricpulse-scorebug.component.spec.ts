import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveRecentBall, LiveScore } from '../../../../core/services/live-score.service';
import {
  CricPulseScorebugComponent,
  CricPulseScorebugVariant,
} from './cricpulse-scorebug.component';

describe('CricPulseScorebugComponent', () => {
  let fixture: ComponentFixture<CricPulseScorebugComponent>;
  let component: CricPulseScorebugComponent;

  const makeScore = (overrides: Partial<LiveScore> = {}): LiveScore => ({
    inningsId: 'innings-1',
    matchId: 'match-1',
    inningsNumber: 1,
    runs: 128,
    wickets: 3,
    legalBalls: 78,
    totalOvers: 20,
    targetRuns: 176,
    strikerId: 'batter-1',
    strikerName: 'A Patel',
    nonStrikerId: 'batter-2',
    nonStrikerName: 'B Shah',
    currentBowlerId: 'bowler-1',
    currentBowlerName: 'C Kumar',
    batters: [
      {
        playerId: 'batter-1',
        playerName: 'A Patel',
        runs: 52,
        ballsFaced: 34,
        fours: 5,
        sixes: 2,
        out: false,
      },
      {
        playerId: 'batter-2',
        playerName: 'B Shah',
        runs: 21,
        ballsFaced: 18,
        fours: 2,
        sixes: 0,
        out: false,
      },
    ],
    bowlers: [
      {
        playerId: 'bowler-1',
        playerName: 'C Kumar',
        legalBalls: 18,
        runsConceded: 24,
        wickets: 1,
        wides: 0,
        noBalls: 0,
      },
    ],
    recentBalls: [],
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CricPulseScorebugComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CricPulseScorebugComponent);
    component = fixture.componentInstance;
    component.score = makeScore();
    fixture.detectChanges();
  });

  it('renders the live score, teams and innings context', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[aria-label="CricPulse live cricket score"]')).not.toBeNull();
    expect(element.textContent).toContain('128');
    expect(element.textContent).toContain('A Patel');
    expect(element.textContent).toContain('B Shah');
    expect(element.textContent).toContain('NEED 48 RUNS IN 42 BALLS');
  });

  it('calculates overs, current rate and required rate from legal balls', () => {
    expect(component.overs).toBe('13.0');
    expect(component.currentRate).toBe('9.85');
    expect(component.remainingRuns).toBe(48);
    expect(component.remainingBalls).toBe(42);
    expect(component.requiredRate).toBe('6.86');
  });

  it('returns a safe rate when no legal delivery has been bowled', () => {
    component.score = makeScore({ legalBalls: 0 });
    expect(component.overs).toBe('0.0');
    expect(component.currentRate).toBe('0.00');
  });

  it('does not divide by zero when the chase has no balls remaining', () => {
    component.score = makeScore({ legalBalls: 120, runs: 175 });
    expect(component.remainingBalls).toBe(0);
    expect(component.requiredRate).toBe('—');
  });

  it('uses team initials when logos are not supplied and supplied images otherwise', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(component.initials('Gujarat Titans')).toBe('GT');
    expect(element.querySelectorAll('.identity-fallback').length).toBe(2);

    component.battingLogoUrl = '/assets/team-a.png';
    component.bowlingLogoUrl = '/assets/team-b.png';
    fixture.detectChanges();
    expect(element.querySelectorAll('.identity img').length).toBe(2);
  });

  it('limits recent delivery tokens to the latest six and labels extras and wickets', () => {
    const recentBalls: LiveRecentBall[] = Array.from({ length: 8 }, (_, index) => ({
      deliveryId: `delivery-${index}`,
      overNumber: 1,
      ballNumber: index + 1,
      strikerId: 'batter-1',
      nonStrikerId: 'batter-2',
      bowlerId: 'bowler-1',
      batRuns: 0,
      extraRuns: 0,
      legalDelivery: true,
      totalRuns: index,
    }));
    recentBalls[5].wicketType = 'BOWLED';
    recentBalls[6].extraType = 'WIDE';
    recentBalls[7].extraType = 'NO_BALL';
    component.score = makeScore({ recentBalls });
    fixture.detectChanges();

    expect(component.recentBalls.length).toBe(6);
    expect(component.ballToken(component.recentBalls[3])).toBe('W');
    expect(component.ballToken(component.recentBalls[4])).toBe('Wd');
    expect(component.ballToken(component.recentBalls[5])).toBe('Nb');
  });

  it('renders all supported broadcast variants with the matching context', () => {
    const variants: CricPulseScorebugVariant[] = [
      'standard',
      'chase',
      'powerplay',
      'last-overs',
      'super-over',
    ];

    for (const variant of variants) {
      component.variant = variant;
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.cp-scorebug')).not.toBeNull();
    }

    component.variant = 'powerplay';
    expect(component.contextText).toBe('POWERPLAY');
    component.variant = 'super-over';
    expect(component.contextText).toBe('SUPER OVER');
  });
});
