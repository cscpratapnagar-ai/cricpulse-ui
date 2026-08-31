import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PlayerStatistics {
  playerId:string; playerName:string; matches:number; runs:number; highestScore:number;
  fours:number; sixes:number; battingAverage:number; strikeRate:number;
  wickets:number; bestWickets:number; economy:number;
}
type Board = 'runs'|'average'|'strikeRate'|'wickets'|'economy';

@Component({
  selector:'app-leaderboards',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
<section class="leaderboards-page">
  <header class="hero">
    <div>
      <span class="eyebrow">PERFORMANCE INTELLIGENCE</span>
      <h1>Player <em>leaderboards</em></h1>
      <p>Live career rankings built from recorded match performance.</p>
    </div>
    <div class="hero-orbit"><span>LIVE</span><strong>{{players.length}}</strong><small>RANKED PLAYERS</small></div>
  </header>

  @if(loading){
    <section class="state"><div class="loader"></div><div><span class="eyebrow">CALCULATING</span><h2>Building the rankings</h2><p>Reading verified career performance data.</p></div></section>
  } @else if(players.length) {
    <nav class="board-tabs" aria-label="Leaderboard categories">
      @for(tab of tabs;track tab.key){
        <button type="button" [class.active]="active===tab.key" (click)="setBoard(tab.key)">
          <span>{{tab.icon}}</span>{{tab.label}}
        </button>
      }
    </nav>

    <section class="spotlight">
      @for(player of topThree;track player.playerId;let i=$index){
        <article class="podium-card" [class.first]="i===0">
          <div class="rank-mark"><span>#{{i+1}}</span></div>
          <div class="player-avatar">{{initial(player.playerName)}}</div>
          <div class="podium-copy">
            <span>{{i===0?'CURRENT LEADER':i===1?'SECOND PLACE':'THIRD PLACE'}}</span>
            <a [routerLink]="['/players',player.playerId]">{{player.playerName}}</a>
            <p>{{player.matches}} matches recorded</p>
          </div>
          <strong>{{display(player)}}<small>{{unit}}</small></strong>
          @if(i===0){<div class="leader-glow"></div>}
        </article>
      }
    </section>

    <section class="ranking-card">
      <header class="section-head">
        <div><span class="eyebrow">FULL RANKING</span><h2>{{activeLabel}}</h2></div>
        <span class="data-note">Career totals & rates</span>
      </header>
      <div class="ranking-list">
        @for(player of ranked;track player.playerId;let i=$index){
          <a class="ranking-row" [routerLink]="['/players',player.playerId]" [style.animation-delay.ms]="i*28">
            <div class="position" [class.top]="i<3">{{i+1}}</div>
            <div class="row-avatar">{{initial(player.playerName)}}</div>
            <div class="player"><strong>{{player.playerName}}</strong><span>{{player.matches}} matches · {{secondary(player)}}</span></div>
            <div class="bar-track"><i [style.width.%]="progress(player)"></i></div>
            <div class="value"><strong>{{display(player)}}</strong><span>{{unit || 'CAREER'}}</span></div>
            <span class="arrow">→</span>
          </a>
        }
      </div>
    </section>

    <section class="insight-grid">
      <article><span class="insight-icon">◉</span><div><small>BATTER TO WATCH</small><strong>{{topBy('runs')?.playerName || '—'}}</strong><p>{{topBy('runs')?.runs || 0}} career runs</p></div></article>
      <article><span class="insight-icon">◈</span><div><small>STRIKE LEADER</small><strong>{{topBy('strikeRate')?.playerName || '—'}}</strong><p>{{format(topBy('strikeRate')?.strikeRate)}} strike rate</p></div></article>
      <article><span class="insight-icon">✦</span><div><small>BOWLING LEADER</small><strong>{{topBy('wickets')?.playerName || '—'}}</strong><p>{{topBy('wickets')?.wickets || 0}} wickets taken</p></div></article>
    </section>
  } @else {
    <section class="state"><div class="empty-icon">↗</div><div><span class="eyebrow">NO RANKINGS YET</span><h2>Performance data will appear here</h2><p>Complete matches with player contributions to build the leaderboard.</p></div></section>
  }
</section>`,
  styles:[`
:host{display:block}.leaderboards-page{max-width:1220px;margin:auto;padding:34px 30px 90px;color:var(--cp-text);animation:enter .5s cubic-bezier(.22,1,.36,1)}
.hero{position:relative;min-height:215px;padding:34px 38px;display:flex;justify-content:space-between;align-items:center;overflow:hidden;border:1px solid var(--cp-border);border-radius:28px;background:radial-gradient(circle at 90% 20%,color-mix(in srgb,var(--cp-accent) 15%,transparent),transparent 32%),linear-gradient(135deg,var(--cp-surface),var(--cp-surface-raised));box-shadow:var(--cp-shadow-sm)}
.hero:after{content:'';position:absolute;right:180px;top:-120px;width:280px;height:280px;border:1px solid color-mix(in srgb,var(--cp-accent) 18%,transparent);border-radius:50%}.eyebrow{display:block;font-size:10px;font-weight:900;letter-spacing:.13em;color:var(--cp-accent)}h1{margin:8px 0 10px;font-size:clamp(40px,5vw,66px);line-height:.96;letter-spacing:-.06em}h1 em{font-style:normal;color:var(--cp-accent)}.hero p{margin:0;color:var(--cp-text-muted);font-size:15px}.hero-orbit{position:relative;z-index:1;width:116px;height:116px;border-radius:50%;display:grid;place-content:center;text-align:center;border:1px solid color-mix(in srgb,var(--cp-accent) 38%,var(--cp-border));background:color-mix(in srgb,var(--cp-accent) 7%,var(--cp-surface));box-shadow:0 0 0 12px color-mix(in srgb,var(--cp-accent) 3%,transparent)}.hero-orbit span,.hero-orbit small{font-size:9px;font-weight:900;letter-spacing:.12em;color:var(--cp-text-muted)}.hero-orbit span{color:var(--cp-accent)}.hero-orbit strong{font-size:31px;line-height:1.05;font-variant-numeric:tabular-nums}
.board-tabs{display:flex;gap:8px;margin:20px 0;overflow-x:auto;padding:3px}.board-tabs button{flex:0 0 auto;border:1px solid var(--cp-border);border-radius:12px;padding:11px 15px;background:var(--cp-surface);color:var(--cp-text-muted);font:700 12px inherit;cursor:pointer;transition:.2s}.board-tabs button span{margin-right:7px;color:var(--cp-accent)}.board-tabs button:hover{border-color:color-mix(in srgb,var(--cp-accent) 35%,var(--cp-border));color:var(--cp-text)}.board-tabs button.active{background:var(--cp-accent);border-color:var(--cp-accent);color:var(--cp-accent-contrast);box-shadow:0 8px 22px color-mix(in srgb,var(--cp-accent) 22%,transparent)}.board-tabs button.active span{color:inherit}
.spotlight{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.podium-card{position:relative;min-height:185px;padding:20px;border:1px solid var(--cp-border);border-radius:22px;background:var(--cp-surface);overflow:hidden;transition:.25s}.podium-card:hover{transform:translateY(-4px);box-shadow:var(--cp-shadow-md)}.podium-card.first{border-color:color-mix(in srgb,var(--cp-accent) 45%,var(--cp-border));background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 10%,var(--cp-surface)),var(--cp-surface))}.rank-mark{position:absolute;right:18px;top:17px;color:var(--cp-text-muted);font-size:12px;font-weight:950}.first .rank-mark{color:var(--cp-accent)}.player-avatar{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:13px;font-weight:950}.podium-copy{margin-top:14px;display:grid;gap:4px}.podium-copy>span{font-size:9px;font-weight:900;letter-spacing:.1em;color:var(--cp-text-muted)}.podium-copy a{color:var(--cp-text);font-size:17px;font-weight:850;text-decoration:none}.podium-copy p{margin:0;color:var(--cp-text-muted);font-size:11px}.podium-card>strong{position:absolute;right:19px;bottom:18px;color:var(--cp-accent);font-size:23px;font-variant-numeric:tabular-nums}.podium-card>strong small{margin-left:4px;font-size:9px;color:var(--cp-text-muted);letter-spacing:.07em}.leader-glow{position:absolute;width:110px;height:110px;border-radius:50%;right:-35px;bottom:-55px;background:var(--cp-accent);filter:blur(50px);opacity:.14}
.ranking-card{margin-top:18px;border:1px solid var(--cp-border);border-radius:24px;background:var(--cp-surface);overflow:hidden}.section-head{display:flex;justify-content:space-between;align-items:end;padding:24px 25px 17px}.section-head h2{margin:6px 0 0;font-size:24px;letter-spacing:-.03em}.data-note{font-size:11px;color:var(--cp-text-muted);padding:8px 10px;border-radius:9px;background:var(--cp-surface-raised)}.ranking-list{padding:0 8px 8px}.ranking-row{display:grid;grid-template-columns:40px 42px minmax(180px,1fr) minmax(100px,2fr) 95px 22px;align-items:center;gap:12px;padding:13px 15px;border-top:1px solid var(--cp-border);color:var(--cp-text);text-decoration:none;animation:rowIn .45s both;transition:.18s}.ranking-row:hover{background:color-mix(in srgb,var(--cp-accent) 5%,transparent);transform:translateX(2px)}.position{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--cp-surface-raised);color:var(--cp-text-muted);font-size:11px;font-weight:900}.position.top{background:var(--cp-accent-soft);color:var(--cp-accent)}.row-avatar{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--cp-surface-raised);color:var(--cp-text-muted);font-size:11px;font-weight:900}.player{display:grid;gap:4px;min-width:0}.player strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player span{font-size:11px;color:var(--cp-text-muted)}.bar-track{height:6px;border-radius:99px;background:var(--cp-surface-raised);overflow:hidden}.bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--cp-accent),color-mix(in srgb,var(--cp-accent) 55%,#fff));transition:width .7s cubic-bezier(.22,1,.36,1)}.value{text-align:right;display:grid;gap:3px}.value strong{font-size:15px;color:var(--cp-accent);font-variant-numeric:tabular-nums}.value span{font-size:8px;color:var(--cp-text-muted);letter-spacing:.1em}.arrow{color:var(--cp-text-muted);transition:.18s}.ranking-row:hover .arrow{color:var(--cp-accent);transform:translateX(3px)}
.insight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.insight-grid article{display:flex;gap:12px;padding:17px;border:1px solid var(--cp-border);border-radius:18px;background:var(--cp-surface)}.insight-icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:14px}.insight-grid div{display:grid;gap:3px;min-width:0}.insight-grid small{font-size:9px;font-weight:900;letter-spacing:.08em;color:var(--cp-text-muted)}.insight-grid strong{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.insight-grid p{margin:0;font-size:11px;color:var(--cp-text-muted)}
.state{min-height:330px;margin-top:20px;padding:40px;display:flex;align-items:center;justify-content:center;gap:18px;border:1px solid var(--cp-border);border-radius:24px;background:var(--cp-surface)}.state h2{margin:7px 0;font-size:24px}.state p{margin:0;color:var(--cp-text-muted)}.loader{width:42px;height:42px;border:2px solid var(--cp-border);border-top-color:var(--cp-accent);border-radius:50%;animation:spin .8s linear infinite}.empty-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:22px}
@keyframes enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes rowIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:900px){.spotlight{grid-template-columns:1fr}.podium-card{min-height:155px}.insight-grid{grid-template-columns:1fr}.ranking-row{grid-template-columns:35px 38px minmax(130px,1fr) 90px 18px}.bar-track{display:none}}@media(max-width:650px){.leaderboards-page{padding:22px 14px 70px}.hero{min-height:0;padding:27px 22px;align-items:flex-start}.hero-orbit{display:none}h1{font-size:43px}.board-tabs{margin:15px 0}.section-head{padding:20px 17px}.data-note{display:none}.ranking-row{padding:12px 9px;gap:8px;grid-template-columns:30px 36px minmax(0,1fr) 75px}.ranking-row .arrow{display:none}.player span{font-size:10px}.value strong{font-size:14px}.state{padding:28px 20px;align-items:flex-start;flex-direction:column}}`]
})
export class LeaderboardsComponent {
  private readonly http=inject(HttpClient);
  readonly api='http://localhost:8080/api';
  players:PlayerStatistics[]=[]; loading=true; active:Board='runs';
  readonly tabs:{key:Board;label:string;icon:string}[]=[
    {key:'runs',label:'Most Runs',icon:'↗'},
    {key:'average',label:'Best Average',icon:'◎'},
    {key:'strikeRate',label:'Strike Rate',icon:'⚡'},
    {key:'wickets',label:'Most Wickets',icon:'✦'},
    {key:'economy',label:'Best Economy',icon:'◌'}
  ];
  constructor(){this.http.get<PlayerStatistics[]>(this.api+'/players/statistics').subscribe({next:r=>{this.players=r||[];this.loading=false;},error:()=>{this.players=[];this.loading=false;}});}
  setBoard(key:Board){this.active=key;}
  get activeLabel(){return this.tabs.find(t=>t.key===this.active)?.label||'Leaderboard';}
  get unit(){return this.active==='runs'?'RUNS':this.active==='wickets'?'WKTS':this.active==='economy'?'ECON':'RATE';}
  value(p:PlayerStatistics,key:Board=this.active):number{
    switch(key){
      case 'runs': return Number(p.runs||0);
      case 'average': return Number(p.battingAverage||0);
      case 'strikeRate': return Number(p.strikeRate||0);
      case 'wickets': return Number(p.wickets||0);
      case 'economy': return Number(p.economy||0);
    }
  }
  get ranked(){const items=[...this.players];return items.sort((a,b)=>this.active==='economy'?this.economyValue(a)-this.economyValue(b):this.value(b)-this.value(a));}
  get topThree(){return this.ranked.slice(0,3);}
  economyValue(p:PlayerStatistics){return p.wickets>0?Number(p.economy||0):Number.MAX_SAFE_INTEGER;}
  progress(p:PlayerStatistics){const values=this.ranked.map(x=>this.active==='economy'?this.economyValue(x):this.value(x)).filter(Number.isFinite);const max=this.active==='economy'?Math.max(...values.filter(v=>v<Number.MAX_SAFE_INTEGER),1):Math.max(...values,1);if(this.active==='economy'){return p.wickets>0?Math.max(6,100-(this.economyValue(p)/max)*72):6;}return Math.max(6,(this.value(p)/max)*100);}
  display(p:PlayerStatistics){const v=this.active==='economy'?this.economyValue(p):this.value(p);return this.active==='runs'||this.active==='wickets'?String(Math.round(v)):this.format(v);}
  secondary(p:PlayerStatistics){if(this.active==='runs')return p.wickets+' wickets';if(this.active==='wickets')return p.runs+' runs';return p.runs+' runs · '+p.wickets+' wickets';}
  topBy(key:Board){return [...this.players].sort((a,b)=>key==='economy'?this.economyValue(a)-this.economyValue(b):this.value(b,key)-this.value(a,key))[0];}
  initial(name:string){return (name||'?').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();}
  format(v:number|undefined){return Number(v||0).toFixed(2);}
}