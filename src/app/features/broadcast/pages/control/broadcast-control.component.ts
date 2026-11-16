import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type Mode = 'strip' | 'batter' | 'bowler' | 'partnership';
type EventKind = 'FOUR' | 'SIX' | 'WICKET' | 'MILESTONE' | 'OVER_COMPLETE' | 'RESULT';
type SponsorType = 'MAIN_SPONSOR' | 'OVER_SPONSOR' | 'PLAYER_OF_THE_MATCH' | 'CUSTOM';

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
  sponsorType: SponsorType = 'MAIN_SPONSOR';
  sponsorName = '';
  sponsorTagline = '';
  sponsorLogo = '';
  sponsorLabel = 'POWERED BY';
  sponsorDuration = 10;

  readonly sponsorTypes: { value: SponsorType; label: string }[] = [
    { value: 'MAIN_SPONSOR', label: 'Main Sponsor' },
    { value: 'OVER_SPONSOR', label: 'Over Sponsor' },
    { value: 'PLAYER_OF_THE_MATCH', label: 'Player of the Match Sponsor' },
    { value: 'CUSTOM', label: 'Custom Sponsor Banner' },
  ];

  readonly events: { kind: EventKind; title: string; icon: string }[] = [
    { kind: 'FOUR', title: 'Boundary FOUR', icon: '4' },
    { kind: 'SIX', title: 'Maximum SIX', icon: '6' },
    { kind: 'WICKET', title: 'Wicket', icon: 'W' },
    { kind: 'MILESTONE', title: 'Milestone', icon: '★' },
    { kind: 'OVER_COMPLETE', title: 'Over Complete', icon: 'OV' },
    { kind: 'RESULT', title: 'Match Result', icon: '✓' },
  ];

  readonly scenes: { mode: Mode; title: string; description: string }[] = [
    { mode: 'strip', title: 'Live Score Strip', description: 'Persistent score bar for the main broadcast scene.' },
    { mode: 'batter', title: 'Batter Card', description: 'Lower-third for the current striker.' },
    { mode: 'bowler', title: 'Bowler Card', description: 'Current bowler figures and over progress.' },
    { mode: 'partnership', title: 'Partnership Card', description: 'Current batting partnership spotlight.' },
  ];

  url(mode: Mode) {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=${mode}`;
  }

  autoUrl() {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=auto`;
  }

  sponsorUrl() {
    const params = new URLSearchParams({
      mode: 'sponsor',
      sponsorType: this.sponsorType,
      sponsorName: this.sponsorName.trim() || 'YOUR BRAND',
      sponsorTagline: this.sponsorTagline.trim(),
      sponsorLogo: this.sponsorLogo.trim(),
      sponsorLabel: this.sponsorLabel.trim() || 'POWERED BY',
      duration: String(Math.min(30, Math.max(5, Number(this.sponsorDuration) || 10))),
    });
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?${params.toString()}`;
  }

  eventUrl(kind: EventKind) {
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?mode=event&event=${kind}`;
  }

  async copy(mode: Mode | 'auto') {
    const value = mode === 'auto' ? this.autoUrl() : this.url(mode);
    await this.copyValue(value, mode);
  }

  async copySetup(value: string, key: string) {
    await this.copyValue(value, key);
  }

  private async copyValue(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    this.copied = key;
    setTimeout(() => (this.copied = ''), 1800);
  }

  openEvent(kind: EventKind) {
    window.open(this.eventUrl(kind), '_blank', 'noopener,noreferrer');
  }

  open(mode: Mode | 'auto') {
    window.open(mode === 'auto' ? this.autoUrl() : this.url(mode), '_blank', 'noopener,noreferrer');
  }

  openSponsor() {
    window.open(this.sponsorUrl(), '_blank', 'noopener,noreferrer');
  }

  async copySponsor() {
    await this.copyValue(this.sponsorUrl(), 'sponsor');
  }
}
