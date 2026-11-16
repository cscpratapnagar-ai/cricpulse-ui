import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BroadcastControlComponent } from './broadcast-control.component';

describe('BroadcastControlComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BroadcastControlComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('builds the automatic OBS browser-source URL for the current match', () => {
    const fixture = TestBed.createComponent(BroadcastControlComponent);
    const component = fixture.componentInstance;

    expect(component.autoUrl()).toBe(
      window.location.origin + '/broadcast/match-123/overlay?mode=auto',
    );
  });

  it('exposes all four persistent scenes and six manual event graphics', () => {
    const component = TestBed.createComponent(BroadcastControlComponent).componentInstance;

    expect(component.scenes.map((scene) => scene.mode)).toEqual([
      'strip',
      'batter',
      'bowler',
      'partnership',
    ]);
    expect(component.events.map((event) => event.kind)).toEqual([
      'FOUR',
      'SIX',
      'WICKET',
      'MILESTONE',
      'OVER_COMPLETE',
      'RESULT',
    ]);
  });
  it('builds a shareable sponsor URL with encoded details and bounded duration', () => {
    const component = TestBed.createComponent(BroadcastControlComponent).componentInstance;
    component.sponsorName = 'Shree Motors & Sons';
    component.sponsorTagline = 'Drive with trust';
    component.sponsorLogo = 'https://example.com/logo.png';
    component.sponsorDuration = 45;

    const url = new URL(component.sponsorUrl());

    expect(url.searchParams.get('mode')).toBe('sponsor');
    expect(url.searchParams.get('sponsorName')).toBe('Shree Motors & Sons');
    expect(url.searchParams.get('sponsorTagline')).toBe('Drive with trust');
    expect(url.searchParams.get('sponsorLogo')).toBe('https://example.com/logo.png');
    expect(url.searchParams.get('duration')).toBe('30');
  });
});
