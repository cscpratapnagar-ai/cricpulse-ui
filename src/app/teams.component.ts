import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Team { id: string; name: string; city?: string; ownerId: string; }
interface Player { id: string; userId: string; name: string; battingStyle?: string; bowlingStyle?: string; role: string; }

@Component({
  selector: 'app-teams', standalone: true, imports: [RouterLink],
  template: `<section class="teams-page">
    <div class="page-head"><div><div class="eyebrow">TEAM MANAGEMENT</div><h1>My Teams</h1><p>Manage every team you own from one place.</p></div><button class="primary" routerLink="/teams/new">+ Create Team</button></div>
    @if(teams.length){
      <div class="team-grid">@for(t of teams; track t.id){
        <article class="team-card" [class.active]="t.id === activeTeamId" (click)="selectTeam(t)">
          <div class="team-top"><div class="team-logo">{{t.name.charAt(0).toUpperCase()}}</div><span class="badge">{{t.id === activeTeamId ? 'ACTIVE' : 'OWNER'}}</span></div>
          <h2>{{t.name}}</h2><p>◉ {{t.city || 'Location not set'}}</p>
          <div class="team-actions"><button class="open" (click)="$event.stopPropagation(); selectTeam(t)">Open Team →</button><span>Created by you</span></div>
        </article>
      }</div>
      @if(activeTeam){<section class="active-preview"><div><div class="eyebrow">ACTIVE WORKSPACE</div><h2>{{activeTeam.name}}</h2><p>◉ {{activeTeam.city || 'Location not set'}} · Created by you</p></div><button class="primary" (click)="openTeam()">Manage Team →</button></section>}
    } @else {
      <section class="empty"><div class="empty-icon">◈</div><h2>No teams yet</h2><p>Create your first team to start building your squad.</p><button class="primary" routerLink="/teams/new">Create Team →</button></section>
    }
  </section>`,
  styles: [`:host{display:block}.teams-page{max-width:1150px;padding:50px 4vw 100px}.page-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:28px}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{margin:8px 0;font-size:clamp(34px,5vw,52px);letter-spacing:-3px}h2{margin:14px 0 6px;font-size:25px}p{color:#91aa9d;margin:0}.primary,.open{padding:12px 16px;border:0;border-radius:9px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}.team-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.team-card{padding:22px;border:1px solid #ffffff15;border-radius:20px;background:#0c2119d9;cursor:pointer;transition:.2s}.team-card:hover,.team-card.active{border-color:#b8f45c55;transform:translateY(-2px)}.team-top{display:flex;justify-content:space-between;align-items:center}.team-logo{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#b8f45c;color:#10251e;font-size:25px;font-weight:900}.badge{font-size:9px;letter-spacing:1.4px;color:#b8f45c;border:1px solid #b8f45c44;padding:6px 8px;border-radius:7px}.team-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px}.team-actions span{font-size:10px;color:#789386}.open{padding:9px 12px}.active-preview{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:22px;padding:24px 26px;border:1px solid #b8f45c35;border-radius:20px;background:linear-gradient(110deg,#173d2dbb,#0c2119d9)}.active-preview h2{font-size:30px}.empty{padding:80px 20px;border:1px solid #ffffff15;border-radius:20px;background:#0c2119d9;text-align:center}.empty-icon{font-size:40px;color:#b8f45c;margin-bottom:12px}.empty p{margin:8px 0 22px}@media(max-width:850px){.team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.teams-page{padding:35px 20px 80px}.page-head,.active-preview{align-items:flex-start;flex-direction:column}.team-grid{grid-template-columns:1fr}.primary{width:100%}}
  `]
})
export class TeamsComponent {
  private readonly http = inject(HttpClient);
  teams: Team[] = []; activeTeam: Team | null = null; activeTeamId: string | null = null;
  constructor() { this.loadTeams(); }
  loadTeams(): void {
    this.http.get<Team[]>('http://localhost:8080/api/teams/mine').subscribe({
      next: teams => { this.teams = teams; const savedId = localStorage.getItem('cricketpulse_active_team_id'); this.activeTeam = teams.find(t => t.id === savedId) || teams[0] || null; this.activeTeamId = this.activeTeam?.id || null; if (this.activeTeam) localStorage.setItem('cricketpulse_team', JSON.stringify(this.activeTeam)); },
      error: () => { this.teams = []; this.activeTeam = null; this.activeTeamId = null; }
    });
  }
  selectTeam(team: Team): void { this.activeTeam = team; this.activeTeamId = team.id; localStorage.setItem('cricketpulse_active_team_id', team.id); localStorage.setItem('cricketpulse_team', JSON.stringify(team)); }
  openTeam(): void { if (this.activeTeam) window.location.href = `/teams/${this.activeTeam.id}`; }
}
