import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Batter { playerId:string; playerName:string; runs:number; balls:number; fours:number; sixes:number; strikeRate:number; out:boolean; dismissal?:string|null; }
interface Bowler { playerId:string; playerName:string; legalBalls:number; runs:number; wickets:number; economy:number; }
interface InningsScorecard { inningsId:string; inningsNumber:number; teamName:string; runs:number; wickets:number; legalBalls:number; extras:number; batting:Batter[]; bowling:Bowler[]; }
interface PlayerStat { playerId:string; playerName:string; teamName:string; runs:number; balls:number; fours:number; sixes:number; strikeRate:number; wickets:number; runsConceded:number; economy:number; }

@Component({
  selector:'app-match-statistics',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
<section class="page">
@if(loading){<section class="card state">Loading match statistics…</section>}
@else if(scorecards.length){
<a class="back" [routerLink]="['/matches',matchId,'result']">← Back to result</a>
<header class="hero card"><div><span class="eyebrow">CRICPULSE · MATCH STATISTICS</span><h1>Player Performance</h1><p>Runs, wickets, strike rate, economy and boundary leaders from the completed match.</p></div><div class="badge">STATISTICS</div></header>

<section class="spotlight card">
  <div class="spotlight-copy"><span class="eyebrow">PLAYER OF THE MATCH</span><h2>{{playerOfMatch?.playerName || '—'}}</h2><p>{{playerOfMatch?.teamName || ''}}</p><small>Performance-based selection from batting and bowling figures.</small></div>
  @if(playerOfMatch){<div class="spotlight-score"><strong>{{playerOfMatch.runs}}</strong><span>RUNS</span><strong>{{playerOfMatch.wickets}}</strong><span>WICKETS</span></div>}
</section>

<section class="stats-grid">
  <article class="card stat"><span>TOP RUN SCORER</span><strong>{{topRunScorer?.runs || 0}}</strong><b>{{topRunScorer?.playerName || '—'}}</b><small>{{topRunScorer?.teamName || ''}}</small></article>
  <article class="card stat"><span>TOP WICKET TAKER</span><strong>{{topWicketTaker?.wickets || 0}}</strong><b>{{topWicketTaker?.playerName || '—'}}</b><small>{{topWicketTaker?.teamName || ''}}</small></article>
  <article class="card stat"><span>MOST SIXES</span><strong>{{topSixHitter?.sixes || 0}}</strong><b>{{topSixHitter?.playerName || '—'}}</b><small>{{topSixHitter?.teamName || ''}}</small></article>
  <article class="card stat"><span>BEST ECONOMY</span><strong>{{bestEconomy ? format(bestEconomy.economy) : '0.00'}}</strong><b>{{bestEconomy?.playerName || '—'}}</b><small>{{bestEconomy?.teamName || ''}}</small></article>
</section>

<section class="card table-card"><div class="section-title"><span class="eyebrow">BATTING LEADERS</span><h2>Batting Performance</h2></div><div class="table-wrap"><table><thead><tr><th>PLAYER</th><th>TEAM</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>@for(p of battingLeaders;track p.playerId){<tr><td><strong>{{p.playerName}}</strong></td><td>{{p.teamName}}</td><td class="num">{{p.runs}}</td><td class="num">{{p.balls}}</td><td class="num">{{p.fours}}</td><td class="num">{{p.sixes}}</td><td class="num">{{format(p.strikeRate)}}</td></tr>}</tbody></table></div></section>

<section class="card table-card"><div class="section-title"><span class="eyebrow">BOWLING LEADERS</span><h2>Bowling Performance</h2></div><div class="table-wrap"><table><thead><tr><th>PLAYER</th><th>TEAM</th><th>O</th><th>R</th><th>W</th><th>ECON</th></tr></thead><tbody>@for(p of bowlingLeaders;track p.playerId){<tr><td><strong>{{p.playerName}}</strong></td><td>{{p.teamName}}</td><td class="num">{{overs(p.legalBalls)}}</td><td class="num">{{p.runsConceded}}</td><td class="num wicket">{{p.wickets}}</td><td class="num">{{format(p.economy)}}</td></tr>}</tbody></table></div></section>

<section class="card table-card"><div class="section-title"><span class="eyebrow">BOUNDARIES</span><h2>Boundary Leaders</h2></div><div class="boundary-grid"><div><span>FOURS</span><strong>{{mostFours?.fours || 0}}</strong><b>{{mostFours?.playerName || '—'}}</b></div><div><span>SIXES</span><strong>{{topSixHitter?.sixes || 0}}</strong><b>{{topSixHitter?.playerName || '—'}}</b></div><div><span>TOTAL BOUNDARIES</span><strong>{{totalFours + totalSixes}}</strong><b>{{totalFours}} fours · {{totalSixes}} sixes</b></div></div></section>

<div class="actions"><a [routerLink]="['/matches',matchId,'scorecard']">Full Scorecard →</a><a [routerLink]="['/matches',matchId,'overview']">Match Centre →</a></div>
} @else {<section class="card state"><span class="eyebrow">STATISTICS UNAVAILABLE</span><h2>No completed innings data found.</h2><a [routerLink]="['/matches',matchId,'result']">Back to result →</a></section>}
</section>`,
  styles:[`:host{display:block}.page{max-width:1180px;margin:auto;padding:34px 4vw 100px;color:#edf8f2}.card{border:1px solid #ffffff16;border-radius:22px;background:linear-gradient(180deg,#0f271ee8,#091712f7);box-shadow:0 18px 50px #0006}.back{display:inline-block;margin-bottom:18px;color:#91aa9d;text-decoration:none;font-size:12px}.back:hover{color:#b8f45c}.eyebrow{display:block;color:#789386;font-size:9px;font-weight:900;letter-spacing:2px}.hero{display:flex;justify-content:space-between;align-items:center;padding:30px;margin-bottom:18px}.hero h1{margin:9px 0 6px;font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-3px}.hero p{margin:0;color:#91aa9d;font-size:11px}.badge{padding:10px 13px;border-radius:999px;background:#b8f45c;color:#10251e;font-size:9px;font-weight:950;letter-spacing:1.5px}.spotlight{display:flex;justify-content:space-between;align-items:center;padding:28px;margin-bottom:18px;border-color:#b8f45c35;background:linear-gradient(120deg,#b8f45c12,#091712f7)}.spotlight h2{margin:8px 0 3px;font-size:34px;letter-spacing:-1.5px}.spotlight p{margin:0 0 6px;color:#c9ff71;font-size:11px;font-weight:800}.spotlight small{color:#789386;font-size:9px}.spotlight-score{display:grid;grid-template-columns:auto auto;gap:4px 10px;text-align:right;align-items:end}.spotlight-score strong{font-size:36px;line-height:1}.spotlight-score span{font-size:8px;color:#789386;font-weight:900;letter-spacing:1px}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}.stat{padding:20px}.stat>span{display:block;color:#789386;font-size:8px;font-weight:900;letter-spacing:1.5px}.stat strong{display:block;margin:10px 0 5px;font-size:38px;line-height:1;letter-spacing:-2px}.stat b{display:block;font-size:12px}.stat small{display:block;margin-top:4px;color:#789386;font-size:9px}.table-card{margin-bottom:18px;overflow:hidden}.section-title{padding:22px 24px 12px}.section-title h2{margin:6px 0 0;font-size:19px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;table-layout:fixed;min-width:700px}th,td{text-align:left;padding:13px 18px;border-top:1px solid #ffffff0d;font-size:10px}th{color:#789386;font-size:8px;letter-spacing:1.5px;font-weight:900;background:#ffffff04}th:first-child,td:first-child{width:27%}th:nth-child(2),td:nth-child(2){width:23%}th:nth-child(n+3),td:nth-child(n+3){width:10%;text-align:right}td strong{font-size:11px}.num{font-variant-numeric:tabular-nums}.wicket{color:#b8f45c;font-weight:950}.boundary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px}.boundary-grid>div{padding:22px;background:#ffffff03;border-top:1px solid #ffffff0d}.boundary-grid span{display:block;color:#789386;font-size:8px;font-weight:900;letter-spacing:1.5px}.boundary-grid strong{display:block;margin:9px 0 4px;font-size:34px}.boundary-grid b{font-size:11px}.actions{display:flex;justify-content:flex-end;gap:10px}.actions a,.state a{padding:12px 16px;border-radius:11px;background:#b8f45c;color:#10251e;text-decoration:none;font-size:10px;font-weight:900}.state{padding:50px}.state h2{margin:10px 0 20px}@media(max-width:900px){.stats-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.page{padding:24px 16px 70px}.hero,.spotlight{align-items:flex-start;flex-direction:column;gap:18px}.spotlight h2{font-size:28px}.spotlight-score{text-align:left}.stats-grid,.boundary-grid{grid-template-columns:1fr}.actions{flex-direction:column}.actions a{text-align:center}}`]
})
export class MatchStatisticsComponent {
  private readonly http=inject(HttpClient); private readonly route=inject(ActivatedRoute);
  readonly api='http://localhost:8080/api'; matchId=this.route.snapshot.paramMap.get('id')||''; loading=true; scorecards:InningsScorecard[]=[]; allBatting:PlayerStat[]=[]; allBowling:PlayerStat[]=[];
  constructor(){if(this.matchId)this.load();else this.loading=false;}
  load(){this.http.get<InningsScorecard[]>(`${this.api}/matches/${this.matchId}/scorecard`).subscribe({next:data=>{this.scorecards=data||[];this.buildStats();this.loading=false;},error:()=>{this.scorecards=[];this.loading=false;}});}
  private buildStats(){const batting=new Map<string,PlayerStat>();const bowling=new Map<string,PlayerStat>();for(const innings of this.scorecards){for(const b of innings.batting||[]){const p=batting.get(b.playerId)||{playerId:b.playerId,playerName:b.playerName,teamName:innings.teamName,runs:0,balls:0,fours:0,sixes:0,strikeRate:0,wickets:0,runsConceded:0,economy:0};p.runs+=b.runs||0;p.balls+=b.balls||0;p.fours+=b.fours||0;p.sixes+=b.sixes||0;p.strikeRate=p.balls?((p.runs/p.balls)*100):0;batting.set(b.playerId,p);}for(const b of innings.bowling||[]){const p=bowling.get(b.playerId)||{playerId:b.playerId,playerName:b.playerName,teamName:innings.teamName,runs:0,balls:0,fours:0,sixes:0,strikeRate:0,wickets:0,runsConceded:0,economy:0};p.balls+=b.legalBalls||0;p.wickets+=b.wickets||0;p.runsConceded+=b.runs||0;p.economy=p.balls?(p.runsConceded/(p.balls/6)):0;bowling.set(b.playerId,p);}}this.allBatting=[...batting.values()].sort((a,b)=>b.runs-a.runs||b.strikeRate-a.strikeRate);this.allBowling=[...bowling.values()].sort((a,b)=>b.wickets-a.wickets||a.economy-b.economy);}
  get battingLeaders(){return this.allBatting;} get bowlingLeaders(){return this.allBowling;}
  get topRunScorer(){return this.allBatting[0];} get topWicketTaker(){return [...this.allBowling].sort((a,b)=>b.wickets-a.wickets||a.economy-b.economy)[0];}
  get topSixHitter(){return [...this.allBatting].sort((a,b)=>b.sixes-a.sixes||b.runs-a.runs)[0];} get mostFours(){return [...this.allBatting].sort((a,b)=>b.fours-a.fours||b.runs-a.runs)[0];}
  get bestEconomy(){return [...this.allBowling].filter(x=>x.balls>0).sort((a,b)=>a.economy-b.economy||b.wickets-a.wickets)[0];}
  get totalFours(){return this.allBatting.reduce((s,p)=>s+p.fours,0);} get totalSixes(){return this.allBatting.reduce((s,p)=>s+p.sixes,0);}
  get playerOfMatch(){const players=new Map<string,PlayerStat>();for(const p of this.allBatting){players.set(p.playerId,{...p});}for(const p of this.allBowling){const x=players.get(p.playerId)||{...p};x.wickets=(x.wickets||0)+p.wickets;x.runsConceded=(x.runsConceded||0)+p.runsConceded;x.economy=p.economy;players.set(p.playerId,x);}return [...players.values()].sort((a,b)=>this.performanceScore(b)-this.performanceScore(a))[0];}
  private performanceScore(p:PlayerStat){return (p.runs||0)+(p.wickets||0)*25+(p.fours||0)*1+(p.sixes||0)*2-(p.runsConceded||0)*0.05;}
  format(v:number|undefined|null){return v==null?'0.00':v.toFixed(2);} overs(b:number){return `${Math.floor((b||0)/6)}.${(b||0)%6}`;}
}
