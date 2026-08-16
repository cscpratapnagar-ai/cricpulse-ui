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
  styles:[`:host{display:block}.page{max-width:1180px;margin:auto;padding:34px 4vw 100px;color:#edf8f2}.card{border:1px solid #ffffff16;border-radius:22px;background:linear-gradient(180deg,#0f271ee8,#091712f7);box-shadow:0 18px 50px #0006}.back{display:inline-block;margin-bottom:18px;color:#91aa9d;text-decoration:none;font-size:12px}.back:hover{color:#b8f45c}.hero{display:flex;justify-content:space-between;align-items:center;padding:30px;margin-bottom:18px}.eyebrow{display:block;color:#789386;font-size:9px;font-weight:900;letter-spacing:2px}.hero h1{margin:9px 0 6px;font-size:clamp(30px,5vw,56px);letter-spacing:-3px}.hero p{margin:0;color:#91aa9d;font-size:11px}.badge{padding:10px 13px;border-radius:999px;background:#b8f45c;color:#10251e;font-size:9px;font-weight:950;letter-spacing:1.5px}.tabs{display:flex;gap:8px;padding:8px;margin-bottom:18px;overflow:auto}.tabs button{border:1px solid transparent;background:transparent;color:#91aa9d;padding:12px 16px;border-radius:12px;white-space:nowrap;font-size:10px;font-weight:900;cursor:pointer}.tabs button.active{background:#b8f45c;color:#10251e}.score-head{display:flex;justify-content:space-between;align-items:center;padding:24px;margin-bottom:18px}.score-head h2{margin:7px 0 0;font-size:24px}.score{font-size:54px;font-weight:950;letter-spacing:-3px}.score small{font-size:.5em;color:#91aa9d}.score span{display:block;text-align:right;color:#789386;font-size:9px;letter-spacing:1px;font-weight:900}.table-card{margin-bottom:18px;overflow:hidden}.section-title{padding:23px 24px 12px}.section-title h2{margin:6px 0 0;font-size:19px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:650px;table-layout:fixed}th,td{text-align:left;padding:13px 18px;border-top:1px solid #ffffff0d;font-size:11px;vertical-align:middle}th{color:#789386;font-size:8px;letter-spacing:1.5px;font-weight:900;background:#ffffff04}th:nth-child(n+3),td.num{text-align:right}td strong{font-size:12px}.batting-table .col-batter{width:31%}.batting-table .col-dismissal{width:22%}.batting-table .col-num{width:9.4%}.bowling-table .col-bowler{width:48%}.bowling-table .col-bowl-num{width:13%}.dismissal{color:#789386}.out{display:inline-block;margin-left:8px;padding:3px 5px;border-radius:5px;background:#ff766d22;color:#ffaaa4;font-size:7px;font-weight:900}.num{font-variant-numeric:tabular-nums}.wicket{color:#b8f45c;font-weight:950}.extras,.total{display:flex;justify-content:space-between;padding:14px 18px;border-top:1px solid #ffffff0d}.extras span,.total span{color:#789386;font-size:8px;font-weight:900;letter-spacing:1.5px}.extras strong,.total strong{font-size:11px}.total{background:#b8f45c08}.total strong{color:#c9ff71}.fow-grid{display:grid;grid-template-columns:repeat(2,1fr);padding:0 18px 18px;gap:8px}.fow{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;padding:11px;border:1px solid #ffffff10;border-radius:10px;background:#ffffff03;font-size:10px}.fow b{color:#b8f45c}.fow strong{color:#789386;font-size:9px}.empty{padding:0 24px 24px;color:#789386;font-size:11px}.state{padding:50px}.state h2{margin:10px 0 20px}.state a{display:inline-block;padding:11px 15px;border-radius:10px;background:#b8f45c;color:#10251e;text-decoration:none;font-size:10px;font-weight:900}@media(max-width:650px){.page{padding:24px 16px 70px}.hero,.score-head{align-items:flex-start;flex-direction:column;gap:18px}.badge{align-self:flex-start}.score{font-size:45px}.score span{text-align:left}.fow-grid{grid-template-columns:1fr}}`]
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
