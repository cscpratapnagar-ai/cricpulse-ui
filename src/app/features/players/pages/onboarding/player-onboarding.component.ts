import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from '../../../../ui/date-time-field.component';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';

interface User { userId: string; fullName: string; }
interface Player {
  id: string; userId: string; name: string; battingStyle: string; bowlingStyle: string;
  dateOfBirth: string | null; city: string | null; playingRole: string | null;
  jerseyNumber: number | null; bio: string | null; profilePhotoUrl: string | null;
}

@Component({
  selector: 'app-player-onboarding', standalone: true,
  imports: [FormsModule, RouterLink, SelectFieldComponent, DateTimeFieldComponent],
  templateUrl: './player-onboarding.component.html',
  styleUrl: './player-onboarding.component.scss']
})
export class PlayerOnboardingComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  user: User | null = null; team: { id: string; name: string } | null = null;
  battingStyle = 'RIGHT_HAND'; bowlingStyle = 'RIGHT_ARM_FAST'; playingRole = 'ALL_ROUNDER';
  jerseyNumber: number | null = null; city = ''; dateOfBirth = ''; bio = '';
  loading = false; error = '';
  readonly playingRoleOptions: SelectOption[] = [
    { value: 'BATTER', label: 'Batter' },
    { value: 'BOWLER', label: 'Bowler' },
    { value: 'ALL_ROUNDER', label: 'All-rounder' },
    { value: 'WICKETKEEPER_BATTER', label: 'Wicketkeeper-batter' }
  ];
  readonly battingStyleOptions: SelectOption[] = [
    { value: 'RIGHT_HAND', label: 'Right-hand batter' },
    { value: 'LEFT_HAND', label: 'Left-hand batter' }
  ];
  readonly bowlingStyleOptions: SelectOption[] = [
    { value: 'RIGHT_ARM_FAST', label: 'Right-arm fast' },
    { value: 'RIGHT_ARM_SPIN', label: 'Right-arm spin' },
    { value: 'LEFT_ARM_FAST', label: 'Left-arm fast' },
    { value: 'LEFT_ARM_SPIN', label: 'Left-arm spin' },
    { value: 'NONE', label: 'Not a bowler' }
  ];
  constructor() {
    const savedUser = localStorage.getItem('cricketpulse_user'); const savedTeam = localStorage.getItem('cricketpulse_team');
    this.user = savedUser ? JSON.parse(savedUser) as User : null; this.team = savedTeam ? JSON.parse(savedTeam) as { id: string; name: string } : null;
    if (!this.user) { void this.router.navigateByUrl('/login'); return; }
    this.loadProfile();
  }
  get initials(): string { return (this.user?.fullName || 'P').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get roleLabel(): string { return this.playingRole.replaceAll('_', ' '); }
  private loadProfile(): void { this.http.get<Player>('http://localhost:8080/api/players/me').subscribe({ next: player => { this.battingStyle = player.battingStyle || 'RIGHT_HAND'; this.bowlingStyle = player.bowlingStyle || 'RIGHT_ARM_FAST'; this.playingRole = player.playingRole || 'ALL_ROUNDER'; this.jerseyNumber = player.jerseyNumber; this.city = player.city || ''; this.dateOfBirth = player.dateOfBirth || ''; this.bio = player.bio || ''; }, error: response => { if (response.status !== 404) this.error = 'Could not load your player profile.'; } }); }
  save(): void {
    if (!this.user || this.loading) return; this.error = '';
    if (this.jerseyNumber !== null && (this.jerseyNumber < 0 || this.jerseyNumber > 99)) { this.error = 'Jersey number must be between 0 and 99.'; return; }
    if (this.bio.length > 500) { this.error = 'Bio must be 500 characters or less.'; return; }
    this.loading = true;
    const payload = { battingStyle: this.battingStyle, bowlingStyle: this.bowlingStyle, dateOfBirth: this.dateOfBirth || null, city: this.city.trim() || null, playingRole: this.playingRole, jerseyNumber: this.jerseyNumber, bio: this.bio.trim() || null, profilePhotoUrl: null };
    this.http.get<Player>('http://localhost:8080/api/players/me').subscribe({ next: () => this.update(payload), error: response => response.status === 404 ? this.create(payload) : this.fail('Could not load your player profile.') });
  }
  private create(payload: object): void { this.http.post<Player>('http://localhost:8080/api/players', payload).subscribe({ next: player => this.finish(player), error: response => this.fail(this.apiError(response)) }); }
  private update(payload: object): void { this.http.put<Player>('http://localhost:8080/api/players/me', payload).subscribe({ next: player => this.finish(player), error: response => this.fail(this.apiError(response)) }); }
  private finish(player: Player): void { localStorage.setItem('cricketpulse_player', JSON.stringify(player)); this.loading = false; void this.router.navigateByUrl('/dashboard'); }
  private fail(message: string): void { this.loading = false; this.error = message; }
  private apiError(response: any): string { if (response?.status === 401) return 'Your session has expired. Please sign in again.'; if (response?.error?.message) return String(response.error.message); return 'Could not save your player profile. Please try again.'; }
}
