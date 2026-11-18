import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { API_BASE_URL, API_ORIGIN } from '../../../../core/config/api.config';

type Mode = 'strip' | 'batter' | 'bowler' | 'partnership';
type EventKind =
  | 'FOUR'
  | 'SIX'
  | 'WICKET'
  | 'MILESTONE'
  | 'OVER_COMPLETE'
  | 'RESULT'
  | 'PLAYER_OF_THE_MATCH';
type SponsorType =
  | 'MAIN_SPONSOR'
  | 'OVER_SPONSOR'
  | 'PLAYER_OF_THE_MATCH'
  | 'BOUNDARY_SPONSOR'
  | 'CUSTOM';
type SponsorEvent =
  | 'MATCH_START'
  | 'OVER_COMPLETE'
  | 'FOUR'
  | 'SIX'
  | 'WICKET'
  | 'PLAYER_OF_THE_MATCH'
  | 'MATCH_RESULT'
  | 'MANUAL';
interface SponsorPlacement {
  id?: string;
  eventType: SponsorEvent;
  enabled: boolean;
  priority: number;
}
interface SponsorRecord {
  id: string;
  matchId: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  sponsorType: SponsorType;
  displayDurationSeconds: number;
  active: boolean;
  placements: SponsorPlacement[];
}
interface SponsorReport {
  sponsorId: string;
  sponsorName: string;
  sponsorType: string;
  active: boolean;
  impressions: number;
  lastDisplayedAt: string | null;
}

