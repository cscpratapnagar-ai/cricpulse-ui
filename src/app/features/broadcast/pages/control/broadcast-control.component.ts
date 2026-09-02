import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type Mode = 'strip' | 'batter' | 'bowler' | 'partnership';
type EventKind = 'FOUR' | 'SIX' | 'WICKET' | 'MILESTONE' | 'OVER_COMPLETE' | 'RESULT';

@Component({
  selector: 'app-broadcast-control',
  standalone: true,
  templateUrl: './broadcast-control.component.html',
  styleUrl: './broadcast-control.component.scss',
})
export class BroadcastControlComponent {
  private readonly route = inject(ActivatedRoute);
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';
  copied = '';
  readonly events: { kind: EventKind; title: string; icon: string }[] = [
    { kind: 'FOUR', title: 'Boundary FOUR', icon: '4' },
    { kind: 'SIX', title: 'Maximum SIX', icon: '6' },
    { kind: 'WICKET', title: 'Wicket', icon: 'W' },
    { kind: 'MILESTONE', title: 'Milestone', icon: '★' },
    { kind: 'OVER_COMPLETE', title: 'Over Complete', icon: 'OV' },
    { kind: 'RESULT', title: 'Match Result', icon: '✓' },
  ];

  readonly scenes: { mode: Mode; title: string; description: string }[] = [
    {
      mode: 'strip',
      title: 'Live Score Strip',
      description: 'Persistent score bar for the main broadcast scene.',
    },
    {
      mode: 'batter',
      title: 'Batter Card',
      description: 'Lower-third for the current striker.',
    },
    {
      mode: 'bowler',
      title: 'Bowler Card',
      description: 'Current bowler figures and over progress.',
    },
    {
      mode: 'partnership',
      title: 'Partnership Card',
      description: 'Current batting partnership spotlight.',
    },
  ];

  url(mode: Mode) {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=${mode}`;
  }

  autoUrl() {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=auto`;
  }

  eventUrl(kind: EventKind) {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=event&event=${kind}`;
  }

  async copy(mode: Mode | 'auto') {
    const value = mode === 'auto' ? this.autoUrl() : this.url(mode);
    await navigator.clipboard.writeText(value);
    this.copied = mode;
    setTimeout(() => (this.copied = ''), 1800);
  }

  openEvent(kind: EventKind) {
    window.open(this.eventUrl(kind), '_blank', 'noopener,noreferrer');
  }

  open(mode: Mode | 'auto') {
    window.open(
      mode === 'auto' ? this.autoUrl() : this.url(mode),
      '_blank',
      'noopener,noreferrer',
    );
  }
}
