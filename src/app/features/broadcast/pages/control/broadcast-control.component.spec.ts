import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BroadcastControlComponent } from './broadcast-control.component';

describe('BroadcastControlComponent', () => {
  let http: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post', 'patch', 'put', 'delete']);
    http.get.and.returnValue(of([]) as never);
    http.put.and.returnValue(of([]) as never);
    TestBed.configureTestingModule({
      imports: [BroadcastControlComponent],
      providers: [
        { provide: HttpClient, useValue: http },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('adds the sponsor to the automatic overlay URL when over sponsorship is enabled', () => {
    const component = TestBed.createComponent(BroadcastControlComponent).componentInstance;
    component.sponsorName = 'Shree Motors';
    component.overSponsorEnabled = true;
    component.sponsorDuration = 15;

    const url = new URL(component.autoUrl());

    expect(url.searchParams.get('overSponsor')).toBe('true');
    expect(url.searchParams.get('sponsorType')).toBe('OVER_SPONSOR');
    expect(url.searchParams.get('sponsorName')).toBe('Shree Motors');
    expect(url.searchParams.get('duration')).toBe('15');
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
