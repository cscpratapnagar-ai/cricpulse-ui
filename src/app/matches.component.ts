import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  scheduledAt?: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="matches-page"><div class="page-heading"><div><div class="eyebrow">MATCHDAY CONTROL</div><h1>Matches</h1><p>Create, schedule, and follow every match in your cricket world.</p></div><a class="primary" routerLink="/matches/new">+ Create match</a></div><div class="filters"><button class="filter active">All matches</button><button class="filter">Upcoming</button><button class="filter">Live now</button><button class="filter">Completed</button></div>@if(matches.length){<div class="match-list">@for(match of matches; track match.id){<article class="match-card"><div class="match-top"><span class="status" [class.live]="match.status==='LIVE'" [class.scheduled]="match.status==='SCHEDULED'" [class.completed]="match.status==='COMPLETED'">● {{match.status}}</span><small>{{match.format}} · {{displayDate(match.scheduledAt)}}</small></div><h2>{{match.name}}</h2><div class="teams"><div class="team"><span class="label">Home</span><strong>{{match.teamAName || 'Team A'}}</strong></div><div class="versus">VS</div><div class="team team-right"><span class="label">Away</span><strong>{{match.teamBName || 'Team B'}}</strong></div></div><div class="meta-row"><span class="meta-pill">{{match.format}}</span><span class="meta-pill ghost">{{match.status}}</span></div><div class="match-footer"><small>Match workspace ready</small><a [routerLink]="['/matches', match.id]">Open match →</a></div></article>}</div>}@else{<section class="empty"><span>◉</span><h2>No matches yet</h2><p>Create your first match to start building your matchday history.</p><a class="primary" routerLink="/matches/new">Create first match</a></section>}</section>`,
  styles: [`:host{display:block}.matches-page{max-width:1160px;padding:60px 4vw 100px}.page-heading{display:flex;justify-content:space-between;align-items:end;gap:25px}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}.page-heading h1{margin:15px 0 8px;font-size:clamp(44px,6vw,72px);letter-spacing:-4px;line-height:.92}.page-heading p{color:#91aa9d;max-width:620px}.primary{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;padding:14px 18px;background:#b8f45c;color:#10251e;font-weight:850;text-decoration:none;box-shadow:0 10px 28px #b8f45c22}.filters{display:flex;gap:8px;margin:38px 0 18px;overflow:auto;padding-bottom:4px}.filter{padding:9px 13px;border:1px solid #ffffff15;border-radius:999px;background:#ffffff08;color:#91aa9d;font-size:11px;white-space:nowrap}.filter.active{border-color:#b8f45c66;color:#b8f45c;background:#b8f45c12}.match-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.match-card,.empty{padding:24px;border:1px solid #ffffff18;border-radius:22px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005}.match-card{position:relative;overflow:hidden}.match-card:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at top right,#b8f45c14,transparent 34%),radial-gradient(circle at bottom left,#5fd3ff0a,transparent 30%);pointer-events:none}.match-card > *{position:relative;z-index:1}.match-top,.match-footer{display:flex;justify-content:space-between;align-items:center;gap:16px}.match-top small,.match-footer small{color:#789386;font-size:10px}.status{display:inline-flex;align-items:center;gap:8px;color:#a9b8b1;font-size:10px;font-weight:850;letter-spacing:1px;padding:8px 11px;border:1px solid #ffffff12;border-radius:999px;background:#ffffff06}.status:before{content:'';width:8px;height:8px;border-radius:999px;background:#789386;box-shadow:0 0 0 4px #78938622}.status.live{color:#b8f45c;border-color:#b8f45c33;background:#b8f45c0f}.status.live:before{background:#b8f45c;box-shadow:0 0 0 4px #b8f45c22}.status.scheduled{border-color:#8fd3ff2a}.status.completed{border-color:#ffffff18}.match-card h2{margin:22px 0 18px;font-size:22px;letter-spacing:-1px}.teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;padding:18px 0;border-top:1px solid #ffffff12;border-bottom:1px solid #ffffff12}.team{display:grid;gap:6px}.team-right{text-align:right}.label{color:#789386;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}.team strong{font-size:18px;line-height:1.15}.versus{color:#b8f45c;font-size:11px;font-weight:900;letter-spacing:2px;padding:10px 12px;border-radius:999px;background:#b8f45c12;border:1px solid #b8f45c24;align-self:center}.meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.meta-pill{padding:7px 10px;border-radius:999px;background:#b8f45c14;color:#c9ff71;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}.meta-pill.ghost{background:#ffffff07;color:#91aa9d}.match-footer{margin-top:18px}.match-footer a{color:#b8f45c;text-decoration:none;font-size:11px;font-weight:800}.empty{text-align:center;padding:70px 20px}.empty>span{color:#b8f45c;font-size:35px}.empty h2{margin:15px 0 8px}.empty p{margin-bottom:25px}@media(max-width:700px){.matches-page{padding:40px 20px 90px}.page-heading{align-items:start;flex-direction:column}.match-list{grid-template-columns:1fr}.teams{grid-template-columns:1fr;justify-items:start}.team-right{text-align:left}.versus{justify-self:start}.filters{scrollbar-width:none}.filters::-webkit-scrollbar{display:none}}`]
})
export class MatchesComponent {
  private readonly http = inject(HttpClient);
  matches: Match[] = [];

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<Match[]>('http://localhost:8080/api/matches').subscribe({
      next: matches => this.matches = matches,
      error: () => this.matches = []
    });
  }

  displayDate(value?: string): string {
    if (!value) {
      return 'Schedule pending';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }
}
