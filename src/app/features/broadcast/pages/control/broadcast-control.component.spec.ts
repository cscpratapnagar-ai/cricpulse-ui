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
});