@Component({
  selector: 'app-broadcast-control',
  standalone: true,
  templateUrl: './broadcast-control.component.html',
  styleUrl: './broadcast-control.component.scss',
})
export class BroadcastControlComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';
  copied = '';
  selectedTheme: 'lime' | 'blue' | 'purple' | 'orange' = 'lime';
  sponsorType: SponsorType = 'MAIN_SPONSOR';
  sponsorName = '';
  sponsorTagline = '';
  sponsorLogo = '';
  sponsorLogoFile: File | null = null;
  sponsorLogoPreview = '';
  sponsorLabel = 'POWERED BY';
  sponsorDuration = 10;
  overSponsorEnabled = false;
  sponsors: SponsorRecord[] = [];
  sponsorReport: SponsorReport[] = [];
  selectedSponsorId: string | null = null;
  sponsorSaving = false;
  sponsorError = '';
  sponsorNotice = '';
  sponsorActive = true;
  sponsorEvents: { value: SponsorEvent; label: string }[] = [
    { value: 'MATCH_START', label: 'Match start' },
    { value: 'OVER_COMPLETE', label: 'Over complete' },
    { value: 'FOUR', label: 'FOUR' },
    { value: 'SIX', label: 'SIX' },
    { value: 'WICKET', label: 'Wicket' },
    { value: 'PLAYER_OF_THE_MATCH', label: 'Player of the Match' },
    { value: 'MATCH_RESULT', label: 'Match result' },
    { value: 'MANUAL', label: 'Manual' },
  ];
  selectedSponsorEvents: SponsorEvent[] = ['MATCH_START'];

  readonly sponsorTypes: { value: SponsorType; label: string }[] = [
    { value: 'MAIN_SPONSOR', label: 'Main Sponsor' },
    { value: 'OVER_SPONSOR', label: 'Over Sponsor' },
    { value: 'PLAYER_OF_THE_MATCH', label: 'Player of the Match Sponsor' },
    { value: 'BOUNDARY_SPONSOR', label: 'Boundary Sponsor' },
    { value: 'CUSTOM', label: 'Custom Sponsor Banner' },
  ];

  constructor() {
    if (this.matchId) {
      this.loadSponsors();
      this.loadSponsorReport();
    }
  }

  loadSponsors() {
    this.http.get<SponsorRecord[]>(`${API_BASE_URL}/matches/${this.matchId}/sponsors`).subscribe({
      next: (items) => (this.sponsors = items),
      error: () =>
        (this.sponsorError = 'Could not load sponsors. Check your match access and try again.'),
    });
  }

  loadSponsorReport() {
    this.http
      .get<SponsorReport[]>(`${API_BASE_URL}/matches/${this.matchId}/sponsor-report`)
      .subscribe({
        next: (items) => (this.sponsorReport = items),
        error: () => (this.sponsorReport = []),
      });
  }

  sponsorAssetUrl(url: string | null) {
    return url?.startsWith('/api/') ? API_ORIGIN + url : url || '';
  }

  placementLabels(sponsor: SponsorRecord) {
    return (
      sponsor.placements
        .filter((item) => item.enabled)
        .map((item) => item.eventType.replaceAll('_', ' '))
        .join(' · ') || 'No event placements'
    );
  }

  editSponsor(sponsor: SponsorRecord) {
    this.selectedSponsorId = sponsor.id;
    this.sponsorType = sponsor.sponsorType;
    this.sponsorName = sponsor.name;
    this.sponsorTagline = sponsor.tagline || '';
    this.sponsorLogo = sponsor.logoUrl || '';
    this.clearSponsorLogoFile();
    this.sponsorLabel = sponsor.sponsorType === 'OVER_SPONSOR' ? 'OVER SPONSOR' : 'POWERED BY';
    this.sponsorDuration = sponsor.displayDurationSeconds;
    this.sponsorActive = sponsor.active;
    this.selectedSponsorEvents = sponsor.placements
      .filter((item) => item.enabled)
      .map((item) => item.eventType);
    this.sponsorNotice = '';
    this.sponsorError = '';
  }

  resetSponsorForm() {
    this.selectedSponsorId = null;
    this.sponsorType = 'MAIN_SPONSOR';
    this.sponsorName = '';
    this.sponsorTagline = '';
    this.sponsorLogo = '';
    this.clearSponsorLogoFile();
    this.sponsorLabel = 'POWERED BY';
    this.sponsorDuration = 10;
    this.sponsorActive = true;
    this.selectedSponsorEvents = ['MATCH_START'];
  }

  selectSponsorLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.sponsorError = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.sponsorError = 'Choose a PNG, JPG or WEBP image.';
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.sponsorError = 'Logo must be 2 MB or smaller.';
      input.value = '';
      return;
    }
    this.clearSponsorLogoFile();
    this.sponsorLogoFile = file;
    this.sponsorLogoPreview = URL.createObjectURL(file);
  }

  clearSponsorLogoFile() {
    if (this.sponsorLogoPreview) URL.revokeObjectURL(this.sponsorLogoPreview);
    this.sponsorLogoFile = null;
    this.sponsorLogoPreview = '';
  }

  changeSponsorType(value: SponsorType) {
    this.sponsorType = value;
    const defaults: Record<SponsorType, SponsorEvent[]> = {
      MAIN_SPONSOR: ['MATCH_START'],
      OVER_SPONSOR: ['OVER_COMPLETE'],
      PLAYER_OF_THE_MATCH: ['PLAYER_OF_THE_MATCH'],
      BOUNDARY_SPONSOR: ['FOUR', 'SIX'],
      CUSTOM: ['MANUAL'],
    };
    this.selectedSponsorEvents = defaults[value];
  }

  toggleSponsorEvent(event: SponsorEvent, checked: boolean) {
    this.selectedSponsorEvents = checked
      ? [...new Set([...this.selectedSponsorEvents, event])]
      : this.selectedSponsorEvents.filter((item) => item !== event);
  }

  saveSponsor() {
    if (!this.sponsorName.trim()) {
      this.sponsorError = 'Enter a sponsor or brand name.';
      return;
    }
    this.sponsorSaving = true;
    this.sponsorError = '';
    this.sponsorNotice = '';
    const payload = {
      name: this.sponsorName.trim(),
      tagline: this.sponsorTagline.trim() || null,
      logoUrl: this.sponsorLogo.trim() || null,
      sponsorType: this.sponsorType,
      displayDurationSeconds: Math.min(30, Math.max(5, Number(this.sponsorDuration) || 10)),
      active: this.sponsorActive,
    };
    const request = this.selectedSponsorId
      ? this.http.patch<SponsorRecord>(
          `${API_BASE_URL}/matches/${this.matchId}/sponsors/${this.selectedSponsorId}`,
          payload,
        )
      : this.http.post<SponsorRecord>(`${API_BASE_URL}/matches/${this.matchId}/sponsors`, payload);
    request.subscribe({
      next: (saved) => {
        const savePlacements = () => {
          this.http
            .put<SponsorPlacement[]>(
              `${API_BASE_URL}/matches/${this.matchId}/sponsors/${saved.id}/placements`,
              this.selectedSponsorEvents.map((eventType, priority) => ({
                eventType,
                enabled: true,
                priority,
              })),
            )
            .subscribe({
              next: () => {
                this.sponsorSaving = false;
                this.sponsorNotice = 'Sponsor saved and event placements updated.';
                this.resetSponsorForm();
                this.loadSponsors();
                this.loadSponsorReport();
              },
              error: () => {
                this.sponsorSaving = false;
                this.sponsorError =
                  'Sponsor saved, but placements could not be updated. Please retry.';
                this.loadSponsors();
              },
            });
        };
        if (!this.sponsorLogoFile) {
          savePlacements();
          return;
        }
        const form = new FormData();
        form.append('logo', this.sponsorLogoFile, this.sponsorLogoFile.name);
        this.http
          .post<{
            logoUrl: string;
          }>(`${API_BASE_URL}/matches/${this.matchId}/sponsors/${saved.id}/logo`, form)
          .subscribe({
            next: (uploaded) => {
              this.sponsorLogo = uploaded.logoUrl;
              savePlacements();
            },
            error: (error) => {
              this.sponsorSaving = false;
              this.sponsorError =
                error?.error?.detail ||
                error?.error?.message ||
                'Logo upload failed. Sponsor details were saved; retry the logo upload.';
              this.loadSponsors();
            },
          });
      },
      error: (error) => {
        this.sponsorSaving = false;
        this.sponsorError =
          error?.error?.detail || error?.error?.message || 'Sponsor could not be saved.';
      },
    });
  }

  deleteSponsor(sponsor: SponsorRecord) {
    if (!globalThis.confirm(`Delete sponsor "${sponsor.name}" from this match?`)) return;
    this.http.delete(`${API_BASE_URL}/matches/${this.matchId}/sponsors/${sponsor.id}`).subscribe({
      next: () => {
        this.sponsorNotice = 'Sponsor deleted.';
        this.loadSponsors();
        this.loadSponsorReport();
        if (this.selectedSponsorId === sponsor.id) this.resetSponsorForm();
      },
      error: () => (this.sponsorError = 'Sponsor could not be deleted.'),
    });
  }

  readonly events: { kind: EventKind; title: string; icon: string }[] = [
    { kind: 'FOUR', title: 'Boundary FOUR', icon: '4' },
    { kind: 'SIX', title: 'Maximum SIX', icon: '6' },
    { kind: 'WICKET', title: 'Wicket', icon: 'W' },
    { kind: 'MILESTONE', title: 'Milestone', icon: '★' },
    { kind: 'OVER_COMPLETE', title: 'Over Complete', icon: 'OV' },
    { kind: 'RESULT', title: 'Match Result', icon: '✓' },
    { kind: 'PLAYER_OF_THE_MATCH', title: 'Player of the Match', icon: '★' },
  ];

  readonly scenes: { mode: Mode; title: string; description: string }[] = [
    {
      mode: 'strip',
      title: 'Live Score Strip',
      description: 'Persistent score bar for the main broadcast scene.',
    },
    { mode: 'batter', title: 'Batter Card', description: 'Lower-third for the current striker.' },
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
    const params = new URLSearchParams({ mode: 'auto', theme: this.selectedTheme });
    if (this.overSponsorEnabled) {
      params.set('overSponsor', 'true');
      params.set('sponsorType', 'OVER_SPONSOR');
      params.set('sponsorName', this.sponsorName.trim() || 'YOUR BRAND');
      params.set('sponsorTagline', this.sponsorTagline.trim());
      params.set('sponsorLogo', this.sponsorLogo.trim());
      params.set('sponsorLabel', this.sponsorLabel.trim() || 'OVER SPONSOR');
      params.set('duration', String(Math.min(30, Math.max(5, Number(this.sponsorDuration) || 10))));
    }
    return `${window.location.origin}/broadcast/${this.matchId}/overlay?${params.toString()}`;
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
