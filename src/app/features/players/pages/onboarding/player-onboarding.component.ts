import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from './ui/date-time-field.component';
import { SelectFieldComponent, SelectOption } from './ui/select-field.component';

interface User { userId: string; fullName: string; }
interface Player {
  id: string; userId: string; name: string; battingStyle: string; bowlingStyle: string;
  dateOfBirth: string | null; city: string | null; playingRole: string | null;
  jerseyNumber: number | null; bio: string | null; profilePhotoUrl: string | null;
}

@Component({
  selector: 'app-player-onboarding', standalone: true,
  imports: [FormsModule, RouterLink, SelectFieldComponent, DateTimeFieldComponent],
  template: `<main class="page"><header><a class="logo" routerLink="/dashboard"><span>◉</span> CricketPulse</a><a routerLink="/dashboard" class="back">← Dashboard</a></header><section class="layout"><section><div class="eyebrow">PLAYER PROFILE</div><h1>Build your<br><em>game identity.</em></h1><p class="subtitle">Create the player profile your teams, scorecards and live broadcasts will use.</p><form (ngSubmit)="save()"><div class="section-title">CRICKET IDENTITY</div><div class="grid"><app-select-field label="Playing role" name="playingRole" [options]="playingRoleOptions" [(value)]="playingRole"></app-select-field><label class="field"><span>Jersey number</span><input name="jerseyNumber" type="number" min="0" max="99" [(ngModel)]="jerseyNumber" placeholder="18" /></label><app-select-field label="Batting style" name="battingStyle" [options]="battingStyleOptions" [(value)]="battingStyle"></app-select-field><app-select-field label="Bowling style" name="bowlingStyle" [options]="bowlingStyleOptions" [(value)]="bowlingStyle"></app-select-field></div><div class="section-title">PERSONAL DETAILS</div><div class="grid"><label class="field"><span>City</span><input name="city" [(ngModel)]="city" placeholder="Your city" maxlength="120" /></label><app-date-time-field label="Date of birth" name="dateOfBirth" [includeTime]="false" [(value)]="dateOfBirth"></app-date-time-field></div><label class="field"><span>Player bio</span><textarea name="bio" [(ngModel)]="bio" maxlength="500" rows="4" placeholder="A short introduction about your game..."></textarea></label><small>{{ bio.length }}/500</small><button [disabled]="loading">{{loading ? 'Saving profile...' : 'Save player profile'}} <span>→</span></button></form>@if(error){<div class="error">{{error}}</div>}</section><aside><div class="avatar">{{ initials }}</div><h2>{{user?.fullName || 'Player'}}</h2><p>PLAYER PROFILE</p><div class="stat"><span>ROLE</span><b>{{ roleLabel }}</b></div><div class="stat"><span>JERSEY</span><b>#{{ jerseyNumber ?? '—' }}</b></div><div class="stat"><span>STATUS</span><b class="active">● PROFILE READY</b></div></aside></section></main>`,
  styles: [`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.page{min-height:100vh;padding:28px 6vw;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 80% 0,#164b38,transparent 35%)}header{max-width:1100px;margin:auto;display:flex;justify-content:space-between}.logo{color:#f3fbf6;text-decoration:none;font-size:22px;font-weight:850}.logo span{color:#b8f45c;font-size:28px;margin-right:7px}.back{color:#91aa9d;text-decoration:none;font-size:12px}.layout{max-width:1100px;margin:72px auto;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:52px;align-items:start}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{font-size:clamp(46px,6vw,70px);line-height:.94;letter-spacing:-4px;margin:16px 0}em{font-style:normal;color:#91aa9d}.subtitle{color:#91aa9d;line-height:1.6;max-width:600px;margin-bottom:28px}form{display:grid;gap:18px;padding:24px;border:1px solid #ffffff18;border-radius:20px;background:#0c2119d9;box-shadow:0 25px 70px #0006}.section-title{color:#b8f45c;font-size:9px;font-weight:850;letter-spacing:1.8px;margin-top:2px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.field{display:grid;gap:8px;color:#b9ccc2;font-size:12px;font-weight:750}input,textarea{box-sizing:border-box;width:100%;padding:13px;border:1px solid #ffffff1c;border-radius:10px;background:#142c22;color:#fff;font:inherit;outline:none}textarea{resize:vertical;min-height:90px}input:focus,textarea:focus{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}small{color:#789386;font-size:10px;text-align:right;margin-top:-12px}button{padding:15px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}button span{float:right;font-size:18px}button:disabled{opacity:.6}.error{margin-top:15px;padding:12px;border-radius:9px;background:#ff766d18;color:#ffaaa4;font-size:12px}aside{padding:26px;border:1px solid #b8f45c35;border-radius:20px;background:#10251ed9;text-align:center;position:sticky;top:30px}.avatar{display:grid;place-items:center;width:80px;height:80px;margin:auto;border-radius:50%;background:#b8f45c;color:#10251e;font-size:25px;font-weight:850}aside h2{margin:18px 0 5px}aside>p{color:#91aa9d;font-size:10px;letter-spacing:1.5px}.stat{display:flex;flex-direction:column;gap:6px;padding-top:18px;margin-top:18px;border-top:1px solid #ffffff15;text-align:left}.stat span{color:#789386;font-size:9px;letter-spacing:1.4px}.stat b{font-size:12px}.active{color:#b8f45c}@media(max-width:760px){.layout{grid-template-columns:1fr;margin-top:55px;gap:25px}aside{order:-1;position:static}.grid{grid-template-columns:1fr}.layout h1{letter-spacing:-3px}}@media(max-width:420px){.page{padding:20px 14px}form{padding:18px}.logo{font-size:19px}}`]
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
