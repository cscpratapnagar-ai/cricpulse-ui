import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Batter { playerId:string; playerName:string; runs:number; balls:number; fours:number; sixes:number; strikeRate:number; out:boolean; dismissal?:string|null; }
interface Bowler { playerId:string; playerName:string; legalBalls:number; runs:number; wickets:number; economy:number; }
interface FallOfWicket { wicketNumber:number; playerName:string; runs:number; overNumber:number; ballNumber:number; }
interface InningsScorecard { inningsId:string; matchId:string; inningsNumber:number; battingTeamId:string; teamName:string; runs:number; wickets:number; legalBalls:number; extras:number; batting:Batter[]; bowling:Bowler[]; fallOfWickets:FallOfWicket[]; }

@Component({
  selector:'app-match-scorecard',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
<section class="page">
  @if(loading){<section class="card state">Loading full scorecard…</section>}
  @else if(scorecards.length){
    <a class="back" [routerLink]="['/matches',matchId,'result']">← Back to result</a>
    <header class="hero card">
      <div><span class="eyebrow">CRICPULSE · FULL SCORECARD</span><h1>{{scorecards[0].teamName}} vs {{opponentName}}</h1><p>Completed match · Full batting, bowling and dismissal details</p></div>
      <div class="badge">SCORECARD</div>
    </header>

    <nav class="tabs card">
      @for(innings of scorecards; track innings.inningsId){<button [class.active]="selectedInnings===innings.inningsNumber" (click)="selectedInnings=innings.inningsNumber">Innings {{innings.inningsNumber}} · {{innings.teamName}}</button>}
    </nav>

    @for(innings of scorecards; track innings.inningsId){
      @if(selectedInnings===innings.inningsNumber){
        <section class="score-head card"><div><span class="eyebrow">INNINGS {{innings.inningsNumber}}</span><h2>{{innings.teamName}}</h2></div><div class="score">{{innings.runs}}<small>/{{innings.wickets}}</small><span>{{overs(innings.legalBalls)}} ov</span></div></section>

        <section class="card table-card">
          <div class="section-title"><div><span class="eyebrow">BATTING</span><h2>Batting Scorecard</h2></div></div>
          <div class="table-wrap"><table class="batting-table"><colgroup><col class="col-batter"><col class="col-dismissal"><col class="col-num"><col class="col-num"><col class="col-num"><col class="col-num"><col class="col-num"></colgroup><thead><tr><th>BATTER</th><th>DISMISSAL</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>
            @for(b of innings.batting; track b.playerId){<tr><td><strong>{{b.playerName}}</strong>@if(b.out){<span class="out">OUT</span>}</td><td class="dismissal">{{b.out ? (b.dismissal || 'Dismissed') : 'not out'}}</td><td class="num">{{b.runs}}</td><td class="num">{{b.balls}}</td><td class="num">{{b.fours}}</td><td class="num">{{b.sixes}}</td><td class="num">{{formatRate(b.strikeRate)}}</td></tr>}
          </tbody></table></div>
          <div class="extras"><span>EXTRAS</span><strong>{{innings.extras}}</strong></div>
          <div class="total"><span>TOTAL</span><strong>{{innings.runs}}/{{innings.wickets}} ({{overs(innings.legalBalls)}})</strong></div>
        </section>

        <section class="card table-card">
          <div class="section-title"><div><span class="eyebrow">BOWLING</span><h2>Bowling Scorecard</h2></div></div>
          <div class="table-wrap"><table class="bowling-table"><colgroup><col class="col-bowler"><col class="col-bowl-num"><col class="col-bowl-num"><col class="col-bowl-num"><col class="col-bowl-num"></colgroup><thead><tr><th>BOWLER</th><th>O</th><th>R</th><th>W</th><th>ECON</th></tr></thead><tbody>
            @for(b of innings.bowling; track b.playerId){<tr><td><strong>{{b.playerName}}</strong></td><td class="num">{{overs(b.legalBalls)}}</td><td class="num">{{b.runs}}</td><td class="num wicket">{{b.wickets}}</td><td class="num">{{formatRate(b.economy)}}</td></tr>}
          </tbody></table></div>
        </section>

        <section class="card table-card"><div class="section-title"><div><span class="eyebrow">FALL OF WICKETS</span><h2>Dismissals</h2></div></div>
          @if(innings.fallOfWickets.length){<div class="fow-grid">@for(w of innings.fallOfWickets; track w.wicketNumber){<div class="fow"><b>{{w.wicketNumber}}</b><span>{{w.playerName}}</span><strong>{{w.runs}} · {{w.overNumber}}.{{w.ballNumber}}</strong></div>}</div>}@else{<p class="empty">No wickets recorded.</p>}
        </section>
      }
    }
  } @else {<section class="card state"><span class="eyebrow">SCORECARD UNAVAILABLE</span><h2>No innings scorecard found.</h2><a [routerLink]="['/matches',matchId,'result']">Back to result →</a></section>}
</section>`,
  styles:[`:host{display:block}.page{max-width:1240px;margin:auto;padding:34px 32px 96px;color:var(--cp-text);animation:pageIn .45s cubic-bezier(.22,1,.36,1)}.card{border:1px solid var(--cp-border);border-radius:22px;background:var(--cp-surface);box-shadow:var(--cp-shadow-sm)}.back{display:inline-flex;align-items:center;gap:7px;margin-bottom:18px;color:var(--cp-text-muted);text-decoration:none;font-size:13px;font-weight:750;transition:.2s}.back:hover{color:var(--cp-accent);transform:translateX(-2px)}.hero{position:relative;display:flex;justify-content:space-between;align-items:center;padding:32px;margin-bottom:18px;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 10%,var(--cp-surface)),var(--cp-surface) 55%)}.hero:after{content:"";position:absolute;width:360px;height:360px;right:-110px;top:-180px;border-radius:50%;border:1px solid color-mix(in srgb,var(--cp-accent) 20%,transparent);box-shadow:0 0 0 45px color-mix(in srgb,var(--cp-accent) 4%,transparent),0 0 0 90px color-mix(in srgb,var(--cp-accent) 3%,transparent);animation:float 8s ease-in-out infinite}.hero>div{position:relative;z-index:1}.eyebrow{display:block;color:var(--cp-text-muted);font-size:11px;font-weight:850;letter-spacing:.09em}.hero h1{margin:10px 0 8px;font-size:clamp(34px,5vw,60px);line-height:1;letter-spacing:-.055em}.hero p{margin:0;color:var(--cp-text-muted);font-size:14px}.badge{padding:10px 14px;border-radius:999px;background:var(--cp-accent);color:var(--cp-accent-contrast,#102018);font-size:11px;font-weight:900;letter-spacing:.07em;box-shadow:0 10px 24px color-mix(in srgb,var(--cp-accent) 15%,transparent)}.tabs{display:flex;gap:8px;padding:8px;margin-bottom:18px;overflow:auto}.tabs button{border:1px solid transparent;background:transparent;color:var(--cp-text-muted);padding:12px 16px;border-radius:12px;white-space:nowrap;font-size:13px;font-weight:800;cursor:pointer;transition:.2s}.tabs button:hover{background:var(--cp-surface-raised);color:var(--cp-text)}.tabs button.active{background:var(--cp-accent);color:var(--cp-accent-contrast,#102018);box-shadow:0 8px 20px color-mix(in srgb,var(--cp-accent) 14%,transparent)}.score-head{display:flex;justify-content:space-between;align-items:center;padding:25px 28px;margin-bottom:18px;background:linear-gradient(135deg,var(--cp-surface),color-mix(in srgb,var(--cp-accent) 5%,var(--cp-surface)))}.score-head h2{margin:8px 0 0;font-size:26px;letter-spacing:-.035em}.score{font-size:clamp(58px,7vw,88px);font-weight:950;letter-spacing:-.075em;line-height:.88}.score small{font-size:.48em;color:var(--cp-text-muted);margin-left:5px}.score span{display:block;text-align:right;margin-top:8px;color:var(--cp-text-muted);font-size:11px;letter-spacing:.07em;font-weight:850}.table-card{margin-bottom:18px;overflow:hidden}.section-title{padding:24px 26px 14px}.section-title h2{margin:7px 0 0;font-size:22px;letter-spacing:-.03em}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:680px;table-layout:fixed}th,td{text-align:left;padding:15px 18px;border-top:1px solid var(--cp-border);font-size:13px;vertical-align:middle}th{color:var(--cp-text-muted);font-size:11px;letter-spacing:.08em;font-weight:850;background:var(--cp-surface-raised)}th:nth-child(n+3),td.num{text-align:right}tbody tr{transition:.18s}tbody tr:hover{background:color-mix(in srgb,var(--cp-accent) 5%,transparent)}td strong{font-size:14px}.batting-table .col-batter{width:31%}.batting-table .col-dismissal{width:22%}.batting-table .col-num{width:9.4%}.bowling-table .col-bowler{width:48%}.bowling-table .col-bowl-num{width:13%}.dismissal{color:var(--cp-text-muted)}.out{display:inline-block;margin-left:8px;padding:4px 7px;border-radius:6px;background:color-mix(in srgb,#e65b57 13%,transparent);color:#d96a66;font-size:10px;font-weight:850;letter-spacing:.04em}.num{font-variant-numeric:tabular-nums}.wicket{color:var(--cp-accent);font-weight:900}.extras,.total{display:flex;justify-content:space-between;padding:15px 20px;border-top:1px solid var(--cp-border)}.extras span,.total span{color:var(--cp-text-muted);font-size:11px;font-weight:850;letter-spacing:.08em}.extras strong,.total strong{font-size:14px}.total{background:color-mix(in srgb,var(--cp-accent) 6%,var(--cp-surface))}.total strong{color:var(--cp-accent)}.fow-grid{display:grid;grid-template-columns:repeat(2,1fr);padding:0 20px 20px;gap:10px}.fow{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:13px;border:1px solid var(--cp-border);border-radius:13px;background:var(--cp-surface-raised);font-size:13px;transition:.18s}.fow:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--cp-accent) 35%,var(--cp-border))}.fow b{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:12px}.fow strong{color:var(--cp-text-muted);font-size:11px;white-space:nowrap}.empty{padding:0 24px 24px;color:var(--cp-text-muted);font-size:13px}.state{padding:56px;text-align:center}.state h2{margin:10px 0 20px;font-size:28px;letter-spacing:-.035em}.state a{display:inline-flex;padding:12px 16px;border-radius:12px;background:var(--cp-accent);color:var(--cp-accent-contrast,#102018);text-decoration:none;font-size:13px;font-weight:850;transition:.2s}.state a:hover{transform:translateY(-2px)}@keyframes pageIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes float{50%{transform:translateY(16px) scale(1.04)}}@media(max-width:650px){.page{padding:24px 14px 72px}.hero,.score-head{align-items:flex-start;flex-direction:column;gap:18px}.badge{align-self:flex-start}.score{font-size:64px}.score span{text-align:left}.fow-grid{grid-template-columns:1fr}.section-title{padding:21px 18px 13px}.extras,.total{padding:14px 18px}}`]
})
export class MatchScorecardComponent{
  private readonly http=inject(HttpClient); private readonly route=inject(ActivatedRoute);
  readonly api='http://localhost:8080/api'; matchId=this.route.snapshot.paramMap.get('id')||''; loading=true; scorecards:InningsScorecard[]=[]; selectedInnings=1;
  constructor(){if(this.matchId)this.load();else this.loading=false;}
  load(){this.http.get<InningsScorecard[]>(`${this.api}/matches/${this.matchId}/scorecard`).subscribe({next:data=>{this.scorecards=data||[];this.selectedInnings=this.scorecards[0]?.inningsNumber||1;this.loading=false;},error:()=>{this.scorecards=[];this.loading=false;}});}
  get opponentName(){return this.scorecards.find(x=>x.inningsNumber!==this.scorecards[0]?.inningsNumber)?.teamName||'Opponent';}
  overs(balls:number){return `${Math.floor((balls||0)/6)}.${(balls||0)%6}`;}
  formatRate(value:number|null|undefined){return value==null?'0.00':Number(value).toFixed(2);}
}
