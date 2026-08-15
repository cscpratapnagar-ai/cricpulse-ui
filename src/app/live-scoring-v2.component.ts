import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from './ui/select-field.component';
import { LiveScore, LiveScoreService } from './live-score.service';

interface Match { id:string; name:string; status:string; format?:string; teamAId:string; teamBId:string; teamAName?:string; teamBName?:string; }
interface XIPlayer { teamId:string; playerId:string; name:string; captain:boolean; viceCaptain:boolean; wicketKeeper:boolean; }

@Component({
 selector:'app-live-scoring-v2', standalone:true,
 imports:[CommonModule,RouterLink,SelectFieldComponent],
 template:`
<section class="page">
 <header class="topbar">
  <div><span class="eyebrow">CRICPULSE · LIVE SCORING</span><h1>{{match?.name || 'Live Match'}}</h1><p>{{battingName}} <b>vs</b> {{bowlingName}} · Innings {{score?.inningsNumber || inningsNumber}}</p></div>
  <div class="top-actions"><span class="live"><i></i>{{score?.status || 'LIVE'}}</span><a [routerLink]="['/matches',matchId]">Match</a></div>
 </header>
 @if(loading){<section class="card loading">Loading scoring session…</section>}
 @else if(score){
  <section class="hero card">
   <div><span class="eyebrow">{{battingName}}</span><div class="score">{{score.runs}}<small>/{{score.wickets}}</small></div><div class="overs">{{overs(score.legalBalls)}} OVERS <b>•</b> TARGET {{score.targetRuns || '—'}}</div></div>
   <div class="hero-state"><span>CURRENT BALL</span><strong>{{ballLabel}}</strong><small>{{message || (needsBowlerChange ? 'Select a new bowler for the next over.' : 'Ready for next delivery')}}</small></div>
  </section>

  @if(score.status==='COMPLETED'){
   <section class="card completion">
    <div class="complete-icon">✓</div><div><span>INNINGS COMPLETE</span><h2>{{score.runs}}/{{score.wickets}} · {{overs(score.legalBalls)}} overs</h2><p>{{completionText}}</p></div>
    @if(score.inningsNumber===1){<button (click)="startSecondInnings()">Start 2nd Innings <b>→</b></button>}
    @else {<a [routerLink]="['/matches',matchId]">View Match Result <b>→</b></a>}
   </section>
  } @else {
   <div class="layout">
    <main>
     @if(needsBowlerChange){
      <section class="card card-pad bowler-change">
       <div><span>OVER COMPLETE</span><h2>Select next bowler</h2><p>The previous bowler cannot bowl the next over.</p></div>
       <app-select-field label="Next Bowler" placeholder="Select bowler" [options]="bowlerOptions" [(value)]="selectedBowlerId"/>
       <div class="selected-bowler" [class.ready]="!!selectedBowlerId">{{selectedBowlerId ? playerName(selectedBowlerId)+' selected' : 'Choose a bowler to continue'}}</div>
      </section>
     }

     <section class="card card-pad">
      <div class="section-head"><div><span>DELIVERY CONSOLE</span><h2>Record the next ball</h2></div><b>{{ballLabel}}</b></div>
      <div class="on-field"><div><span>STRIKER</span><strong>{{playerName(score.strikerId)}}</strong><small>{{batterRuns(score.strikerId)}} ({{batterBalls(score.strikerId)}})</small></div><div><span>NON-STRIKER</span><strong>{{playerName(score.nonStrikerId)}}</strong><small>{{batterRuns(score.nonStrikerId)}} ({{batterBalls(score.nonStrikerId)}})</small></div><div><span>BOWLER</span><strong>{{playerName(activeBowlerId)}}</strong><small>{{bowlerFigures(activeBowlerId)}}</small></div></div>
      <div class="run-grid">@for(run of runs;track run){<button class="run" [disabled]="!canDeliver" (click)="recordRuns(run)">{{run}}</button>}</div>
      <div class="extra-grid"><button [disabled]="!canDeliver" (click)="recordExtra('WIDE')">WIDE +1</button><button [disabled]="!canDeliver" (click)="recordExtra('NO_BALL')">NO BALL +1</button><button [disabled]="!canDeliver" (click)="recordExtra('BYE')">BYE 1</button><button [disabled]="!canDeliver" (click)="recordExtra('LEG_BYE')">LEG BYE 1</button><button class="danger" [disabled]="!canDeliver" (click)="openWicket()">WICKET</button><button class="muted" [disabled]="busy" (click)="undo()">UNDO</button></div>

      @if(wicketOpen){<div class="wicket-panel"><div class="section-head"><div><span>WICKET DETAILS</span><h2>Confirm dismissal</h2></div><button class="close" (click)="wicketOpen=false">×</button></div>
       <div class="wicket-grid"><app-select-field label="Dismissal" placeholder="Select wicket type" [options]="wicketOptions" [(value)]="wicketType"/>
       @if(wicketType==='RUN_OUT'){<app-select-field label="Dismissed Player" placeholder="Select dismissed player" [options]="dismissedOptions" [(value)]="dismissedPlayerId"/>}
       @if(score.wickets<9){<app-select-field label="New batter" placeholder="Select next batter" [options]="newBatterOptions" [(value)]="newBatterId"/>}</div>
       @if(score.wickets<9 && !newBatterOptions.length){<div class="error">No eligible batter remains in the Playing XI.</div>}
       @if(score.wickets===9){<div class="ten-wicket-note">This is the 10th wicket. No new batter is required.</div>}
       <button class="confirm" [disabled]="!canConfirmWicket" (click)="confirmWicket()">Confirm Wicket →</button>
      </div>}
     </section>

     <section class="card card-pad"><div class="section-head"><div><span>THIS OVER</span><h2>Ball sequence</h2></div><span class="sync">● SYNCED</span></div><div class="balls">@for(ball of currentOverBalls;track $index){<span [class.boundary]="ball==='4'||ball==='6'" [class.wicket]="ball==='W'" [class.extra]="ball==='Wd'||ball==='Nb'">{{ball}}</span>}@if(!currentOverBalls.length){<small>Awaiting first delivery</small>}</div></section>
    </main>
    <aside>
     <section class="card card-pad"><div class="section-head"><div><span>PARTNERSHIP</span><h2>Current stand</h2></div></div><div class="big-stat">{{score.partnership?.runs || 0}}<small>runs</small></div><p class="muted-text">{{score.partnership?.balls || 0}} balls</p></section>
     <section class="card card-pad"><div class="section-head"><div><span>FALL OF WICKETS</span><h2>Wickets</h2></div></div>@if(score.fallOfWickets?.length){@for(w of score.fallOfWickets;track w.wicketNumber){<div class="fow"><b>{{w.wicketNumber}}</b><span>{{playerName(w.playerId)}}</span><strong>{{w.runs}} · {{w.overNumber}}.{{w.ballNumber}}</strong></div>}}@else{<p class="muted-text">No wickets yet.</p>}</section>
     <section class="card card-pad"><div class="section-head"><div><span>LIVE VIEW</span><h2>Public scoreboard</h2></div></div><p class="muted-text">The public viewer receives the same WebSocket score stream.</p><a class="link" [href]="publicScoreUrl" target="_blank" rel="noopener noreferrer">Open live viewer →</a></section>
    </aside>
   </div>
  }
 }
 @else {<section class="card loading">Unable to load the innings.</section>}
</section>
`,
 styles:[`:host{display:block}.page{min-height:100%;max-width:1320px;margin:auto;padding:34px 4vw 90px;color:#edf8f2}.topbar{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:22px}.eyebrow,.section-head>div>span,.bowler-change>div>span,.completion>div>span{font-size:9px;font-weight:900;letter-spacing:2px;color:#789386}.topbar h1{margin:9px 0 6px;font-size:clamp(34px,5vw,60px);line-height:.95;letter-spacing:-3px}.topbar p{margin:0;color:#91aa9d;font-size:12px}.topbar p b{color:#b8f45c;padding:0 6px}.top-actions{display:flex;gap:9px;align-items:center}.top-actions a{padding:10px 13px;border:1px solid #ffffff18;border-radius:11px;color:#edf8f2;text-decoration:none;font-weight:800;font-size:11px}.live{padding:9px 12px;border-radius:999px;background:#b8f45c10;border:1px solid #b8f45c35;color:#c9ff71;font-size:10px;font-weight:900}.live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#b8f45c;margin-right:6px}.card{border:1px solid #ffffff16;border-radius:22px;background:linear-gradient(180deg,#0f271ee8,#091712f7);box-shadow:0 18px 50px #0006}.loading{padding:50px;color:#91aa9d}.hero{display:flex;justify-content:space-between;align-items:end;gap:20px;padding:28px;margin-bottom:18px}.score{font-size:clamp(76px,11vw,132px);font-weight:950;line-height:.8;letter-spacing:-8px;margin:14px 0}.score small{font-size:.38em;color:#91aa9d;letter-spacing:-2px;margin-left:7px}.overs{font-size:10px;font-weight:900;letter-spacing:1.2px;color:#789386}.overs b{color:#b8f45c;padding:0 8px}.hero-state{min-width:240px;padding:18px;border-radius:16px;background:#ffffff05;border:1px solid #ffffff12}.hero-state span{font-size:9px;color:#789386;letter-spacing:1.5px;font-weight:900}.hero-state strong{display:block;font-size:30px;margin:7px 0 2px}.hero-state small{color:#789386;line-height:1.5}.layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(270px,.7fr);gap:18px}.layout main,.layout aside{display:grid;gap:18px;align-content:start}.card-pad{padding:24px}.section-head{display:flex;justify-content:space-between;align-items:start;gap:15px;margin-bottom:18px}.section-head h2,.bowler-change h2,.completion h2{margin:5px 0 0;font-size:20px}.section-head>b{padding:7px 10px;border-radius:999px;background:#b8f45c10;border:1px solid #b8f45c30;color:#c9ff71;font-size:10px}.sync{font-size:9px;color:#b8f45c;font-weight:900}.on-field{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:15px}.on-field>div{padding:13px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff04}.on-field span{display:block;color:#789386;font-size:8px;letter-spacing:1.3px;font-weight:900}.on-field strong{display:block;margin-top:6px;font-size:14px}.on-field small{display:block;margin-top:3px;color:#91aa9d;font-size:10px}.run-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:9px}.run{height:70px;border:1px solid #b8f45c25;border-radius:15px;background:#b8f45c0d;color:#efffe5;font-size:24px;font-weight:950;cursor:pointer;transition:.18s}.run:hover:not(:disabled){transform:translateY(-3px);background:#b8f45c;color:#10251e}.run:disabled,.extra-grid button:disabled{opacity:.38;cursor:not-allowed}.extra-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.extra-grid button,.confirm{height:47px;border:1px solid #ffffff16;border-radius:12px;background:#ffffff07;color:#edf8f2;font-weight:900;font-size:10px;cursor:pointer}.extra-grid .danger{background:#ff766d;color:#21100f;border-color:#ff766d}.extra-grid .muted{color:#91aa9d}.wicket-panel,.bowler-change{margin-top:16px;padding:18px;border:1px solid #ff766d35;border-radius:16px;background:#ff766d08}.bowler-change{border-color:#b8f45c35;background:#b8f45c08}.bowler-change p{color:#789386;font-size:11px}.selected-bowler{margin-top:10px;color:#789386;font-size:10px}.selected-bowler.ready{color:#b8f45c;font-weight:900}.close{border:0;background:transparent;color:#91aa9d;font-size:24px;cursor:pointer}.wicket-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.confirm{margin-top:12px;width:100%;background:#b8f45c;color:#10251e}.error,.ten-wicket-note{margin-top:12px;padding:11px;border-radius:10px;font-size:11px}.error{border:1px solid #ff6b6030;background:#ff6b6010;color:#ffaaa4}.ten-wicket-note{border:1px solid #b8f45c30;background:#b8f45c08;color:#c9ff71}.balls{display:flex;flex-wrap:wrap;gap:8px;min-height:45px}.balls span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#ffffff08;border:1px solid #ffffff14;font-size:11px;font-weight:900}.balls .boundary{background:#b8f45c;color:#10251e;border-color:#b8f45c}.balls .extra{color:#c9ff71;border-color:#b8f45c44}.balls .wicket{background:#ff766d;color:#21100f;border-color:#ff766d}.balls small,.muted-text{color:#789386;font-size:11px}.big-stat{font-size:58px;font-weight:950;line-height:.9;letter-spacing:-3px}.big-stat small{font-size:11px;color:#789386;letter-spacing:0;margin-left:7px}.fow{display:grid;grid-template-columns:25px 1fr auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #ffffff0d;font-size:11px}.fow b{color:#b8f45c}.fow span{color:#edf8f2}.fow strong{color:#789386;font-size:9px}.link{display:inline-block;margin-top:8px;color:#b8f45c;text-decoration:none;font-weight:900;font-size:11px}.completion{display:flex;align-items:center;gap:18px;padding:24px;margin-top:18px}.completion>div:nth-child(2){flex:1}.complete-icon{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:#b8f45c;color:#10251e;font-size:22px;font-weight:950}.completion p{color:#91aa9d;font-size:11px}.completion button,.completion a{border:0;border-radius:11px;padding:14px 18px;background:#b8f45c;color:#10251e;font-weight:900;text-decoration:none;white-space:nowrap}.completion button b,.completion a b{margin-left:10px}@media(max-width:900px){.layout{grid-template-columns:1fr}.hero{align-items:stretch;flex-direction:column}.hero-state{min-width:0}.on-field{grid-template-columns:1fr}.run-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:620px){.page{padding:24px 16px 70px}.topbar{align-items:flex-start;flex-direction:column}.top-actions{width:100%;justify-content:space-between}.run-grid{grid-template-columns:repeat(3,1fr)}.run{height:62px}.extra-grid,.wicket-grid{grid-template-columns:1fr}.card-pad{padding:18px}.score{letter-spacing:-6px}.completion{align-items:flex-start;flex-direction:column}.completion button,.completion a{width:100%;text-align:center}}`]
})
export class LiveScoringV2Component {
 private readonly http=inject(HttpClient); private readonly route=inject(ActivatedRoute); private readonly router=inject(Router); private readonly liveScore=inject(LiveScoreService); private readonly api='http://localhost:8080/api';
 readonly runs=[0,1,2,3,4,5,6]; readonly wicketOptions:SelectOption[]=[{value:'BOWLED',label:'Bowled'},{value:'CAUGHT',label:'Caught'},{value:'LBW',label:'LBW'},{value:'RUN_OUT',label:'Run Out'},{value:'STUMPED',label:'Stumped'},{value:'HIT_WICKET',label:'Hit Wicket'}];
 matchId=this.route.snapshot.paramMap.get('id')||''; inningsNumber=Number(this.route.snapshot.queryParamMap.get('innings')||'1'); inningsId=this.route.snapshot.queryParamMap.get('inningsId')||''; match:Match|null=null; xi:XIPlayer[]=[]; score:LiveScore|null=null; loading=true; busy=false; message=''; wicketOpen=false; wicketType=''; newBatterId=''; dismissedPlayerId=''; selectedBowlerId='';
 constructor(){this.load()}
 get battingTeamId(){return this.score?.inningsNumber===2?this.match?.teamBId||'':this.score?.inningsNumber===1?this.match?.teamAId||'':''}
 get bowlingTeamId(){return this.score?.inningsNumber===2?this.match?.teamAId||'':this.match?.teamBId||''}
 get battingName(){if(!this.match)return 'Batting Team';return this.score?.inningsNumber===2?(this.match.teamBName||'Batting Team'):(this.match.teamAName||'Batting Team')}
 get bowlingName(){if(!this.match)return 'Bowling Team';return this.score?.inningsNumber===2?(this.match.teamAName||'Bowling Team'):(this.match.teamBName||'Bowling Team')}
 get activeBowlerId(){return this.selectedBowlerId||this.score?.currentBowlerId||''}
 get needsBowlerChange(){return !!this.score&&this.score.status==='LIVE'&&this.score.legalBalls>0&&this.score.legalBalls%6===0}
 get canDeliver(){return !!this.score&&this.score.status==='LIVE'&&!this.busy&&!!this.score.strikerId&&!!this.score.nonStrikerId&&!!this.activeBowlerId&&!this.needsBowlerChange}
 get canConfirmWicket(){if(this.busy||!this.wicketType)return false;if(this.score?.wickets===9)return true;return !!this.newBatterId&&(this.wicketType!=='RUN_OUT'||!!this.dismissedPlayerId)}
 get ballLabel(){const b=this.score?.legalBalls||0;return Math.floor(b/6)+'.'+(b%6)}
 get currentOverBalls(){return (this.score?.recentBalls||[]).filter(b=>b.overNumber===(this.score?.currentOver||0)).map(b=>b.wicketType?'W':b.extraType==='WIDE'?'Wd':b.extraType==='NO_BALL'?'Nb':String(b.totalRuns))}
 get completionText(){if(this.score?.targetRuns&&this.score.runs>=this.score.targetRuns)return 'Target reached. Match is complete.';if(this.score?.wickets===10)return 'All wickets are down. Start the second innings.';if(this.score?.totalOvers&&this.score.legalBalls>=this.score.totalOvers*6)return 'All allotted overs are complete. Start the second innings.';return 'Innings completed.'}
 get bowlerOptions():SelectOption[]{const current=this.score?.currentBowlerId;return this.xi.filter(p=>p.teamId===this.bowlingTeamId&&p.playerId!==current).map(p=>({value:p.playerId,label:p.name}))}
 get newBatterOptions():SelectOption[]{if(!this.score||this.score.wickets>=9)return [];const used=new Set([this.score.strikerId,this.score.nonStrikerId,...(this.score.batters||[]).filter(b=>b.out).map(b=>b.playerId)].filter(Boolean));return this.xi.filter(p=>p.teamId===this.battingTeamId&&!used.has(p.playerId)).map(p=>({value:p.playerId,label:p.name}))}
 get dismissedOptions():SelectOption[]{return [this.score?.strikerId,this.score?.nonStrikerId].filter(Boolean).map(id=>({value:id as string,label:this.playerName(id)}))}
 load(){if(!this.matchId){this.loading=false;this.message='Match id is missing.';return}this.http.get<Match>(this.api+'/matches/'+this.matchId).subscribe({next:m=>{this.match=m;this.loadXi()},error:e=>{this.loading=false;this.message=e?.error?.message||'Unable to load match.'}})}
 loadXi(){this.http.get<XIPlayer[]>(this.api+'/matches/'+this.matchId+'/playing-xi').subscribe({next:xi=>{this.xi=xi;this.loadScore()},error:e=>{this.loading=false;this.message=e?.error?.message||'Unable to load Playing XI.'}})}
 loadScore(){if(!this.inningsId){this.http.get<any>(this.api+'/matches/'+this.matchId+'/current-innings').subscribe({next:i=>{this.inningsId=i.inningsId||i.id;this.fetchScore()},error:e=>{this.loading=false;this.message=e?.error?.message||'No current innings.'}})}else this.fetchScore()}
 fetchScore(){this.http.get<LiveScore>(this.api+'/scoring/innings/'+this.inningsId).subscribe({next:s=>{this.score=s;this.inningsNumber=s.inningsNumber;this.selectedBowlerId='';this.loading=false;this.watch(s.inningsId)},error:e=>{this.loading=false;this.message=e?.error?.message||'Unable to load live score.'}})}
 watch(id:string){this.liveScore.watch(id).subscribe({next:s=>{this.score=s;this.inningsNumber=s.inningsNumber;if(!this.needsBowlerChange)this.selectedBowlerId=''},error:e=>{this.message=e?.message||'Live score stream disconnected.'}})}
 recordRuns(r:number){this.record({batRuns:r,extraRuns:0,extraType:null,wicketType:null,legalDelivery:true})}
 recordExtra(type:string){this.record({batRuns:0,extraRuns:1,extraType:type,wicketType:null,legalDelivery:type!=='WIDE'&&type!=='NO_BALL'})}
 record(body:any){if(!this.canDeliver||!this.score)return;this.busy=true;const payload={inningsId:this.inningsId,overNumber:this.score.currentOver??Math.floor(this.score.legalBalls/6),ballNumber:(this.score.currentBall??(this.score.legalBalls%6))+1,strikerId:this.score.strikerId,nonStrikerId:this.score.nonStrikerId,bowlerId:this.activeBowlerId,...body};this.http.post<any>(this.api+'/scoring/innings/'+this.inningsId+'/deliveries',payload).subscribe({next:()=>{this.busy=false;this.fetchScore()},error:e=>{this.busy=false;this.message=e?.error?.message||'Unable to record delivery.'}})}
 openWicket(){this.wicketOpen=true;this.wicketType='';this.newBatterId='';this.dismissedPlayerId=this.score?.strikerId||''}
 confirmWicket(){if(!this.score||!this.canConfirmWicket)return;this.busy=true;const dismissed=this.wicketType==='RUN_OUT'?(this.dismissedPlayerId||this.score.strikerId):this.score.strikerId;const payload={inningsId:this.inningsId,overNumber:this.score.currentOver??Math.floor(this.score.legalBalls/6),ballNumber:(this.score.currentBall??(this.score.legalBalls%6))+1,strikerId:this.score.strikerId,nonStrikerId:this.score.nonStrikerId,bowlerId:this.activeBowlerId,batRuns:0,extraRuns:0,extraType:null,wicketType:this.wicketType,dismissedPlayerId:dismissed,newBatterId:this.score.wickets<9?this.newBatterId:null,legalDelivery:true};this.http.post<any>(this.api+'/scoring/innings/'+this.inningsId+'/deliveries',payload).subscribe({next:()=>{this.busy=false;this.wicketOpen=false;this.fetchScore()},error:e=>{this.busy=false;this.message=e?.error?.message||'Unable to record wicket.'}})}
 undo(){if(!this.inningsId||this.busy)return;this.busy=true;this.http.post<any>(this.api+'/scoring/innings/'+this.inningsId+'/undo',{}).subscribe({next:()=>{this.busy=false;this.fetchScore()},error:e=>{this.busy=false;this.message=e?.error?.message||'Unable to undo last delivery.'}})}
 startSecondInnings(){void this.router.navigateByUrl('/matches/'+this.matchId+'/opening-players?innings=2')}
 playerName(id?:string|null){if(!id)return '—';return this.xi.find(p=>p.playerId===id)?.name||'Player'}
 batterRuns(id?:string|null){return this.score?.batters?.find(b=>b.playerId===id)?.runs??0}
 batterBalls(id?:string|null){return this.score?.batters?.find(b=>b.playerId===id)?.ballsFaced??0}
 bowlerFigures(id?:string|null){const b=this.score?.bowlers?.find(x=>x.playerId===id);return b?`${Math.floor(b.legalBalls/6)}.${b.legalBalls%6}-${b.runsConceded}-${b.wickets}`:'0.0-0-0'}
 overs(balls:number){return Math.floor(balls/6)+'.'+(balls%6)}
}
