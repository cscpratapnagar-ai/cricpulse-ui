import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, startWith } from 'rxjs';
import { SelectFieldComponent, SelectOption } from './ui/select-field.component';
import { LiveScore, LiveScoreService } from './live-score.service';

interface Match { id: string; name: string; format: string; status: string; teamAId: string; teamBId: string; teamAName?: string; teamBName?: string; }
interface Player { id: string; name: string; role: string; battingStyle: string; bowlingStyle: string; }
interface InningsResponse { id: string; inningsNumber: number; }

@Component({
  selector: 'app-scorer',
  standalone: true,
  imports: [AsyncPipe, RouterLink, SelectFieldComponent],
  template: `
    <section class="scorer-page">
      <header class="topbar">
        <div><div class="eyebrow">CRICPULSE SCORER</div><h1>{{ match?.name || 'Scorer Control Room' }}</h1><p>{{ match?.teamAName || 'Team A' }} <span>vs</span> {{ match?.teamBName || 'Team B' }} · {{ match?.format || 'LIVE MATCH' }}</p></div>
        <div class="top-actions"><span class="live-pill"><i></i> LIVE</span><a routerLink="/matches" class="back">Matches</a></div>
      </header>

      @if (!inningsId) {
        <section class="setup card">
          <div class="section-title"><div><span>01 · INNINGS SETUP</span><h2>Start the scoring session</h2></div><b>READY</b></div>
          <div class="setup-grid">
            <app-select-field label="Batting team" placeholder="Choose batting team" [options]="teamOptions" [(value)]="battingTeamId" />
            <app-select-field label="Innings" placeholder="Choose innings" [options]="inningsOptions" [(value)]="inningsNumber" />
            <button class="start" (click)="startInnings()" [disabled]="starting">{{ starting ? 'Starting…' : 'Start innings' }} <span>→</span></button>
          </div>
          @if (message) { <p class="message">{{ message }}</p> }
        </section>
      } @else {
        <section class="score-hero card">
          <div class="score-main"><div class="score-label">{{ battingTeamName }} · INNINGS {{ inningsNumber }}</div>@if (score$ | async; as score) {<div class="score">{{ score?.runs ?? 0 }}<em>/{{ score?.wickets ?? 0 }}</em></div><div class="score-sub"><b>{{ overs(score?.legalBalls ?? 0) }}</b> OVERS <span>•</span> LIVE SYNC <strong>●</strong></div>} @else {<div class="score">0<em>/0</em></div>}</div>
          <div class="match-state"><span>SCORING SESSION</span><strong>{{ currentOverLabel }}</strong><small>{{ message || 'Ready for next delivery' }}</small></div>
        </section>
        <section class="workspace">
          <div class="main-column">
            <article class="card delivery-card">
              <div class="section-title"><div><span>02 · DELIVERY CONSOLE</span><h2>Record the next ball</h2></div><span class="ball-chip">{{ currentOverLabel }}</span></div>
              <div class="run-grid">@for (run of runs; track run) { <button class="run" (click)="record(run)">{{ run }}</button> }</div>
              <div class="extra-grid"><button (click)="extra('WIDE')">WIDE</button><button (click)="extra('NO_BALL')">NO BALL</button><button (click)="extra('BYE')">BYE</button><button (click)="extra('LEG_BYE')">LEG BYE</button><button class="wicket" (click)="wicket()">WICKET</button><button class="undo" (click)="undo()">UNDO</button></div>
              <div class="hint">Tap a scoring action once. Every delivery is persisted by the scoring engine and broadcast to live viewers.</div>
            </article>
            <article class="card players-card">
              <div class="section-title"><div><span>03 · ON-FIELD</span><h2>Players at the crease</h2></div><span class="live-dot">● SYNCED</span></div>
              <div class="player-grid"><app-select-field label="Striker" placeholder="Select striker" [options]="battingOptions" [(value)]="strikerId" /><app-select-field label="Non-striker" placeholder="Select non-striker" [options]="battingOptions" [(value)]="nonStrikerId" /><app-select-field label="Bowler" placeholder="Select bowler" [options]="bowlingOptions" [(value)]="bowlerId" /></div>
            </article>
          </div>
          <aside class="side-column">
            <article class="card mini-card"><div class="section-title"><div><span>THIS OVER</span><h2>Ball sequence</h2></div></div><div class="balls">@for (ball of overBalls; track $index) { <span [class.boundary]="ball === '4' || ball === '6'" [class.extra]="ball === 'Wd' || ball === 'Nb'">{{ ball }}</span> } @if (!overBalls.length) { <small>Awaiting first delivery</small> }</div></article>
            <article class="card mini-card"><div class="section-title"><div><span>PARTNERSHIP</span><h2>Current stand</h2></div></div><div class="partnership"><strong>{{ partnershipRuns }}</strong><span>{{ partnershipBalls }} balls</span></div></article>
            <article class="card mini-card action-card"><div><span>LIVE VIEW</span><h2>Open public score</h2><p>Use the same real-time feed for viewers and broadcast overlays.</p></div><a [routerLink]="['/matches', matchId, 'live']">Open live match →</a></article>
          </aside>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.scorer-page{min-height:100%;max-width:1280px;margin:auto;padding:34px 4vw 90px;color:#edf8f2}.topbar{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:22px}.eyebrow,.section-title>div>span,.score-label,.match-state>span,.action-card>div>span{font-size:9px;font-weight:900;letter-spacing:2px;color:#789386}.topbar h1{margin:10px 0 7px;font-size:clamp(34px,5vw,62px);line-height:.95;letter-spacing:-3px}.topbar p{margin:0;color:#91aa9d}.topbar p span{color:#b8f45c;padding:0 5px}.top-actions{display:flex;align-items:center;gap:10px}.live-pill{padding:9px 12px;border:1px solid #b8f45c35;background:#b8f45c0c;border-radius:999px;color:#c9ff71;font-size:10px;font-weight:900;letter-spacing:1px}.live-pill i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#b8f45c;margin-right:6px;box-shadow:0 0 12px #b8f45c}.back{padding:11px 14px;border:1px solid #ffffff18;border-radius:11px;color:#edf8f2;text-decoration:none;font-weight:800}.card{border:1px solid #ffffff16;border-radius:22px;background:linear-gradient(180deg,#0f271ee6,#0a1914f7);box-shadow:0 18px 50px #0006;backdrop-filter:blur(16px)}.setup{padding:24px}.section-title{display:flex;justify-content:space-between;align-items:start;gap:15px;margin-bottom:18px}.section-title h2{margin:5px 0 0;font-size:20px;letter-spacing:-.8px}.section-title>b{font-size:9px;color:#b8f45c;letter-spacing:1px;padding:7px 9px;border:1px solid #b8f45c2d;border-radius:999px;background:#b8f45c0c}.setup-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;align-items:end}.start{height:50px;border:0;border-radius:11px;background:#b8f45c;color:#10251e;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 10px 30px #b8f45c1f}.start:disabled{opacity:.55;cursor:wait}.start span{margin-left:8px;font-size:18px}.message{margin:13px 0 0;color:#c9ff71;font-size:12px}.score-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:25px;padding:28px;margin-bottom:18px}.score{font-size:clamp(68px,10vw,124px);font-weight:950;line-height:.85;letter-spacing:-8px;margin:14px 0}.score em{font-style:normal;color:#91aa9d;font-size:.43em;letter-spacing:-2px;margin-left:7px}.score-sub{font-size:10px;letter-spacing:1.3px;color:#789386;font-weight:850}.score-sub b{font-size:16px;color:#edf8f2;letter-spacing:-.5px}.score-sub span{padding:0 8px;color:#3b5a4c}.score-sub strong{color:#b8f45c}.match-state{min-width:230px;padding:18px;border:1px solid #ffffff12;border-radius:16px;background:#ffffff05}.match-state strong{display:block;font-size:27px;margin:8px 0 3px}.match-state small{color:#789386;line-height:1.5}.workspace{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.7fr);gap:18px}.main-column,.side-column{display:grid;gap:18px;align-content:start}.delivery-card,.players-card,.mini-card{padding:24px}.ball-chip{padding:8px 11px;border-radius:999px;background:#b8f45c12;border:1px solid #b8f45c30;color:#c9ff71;font-size:10px;font-weight:900}.run-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.run{height:76px;border:1px solid #b8f45c26;border-radius:16px;background:linear-gradient(180deg,#b8f45c18,#b8f45c08);color:#efffe5;font-size:25px;font-weight:950;cursor:pointer;transition:.2s}.run:hover{transform:translateY(-3px);background:#b8f45c;color:#10251e;box-shadow:0 14px 30px #b8f45c22}.extra-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.extra-grid button{height:48px;border:1px solid #ffffff16;border-radius:12px;background:#ffffff06;color:#edf8f2;font-size:10px;font-weight:900;letter-spacing:.7px;cursor:pointer;transition:.2s}.extra-grid button:hover{border-color:#b8f45c55;transform:translateY(-2px)}.extra-grid .wicket{background:#ff766d;color:#1e100f;border-color:#ff766d}.extra-grid .undo{background:#ffffff0a;color:#91aa9d}.hint{margin-top:16px;padding:12px 14px;border-left:2px solid #b8f45c;color:#789386;font-size:11px;line-height:1.5;background:#ffffff04}.player-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.live-dot{font-size:9px;color:#b8f45c;font-weight:900;letter-spacing:1px}.balls{display:flex;flex-wrap:wrap;gap:8px;min-height:46px}.balls span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#ffffff08;border:1px solid #ffffff14;font-weight:900;font-size:12px}.balls span.boundary{background:#b8f45c;color:#10251e;border-color:#b8f45c}.balls span.extra{color:#c9ff71;border-color:#b8f45c44}.balls small{color:#789386;padding-top:12px}.partnership{display:flex;align-items:end;gap:12px}.partnership strong{font-size:48px;line-height:.9;letter-spacing:-3px}.partnership span{color:#789386;font-size:10px;font-weight:800}.action-card p{color:#789386;font-size:11px;line-height:1.5}.action-card a{display:inline-flex;margin-top:10px;color:#b8f45c;text-decoration:none;font-weight:900;font-size:12px}.action-card a:hover{text-decoration:underline}@media(max-width:900px){.setup-grid,.workspace{grid-template-columns:1fr}.player-grid{grid-template-columns:1fr}.score-hero{align-items:stretch;flex-direction:column}.match-state{min-width:0}.side-column{grid-template-columns:1fr 1fr}.action-card{grid-column:1/-1}}@media(max-width:620px){.scorer-page{padding:24px 16px 70px}.topbar{align-items:flex-start;flex-direction:column}.top-actions{width:100%;justify-content:space-between}.run-grid{grid-template-columns:repeat(3,1fr)}.run{height:64px}.extra-grid{grid-template-columns:repeat(2,1fr)}.side-column{grid-template-columns:1fr}.score{letter-spacing:-6px}.score-hero{padding:22px}.delivery-card,.players-card,.mini-card{padding:18px}}
  `]
})
export class ScorerComponent {
  private readonly http=inject(HttpClient); private readonly route=inject(ActivatedRoute); private readonly router=inject(Router); private readonly liveScore=inject(LiveScoreService);
  readonly runs=[0,1,2,3,4,6]; readonly inningsOptions:SelectOption[]=[{value:'1',label:'Innings 1'},{value:'2',label:'Innings 2'}];
  matchId=this.route.snapshot.paramMap.get('id')||''; match:Match|null=null; inningsId=''; inningsNumber='1'; battingTeamId=''; strikerId=''; nonStrikerId=''; bowlerId=''; battingPlayers:Player[]=[]; bowlingPlayers:Player[]=[]; score$=of<LiveScore|null>(null); starting=false; message=''; currentLegalBalls=0; currentOver=0; currentBall=1; overBalls:string[]=[]; partnershipRuns=0; partnershipBalls=0;
  constructor(){if(this.matchId)this.loadMatch();}
  get teamOptions():SelectOption[]{return this.match?[{value:this.match.teamAId,label:this.match.teamAName||'Team A'},{value:this.match.teamBId,label:this.match.teamBName||'Team B'}]:[];}
  get battingOptions():SelectOption[]{return this.battingPlayers.map(p=>({value:p.id,label:p.name}));}
  get bowlingOptions():SelectOption[]{return this.bowlingPlayers.map(p=>({value:p.id,label:p.name}));}
  get battingTeamName():string{if(!this.match)return 'Batting team';return this.battingTeamId===this.match.teamBId?(this.match.teamBName||'Team B'):(this.match.teamAName||'Team A');}
  get currentOverLabel():string{return `${this.currentOver}.${Math.max(0,this.currentBall-1)}`;}
  private loadMatch():void{this.http.get<Match>(`http://localhost:8080/api/matches/${this.matchId}`).subscribe({next:m=>{this.match=m;this.battingTeamId=m.teamAId;this.loadPlayers(m.teamAId,m.teamBId);},error:()=>this.message='Could not load the match.'});}
  private loadPlayers(battingId:string,bowlingId:string):void{this.http.get<Player[]>(`http://localhost:8080/api/players/teams/${battingId}`).subscribe({next:p=>{this.battingPlayers=p;this.strikerId=p[0]?.id||'';this.nonStrikerId=p[1]?.id||'';},error:()=>this.battingPlayers=[]});this.http.get<Player[]>(`http://localhost:8080/api/players/teams/${bowlingId}`).subscribe({next:p=>{this.bowlingPlayers=p;this.bowlerId=p[0]?.id||'';},error:()=>this.bowlingPlayers=[]});}
  startInnings():void{
    if(!this.match||!this.battingTeamId){this.message='Choose the batting team first.';return;}
    this.starting=true;
    this.message='Starting innings…';
    this.http.post<InningsResponse>('http://localhost:8080/api/scoring/innings',{matchId:this.match.id,inningsNumber:Number(this.inningsNumber),battingTeamId:this.battingTeamId}).subscribe({
      next:r=>{
        this.starting=false;
        this.inningsId=r.id;
        this.inningsNumber=String(r.inningsNumber);
        this.router.navigate(['/matches',this.matchId,'live-scoring'],{queryParams:{inningsId:r.id,striker:this.strikerId,nonStriker:this.nonStrikerId,bowler:this.bowlerId}}).then(ok=>{
          if(!ok){this.message='Innings started, but Live Scoring navigation failed.';this.connectLive();}
        }).catch(()=>{this.message='Innings started, but Live Scoring navigation failed.';this.connectLive();});
      },
      error:err=>{
        this.starting=false;
        if(err?.status===400&&String(err?.error?.message||'').toLowerCase().includes('already exists')){
          this.message='Innings already exists. Opening Live Scoring…';
          this.http.get<LiveScore>(`http://localhost:8080/api/matches/${this.matchId}/current-innings`).subscribe({
            next:existing=>{
              this.inningsId=existing.inningsId;
              this.router.navigate(['/matches',this.matchId,'live-scoring'],{queryParams:{inningsId:existing.inningsId}});
            },
            error:()=>{this.message='Innings already exists, but could not load it.';}
          });
          return;
        }
        this.message=err?.error?.message||'Could not start innings.';
      }
    });
  }
  private connectLive():void{if(this.inningsId)this.score$=this.liveScore.watch(this.inningsId).pipe(startWith(null),catchError(()=>of(null)));}
  record(runs:number):void{this.submit(runs,0,null,null,true);}
  extra(type:string):void{this.submit(0,1,type,null,type!=='WIDE'&&type!=='NO_BALL');}
  wicket():void{this.submit(0,0,null,'BOWLED',true);}
  private submit(batRuns:number,extraRuns:number,extraType:string|null,wicketType:string|null,legal=true):void{if(!this.inningsId){this.message='Start an innings first.';return;}if(!this.strikerId||!this.nonStrikerId||!this.bowlerId){this.message='Select striker, non-striker and bowler.';return;}const payload={inningsId:this.inningsId,overNumber:this.currentOver,ballNumber:this.currentBall,strikerId:this.strikerId,nonStrikerId:this.nonStrikerId,bowlerId:this.bowlerId,batRuns,extraRuns,extraType,wicketType,dismissedPlayerId:wicketType?this.strikerId:null};this.http.post(`http://localhost:8080/api/scoring/innings/${this.inningsId}/deliveries`,payload).subscribe({next:()=>{this.message=wicketType?'Wicket recorded':`${batRuns||extraType||0} recorded`;this.overBalls=[...this.overBalls,wicketType?'W':extraType==='WIDE'?'Wd':extraType==='NO_BALL'?'Nb':String(batRuns+extraRuns)];this.partnershipRuns+=batRuns+extraRuns;this.partnershipBalls+=legal?1:0;if(legal){this.currentLegalBalls++;if(this.currentLegalBalls%6===0){this.currentOver++;this.currentBall=1;this.overBalls=[];}else this.currentBall++;}},error:()=>this.message='Delivery could not be recorded'});}
  undo():void{if(!this.inningsId){this.message='Start an innings first.';return;}this.http.post(`http://localhost:8080/api/scoring/innings/${this.inningsId}/undo`,{}).subscribe({next:()=>{this.message='Last delivery undone';this.currentLegalBalls=Math.max(0,this.currentLegalBalls-1);this.currentBall=Math.max(1,this.currentBall-1);},error:()=>this.message='Nothing to undo'});}
  overs(balls:number):string{return `${Math.floor(balls/6)}.${balls%6}`;}
}
