import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface User { userId: string; fullName: string; }
interface Player { id: string; userId: string; name: string; battingStyle: string; bowlingStyle: string; role: string; }

@Component({
  selector: 'app-player-onboarding', standalone: true, imports: [FormsModule, RouterLink],
  template: `<main class="page"><header><a class="logo" routerLink="/dashboard"><span>◉</span> CricketPulse</a><a routerLink="/dashboard" class="back">← Dashboard</a></header><section class="layout"><section><div class="eyebrow">PLAYER PROFILE</div><h1>Set your<br><em>game profile.</em></h1><p class="subtitle">Tell your team how you play. You can update these details anytime.</p><form (ngSubmit)="save()"><label>Batting style<select name="battingStyle" [(ngModel)]="battingStyle"><option value="RIGHT_HAND">Right-hand batter</option><option value="LEFT_HAND">Left-hand batter</option></select></label><label>Bowling style<select name="bowlingStyle" [(ngModel)]="bowlingStyle"><option value="RIGHT_ARM_FAST">Right-arm fast</option><option value="RIGHT_ARM_SPIN">Right-arm spin</option><option value="LEFT_ARM_FAST">Left-arm fast</option><option value="LEFT_ARM_SPIN">Left-arm spin</option><option value="NONE">Not a bowler</option></select></label><button [disabled]="loading">{{loading ? 'Saving profile...' : 'Join team roster'}} <span>→</span></button></form>@if(error){<div class="error">{{error}}</div>}</section><aside><div class="avatar">{{ initials }}</div><h2>{{user?.fullName || 'Player'}}</h2><p>PLAYER PROFILE</p><div class="stat"><span>TEAM</span><b>{{team?.name || 'Your team'}}</b></div><div class="stat"><span>STATUS</span><b class="active">● READY TO PLAY</b></div></aside></section></main>`,
  styles: [`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.page{min-height:100vh;padding:28px 6vw;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 80% 0,#164b38,transparent 35%)}header{max-width:1050px;margin:auto;display:flex;justify-content:space-between}.logo{color:#f3fbf6;text-decoration:none;font-size:22px;font-weight:850}.logo span{color:#b8f45c;font-size:28px;margin-right:7px}.back{color:#91aa9d;text-decoration:none;font-size:12px}.layout{max-width:900px;margin:105px auto;display:grid;grid-template-columns:1fr 280px;gap:70px;align-items:start}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{font-size:clamp(50px,7vw,78px);line-height:.93;letter-spacing:-5px;margin:18px 0}em{font-style:normal;color:#91aa9d}.subtitle{color:#91aa9d;line-height:1.6;max-width:450px;margin-bottom:32px}form{display:grid;gap:18px;padding:24px;border:1px solid #ffffff18;border-radius:20px;background:#0c2119d9}label{display:grid;gap:8px;color:#b9ccc2;font-size:12px;font-weight:750}select{box-sizing:border-box;width:100%;padding:14px;border:1px solid #ffffff1c;border-radius:10px;background:#142c22;color:#fff;font:inherit}button{padding:15px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}button span{float:right;font-size:18px}button:disabled{opacity:.6}aside{padding:26px;border:1px solid #b8f45c35;border-radius:20px;background:#10251ed9;text-align:center}.avatar{display:grid;place-items:center;width:80px;height:80px;margin:auto;border-radius:50%;background:#b8f45c;color:#10251e;font-size:25px;font-weight:850}aside h2{margin:18px 0 5px}aside>p{color:#91aa9d;font-size:10px;letter-spacing:1.5px}.stat{display:flex;flex-direction:column;gap:6px;padding-top:18px;margin-top:18px;border-top:1px solid #ffffff15;text-align:left}.stat span{color:#789386;font-size:9px;letter-spacing:1.4px}.stat b{font-size:12px}.active{color:#b8f45c}.error{margin-top:15px;color:#ffaaa4;font-size:12px}@media(max-width:700px){.layout{grid-template-columns:1fr;margin-top:75px;gap:25px}aside{order:-1}.layout h1{letter-spacing:-3px}}`]
})
export class PlayerOnboardingComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  user: User | null = null; team: { id: string; name: string } | null = null;
  battingStyle = 'RIGHT_HAND'; bowlingStyle = 'RIGHT_ARM_FAST'; loading = false; error = '';
  constructor() {
    const savedUser = localStorage.getItem('cricketpulse_user'); const savedTeam = localStorage.getItem('cricketpulse_team');
    this.user = savedUser ? JSON.parse(savedUser) as User : null; this.team = savedTeam ? JSON.parse(savedTeam) as { id: string; name: string } : null;
    if (!this.user || !this.team) void this.router.navigateByUrl('/dashboard');
  }
  get initials(): string { return (this.user?.fullName || 'P').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  save(): void {
    if (!this.user || !this.team) return;
    this.loading = true; this.error = '';
    this.http.post<Player>('http://localhost:8080/api/players', { userId: this.user.userId, battingStyle: this.battingStyle, bowlingStyle: this.bowlingStyle }).subscribe({
      next: player => this.http.post(`http://localhost:8080/api/players/teams/${this.team!.id}`, { playerId: player.id, role: 'PLAYER' }).subscribe({ next: () => { localStorage.setItem('cricketpulse_player', JSON.stringify(player)); void this.router.navigateByUrl('/dashboard'); }, error: () => { this.loading = false; this.error = 'Your profile was created, but could not be added to the team.'; } }),
      error: () => { this.loading = false; this.error = 'Could not create your player profile. It may already exist.'; }
    });
  }
}
