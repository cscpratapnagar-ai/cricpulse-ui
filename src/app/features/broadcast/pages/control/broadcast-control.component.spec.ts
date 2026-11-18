import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BroadcastControlComponent } from './broadcast-control.component';

describe('BroadcastControlComponent', () => {
  let http: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', [
      'get',
      'post',
      'patch',
      'put',
      'delete',
    ]);
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
      'PLAYER_OF_THE_MATCH',
    ]);
  });
  it('uses the automatic overlay URL for live preview and refreshes it on demand', () => {
    const component = TestBed.createComponent(BroadcastControlComponent).componentInstance;
    component.selectedTheme = 'blue';

    const preview = new URL(component.previewUrl());
    expect(preview.pathname).toBe('/broadcast/match-123/overlay');
    expect(preview.searchParams.get('mode')).toBe('auto');
    expect(preview.searchParams.get('theme')).toBe('blue');
    expect(preview.searchParams.get('previewRefresh')).toBe('0');

    component.refreshPreview();
    expect(new URL(component.previewUrl()).searchParams.get('previewRefresh')).toBe('1');
  });

  it('requests fullscreen for the live preview iframe', async () => {
    const fixture = TestBed.createComponent(BroadcastControlComponent);
    fixture.detectChanges();
    const frame = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    const requestFullscreen = jasmine.createSpy('requestFullscreen').and.returnValue(Promise.resolve());
    Object.defineProperty(frame, 'requestFullscreen', { value: requestFullscreen });

    await fixture.componentInstance.fullscreenPreview();

    expect(requestFullscreen).toHaveBeenCalled();
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
  it('resolves stored sponsor logo paths against the configured API origin', () => {
    const component = TestBed.createComponent(BroadcastControlComponent).componentInstance;

    expect(component.sponsorAssetUrl('/api/public/sponsor-assets/logo-1')).toContain(
      '/api/public/sponsor-assets/logo-1',
    );
    expect(component.sponsorAssetUrl('https://cdn.example.com/logo.png')).toBe(
      'https://cdn.example.com/logo.png',
    );
  });

  it('rejects unsupported sponsor logo file types before upload', () => {
    const component = TestBed.createComponent(BroadcastControlComponent).componentInstance;
    const file = new File(['not an image'], 'logo.gif', { type: 'image/gif' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.selectSponsorLogo(event);

    expect(component.sponsorError).toBe('Choose a PNG, JPG or WEBP image.');
    expect(component.sponsorLogoFile).toBeNull();
  });
});
