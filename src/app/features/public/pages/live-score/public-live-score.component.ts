import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LiveScore, LiveScoreService } from '../../../../live-score.service';

interface Match { id:string; name:string; format:string; status:string; teamAName?:string; teamBName?:string; }
interface CurrentInnings { inningsId:string; matchId?:string; inningsNumber:number; battingTeamId:string; bowlingTeamId?:string; runs:number; wickets:number; legalBalls:number; status:string; strikerId?:string; nonStrikerId?:string; currentBowlerId?:string; }

@Component({
  selector:'app-public-live-score', standalone:true, imports:[AsyncPipe,RouterLink],
  template:`
    <main class="public-live">
      <header class="header"><a class="brand" routerLink="/">CRICPULSE <span>LIVE</span></a><div class="status"><i></i> LIVE SCORE</div></header>
      <section class="hero"><div class="eyebrow">LIVE MATCH CENTRE</div><h1>{{match?.name || 'Live Cricket Match'}}</h1><p>{{match?.teamAName || 'Team A'}} <b>vs</b> {{match?.teamBName || 'Team B'}} · {{match?.format || 'CRICKET'}}</p></section>
      @if(score$ | async; as score){
        <section class="score-card"><div class="team">{{match?.teamAName || 'Batting Team'}} <small>INNINGS {{score.inningsNumber}}</small></div><div class="score">{{score.runs}}<em>/{{score.wickets}}</em></div><div class="overs">{{overs(score.legalBalls)}} <span>OVERS</span></div><div class="live-line"><i></i> SCORE UPDATES IN REAL TIME</div></section>
        <section class="info-grid"><article><span>LEGAL BALLS</span><strong>{{score.legalBalls}}</strong></article><article><span>RUN RATE</span><strong>{{runRate(score)}}</strong></article><article><span>STATUS</span><strong>{{score.status || 'LIVE'}}</strong></article></section>
        @if(score.partnership){<section class="info-grid partnership-grid"><article><span>PARTNERSHIP</span><strong>{{score.partnership.runs}}</strong></article><article><span>PARTNERSHIP BALLS</span><strong>{{score.partnership.balls}}</strong></article><article><span>WICKETS</span><strong>{{score.wickets}}</strong></article></section>}
      } @else {<section class="score-card loading"><div><span>Loading saved live score…</span><small>Waiting for the current innings</small></div></section>}
      <footer><span>Powered by <b>CricPulse</b></span><a [routerLink]="['/matches',matchId,'scorer']">Scorer Login →</a></footer>
    </main>
  `,
  styles:[`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.public-live{min-height:100vh;max-width:1180px;margin:auto;padding:24px 4vw 60px}.header{display:flex;justify-content:space-between;align-items:center}.brand{color:#edf8f2;text-decoration:none;font-weight:950;letter-spacing:1px}.brand span{color:#b8f45c;font-size:10px;margin-left:6px}.status{font-size:10px;font-weight:900;letter-spacing:1.5px;color:#c9ff71}.status i,.live-line i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#b8f45c;box-shadow:0 0 16px #b8f45c;margin-right:7px}.hero{text-align:center;padding:92px 0 36px}.eyebrow{font-size:9px;letter-spacing:3px;font-weight:900;color:#789386}.hero h1{font-size:clamp(36px,7vw,78px);line-height:.95;letter-spacing:-4px;margin:15px 0}.hero p{color:#91aa9d}.hero p b{color:#b8f45c;padding:0 8px}.score-card{position:relative;text-align:center;padding:44px 24px;border:1px solid #ffffff15;border-radius:30px;background:linear-gradient(145deg,#102a20,#091914);box-shadow:0 30px 80px #0008;overflow:hidden}.score-card:before{content:"";position:absolute;inset:auto -20% -75%;height:220px;background:#b8f45c0c;filter:blur(60px)}.team,.score,.overs,.live-line{position:relative}.team{font-size:13px;font-weight:900;letter-spacing:.5px}.team small{display:block;color:#789386;font-size:9px;letter-spacing:2px;margin-top:7px}.score{font-size:clamp(82px,16vw,170px);font-weight:950;line-height:.82;letter-spacing:-10px;margin:28px 0}.score em{font-style:normal;color:#91aa9d;font-size:.38em;letter-spacing:-3px;margin-left:8px}.overs{font-size:22px;font-weight:900}.overs span{font-size:9px;color:#789386;letter-spacing:2px;margin-left:6px}.live-line{margin-top:25px;font-size:9px;letter-spacing:2px;color:#789386;font-weight:900}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px}.info-grid article{padding:22px;border:1px solid #ffffff12;border-radius:18px;background:#ffffff05;text-align:center}.info-grid span{display:block;font-size:9px;letter-spacing:2px;color:#789386;font-weight:900}.info-grid strong{display:block;font-size:27px;margin-top:9px}.info-grid article:last-child strong{color:#b8f45c}.partnership-grid strong{color:#b8f45c}.loading{min-height:260px;display:grid;place-items:center;color:#789386}.loading>div{display:flex;flex-direction:column;gap:8px}.loading small{font-size:10px;color:#506b60}.public-live footer{display:flex;justify-content:space-between;margin-top:40px;color:#587065;font-size:10px}.public-live footer b,.public-live footer a{color:#b8f45c}.public-live footer a{text-decoration:none;font-weight:900}@media(max-width:600px){.public-live{padding:18px 16px 40px}.hero{padding:70px 0 28px}.info-grid{grid-template-columns:1fr}.score-card{padding:34px 18px}.score{letter-spacing:-7px}.public-live footer{gap:20px;flex-direction:column}}`]
})
export class PublicLiveScoreComponent {
  private readonly route=inject(ActivatedRoute); private readonly http=inject(HttpClient); private readonly liveScore=inject(LiveScoreService);
  private readonly api='http://localhost:8080/api';
  readonly matchId=this.route.snapshot.paramMap.get('id')||'';
  match:Match|null=null; score$=of<LiveScore|null>(null);

  constructor(){
    if(!this.matchId)return;
    this.http.get<Match>(`${this.api}/matches/${this.matchId}`).subscribe({next:m=>this.match=m,error:e=>console.error('[PublicLive] match load failed',e)});
    this.http.get<CurrentInnings>(`${this.api}/public/matches/${this.matchId}/current-innings`).subscribe({
      next:innings=>{const inningsId=innings.inningsId;if(!inningsId)return;this.score$=this.liveScore.watch(inningsId).pipe(catchError(e=>{console.error('[PublicLive] score failed',e);return of<LiveScore|null>(null);}));},
      error:e=>{console.error('[PublicLive] current innings failed',e);this.score$=of(null);}
    });
  }
  overs(balls:number){return `${Math.floor(balls/6)}.${balls%6}`;}
  runRate(score:LiveScore){return score.legalBalls?(score.runs/(score.legalBalls/6)).toFixed(2):'0.00';}
}
