import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type Mode = 'strip' | 'batter' | 'bowler' | 'partnership';

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

  readonly scenes: { mode: Mode; title: string; description: string }[] = [
    { mode: 'strip', title: 'Live Score Strip', description: 'Persistent score bar for the main broadcast scene.' },
    { mode: 'batter', title: 'Batter Card', description: 'Lower-third for the current striker.' },
    { mode: 'bowler', title: 'Bowler Card', description: 'Current bowler figures and over progress.' },
    { mode: 'partnership', title: 'Partnership Card', description: 'Current batting partnership spotlight.' },
  ];

  url(mode: Mode) {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=${mode}`;
  }

  async copy(mode: Mode) {
    await navigator.clipboard.writeText(this.url(mode));
    this.copied = mode;
    setTimeout(() => (this.copied = ''), 1800);
  }

  open(mode: Mode) {
    window.open(this.url(mode), '_blank', 'noopener,noreferrer');
  }
}
