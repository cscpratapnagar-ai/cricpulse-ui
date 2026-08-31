import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { StateViewComponent } from './state-view.component';
import { Router, RouterLink } from '@angular/router';

interface Team { id: string; name: string; city?: string; ownerId: string; }

@Component({selector:'app-teams',standalone:true,imports:[RouterLink,StateViewComponent],template:`<section class="teams-page"><div class="page-head"><div><div class="eyebrow">Team management</div><h1>My Teams</h1><p>Manage every team you own from one place.</p></div><button class="primary" routerLink="/dashboard/teams/new">+ Create Team</button></div>@if(loading){<app-state-view state="loading" loadingLabel="Loading your teams..."></app-state-view>}@else if(error){<app-state-view state="error" title="Unable to load teams" message="We couldn't retrieve your teams. Check the connection and try again." (retry)="loadTeams()"></app-state-view>}@else if(teams.length){<div class="team-grid">@for(t of teams;track t.id;let i=$index){<article class="team-card" [style.--i]="i" [class.active]="t.id===activeTeamId"><div class="team-top"><div class="team-logo">{{t.name.charAt(0).toUpperCase()}}</div><span class="badge">{{t.id===activeTeamId?'ACTIVE':'OWNER'}}</span></div><h2>{{t.name}}</h2><p>◉ {{t.city||'Location not set'}}</p><div class="team-actions"><button type="button" class="open" (click)="openTeam(t)">Open Team →</button><span>Created by you</span></div></article>}</div>@if(activeTeam){<section class="active-preview"><div><div class="eyebrow">ACTIVE WORKSPACE</div><h2>{{activeTeam.name}}</h2><p>◉ {{activeTeam.city||'Location not set'}} · Created by you</p></div><button type="button" class="primary" (click)="openTeam(activeTeam)">Manage Team →</button></section>}}@else{<app-state-view state="empty" title="No teams yet" message="Create your first team to start building your squad." actionLabel="Create Team" (action)="createTeam()"></app-state-view>}</section>`,styles:[`
:host{display:block}
.teams-page{max-width:1180px;margin:0 auto;padding:42px clamp(18px,4vw,52px) 90px;animation:pageIn .48s cubic-bezier(.22,1,.36,1) both}
.page-head{position:relative;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:30px;padding-bottom:22px;border-bottom:1px solid var(--cp-border)}
.page-head:after{content:'';position:absolute;left:0;bottom:-1px;width:72px;height:2px;background:var(--cp-accent);box-shadow:0 0 18px var(--cp-accent-soft)}
.eyebrow{color:var(--cp-accent);font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
h1{margin:9px 0 8px;color:var(--cp-text);font-size:clamp(34px,5vw,54px);line-height:1.02;letter-spacing:-.055em;font-weight:800}
.page-head p{margin:0;color:var(--cp-text-muted);font-size:12px;line-height:1.6}
.primary,.open{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid transparent;border-radius:11px;background:var(--cp-accent);color:var(--cp-accent-contrast);font:800 10px/1 inherit;letter-spacing:.01em;text-decoration:none;cursor:pointer;transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,border-color .2s}
.primary{min-height:42px;padding:0 17px;box-shadow:0 10px 24px var(--cp-accent-soft)}
.primary:hover,.open:hover{transform:translateY(-2px);box-shadow:0 16px 30px var(--cp-accent-soft)}
.primary:active,.open:active{transform:translateY(0) scale(.98)}
.team-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
.team-card{--i:0;position:relative;isolation:isolate;overflow:hidden;padding:20px;border:1px solid var(--cp-border);border-radius:20px;background:linear-gradient(145deg,var(--cp-surface),var(--cp-surface-raised));box-shadow:var(--cp-shadow-sm);animation:cardIn .48s calc(var(--i) * 55ms) cubic-bezier(.22,1,.36,1) both;transition:transform .28s cubic-bezier(.22,1,.36,1),border-color .28s,box-shadow .28s}
.team-card:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 0%,var(--cp-accent-soft),transparent 38%);opacity:0;transition:opacity .28s;pointer-events:none;z-index:-1}
.team-card:after{content:'';position:absolute;inset:0 auto auto 0;width:100%;height:2px;background:linear-gradient(90deg,var(--cp-accent),transparent 78%);transform:scaleX(0);transform-origin:left;transition:transform .32s cubic-bezier(.22,1,.36,1)}
.team-card:hover{border-color:color-mix(in srgb,var(--cp-accent) 48%,var(--cp-border));transform:translateY(-6px);box-shadow:var(--cp-shadow-lg)}
.team-card:hover:before{opacity:1}.team-card:hover:after,.team-card.active:after{transform:scaleX(1)}
.team-card.active{border-color:color-mix(in srgb,var(--cp-accent) 60%,var(--cp-border));background:linear-gradient(145deg,color-mix(in srgb,var(--cp-accent-soft) 34%,var(--cp-surface)),var(--cp-surface))}
.team-top{display:flex;justify-content:space-between;align-items:center}
.team-logo{position:relative;display:grid;place-items:center;width:54px;height:54px;border-radius:16px;background:var(--cp-accent);color:var(--cp-accent-contrast);font-size:22px;font-weight:900;box-shadow:0 10px 24px var(--cp-accent-soft);transition:transform .28s cubic-bezier(.22,1,.36,1)}
.team-card:hover .team-logo{transform:rotate(-5deg) scale(1.07)}
.badge{font-size:8px;font-weight:900;letter-spacing:.12em;color:var(--cp-accent);border:1px solid color-mix(in srgb,var(--cp-accent) 35%,var(--cp-border));padding:6px 8px;border-radius:999px;background:var(--cp-accent-soft)}
.team-card h2{margin:18px 0 7px;color:var(--cp-text);font-size:20px;line-height:1.2;letter-spacing:-.025em;font-weight:750}
.team-card>p{display:flex;align-items:center;gap:6px;margin:0;color:var(--cp-text-muted);font-size:10px;line-height:1.5}
.team-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px;padding-top:14px;border-top:1px solid var(--cp-border)}
.team-actions span{font-size:9px;font-weight:650;color:var(--cp-text-muted)}
.open{padding:9px 11px}
.active-preview{position:relative;display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:22px;padding:25px 27px;border:1px solid color-mix(in srgb,var(--cp-accent) 32%,var(--cp-border));border-radius:20px;background:linear-gradient(120deg,var(--cp-accent-soft),var(--cp-surface));overflow:hidden;animation:cardIn .55s .18s cubic-bezier(.22,1,.36,1) both}
.active-preview:before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,color-mix(in srgb,var(--cp-accent) 8%,transparent) 50%,transparent 80%);transform:translateX(-100%);animation:scan 5s ease-in-out infinite}
.active-preview:after{content:'ACTIVE';position:absolute;right:-8px;bottom:-22px;color:var(--cp-accent);font-size:62px;font-weight:900;letter-spacing:-.08em;opacity:.055;pointer-events:none}
.active-preview>div,.active-preview .primary{position:relative;z-index:1}
.active-preview h2{margin:8px 0 6px;color:var(--cp-text);font-size:26px;line-height:1.15;letter-spacing:-.035em;font-weight:800}
.active-preview p{margin:0;color:var(--cp-text-muted);font-size:10px}
.active-preview .primary{white-space:nowrap}
@keyframes pageIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes cardIn{from{opacity:0;transform:translateY(18px) scale(.975)}to{opacity:1;transform:none}}
@keyframes scan{0%,55%{transform:translateX(-120%)}100%{transform:translateX(140%)}}
@media(prefers-reduced-motion:reduce){.teams-page,.team-card,.active-preview{animation:none}.team-card,.primary,.open,.team-logo{transition:none}.active-preview:before{animation:none}}
@media(max-width:900px){.team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.teams-page{padding:30px 16px 72px}.page-head,.active-preview{align-items:stretch;flex-direction:column}.team-grid{grid-template-columns:1fr}.primary{width:100%}.team-actions{align-items:flex-start;flex-direction:column}.active-preview .primary{width:100%}}
`]})
export class TeamsComponent { private readonly http=inject(HttpClient); private readonly router=inject(Router); teams:Team[]=[]; activeTeam:Team|null=null; activeTeamId:string|null=null; loading=true; error=false; constructor(){this.loadTeams();} loadTeams(){this.loading=true;this.error=false;this.http.get<Team[]>('http://localhost:8080/api/teams/mine').subscribe({next:teams=>{this.teams=teams;const saved=localStorage.getItem('cricketpulse_active_team_id');this.activeTeam=teams.find(t=>t.id===saved)||teams[0]||null;this.activeTeamId=this.activeTeam?.id||null;this.loading=false;},error:()=>{this.teams=[];this.activeTeam=null;this.activeTeamId=null;this.error=true;this.loading=false;}})} createTeam(){this.router.navigate(['/dashboard/teams/new']);} selectTeam(t:Team){this.activeTeam=t;this.activeTeamId=t.id;localStorage.setItem('cricketpulse_active_team_id',t.id);} openTeam(t:Team){this.selectTeam(t);this.router.navigate(['/dashboard/teams',t.id]);}}
