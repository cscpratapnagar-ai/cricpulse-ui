import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';

interface Match { id:string; name:string; status:string; teamAId:string; teamBId:string; teamAName?:string; teamBName?:string; format?:string; }
interface XIPlayer { teamId:string; playerId:string; name:string; captain:boolean; viceCaptain:boolean; wicketKeeper:boolean; }
interface ExistingInnings { inningsId:string; inningsNumber:number; battingTeamId:string; bowlingTeamId?:string; runs:number; wickets:number; legalBalls:number; status:string; strikerId?:string|null; nonStrikerId?:string|null; currentBowlerId?:string|null; }
interface StartResponse { id:string; matchId:string; inningsNumber:number; battingTeamId:string; bowlingTeamId:string; status:string; }

@Component({
  selector:'app-opening-players',
  standalone:true,
  imports:[CommonModule,RouterLink,SelectFieldComponent],
  template:`
<section class="opening-page premium-motion">
  <a class="back-link" [routerLink]="['/matches',matchId,inningsNumber===1?'toss':'live']">
    <span aria-hidden="true">←</span> Match command center
  </a>

  @if(loading){
    <section class="loading-shell">
      <div class="loading-mark"></div>
      <div><strong>Preparing the innings</strong><span>Loading match and Playing XI details…</span></div>
    </section>
  } @else if(match) {
    <section class="hero-card reveal reveal-1">
      <div class="hero-copy">
        <div class="eyebrow"><i></i> Matchday setup · Step 4 of 4</div>
        <h1>Opening players</h1>
        <p>Choose the two opening batters and the first bowler before live scoring begins.</p>
      </div>
      <div class="hero-status">
        <span class="status-dot"></span>{{ match.status | titlecase }}
      </div>

      <div class="fixture-strip">
        <div class="fixture-team home">
          <div class="team-mark">A</div>
          <div><small>Batting first</small><strong>{{battingName}}</strong></div>
        </div>
        <div class="fixture-middle">
          <b>{{match.format || 'Match'}}</b>
          <span>vs</span>
          <small>Innings {{inningsNumber}}</small>
        </div>
        <div class="fixture-team away">
          <div><small>Opening bowling</small><strong>{{bowlingName}}</strong></div>
          <div class="team-mark alt">B</div>
        </div>
      </div>
    </section>

    @if(error){
      <div class="error-state">
        <span>!</span>
        <div><strong>Something needs attention</strong><p>{{error}}</p></div>
      </div>
    }

    @if(existingInnings && existingInnings.status==='LIVE'){
      <section class="resume-panel">
        <div class="resume-main">
          <div class="resume-icon">▶</div>
          <div>
            <div class="section-label">Live innings detected</div>
            <h2>Resume where you left off</h2>
            <p>{{battingName}} are currently {{existingInnings.runs}}/{{existingInnings.wickets}} after {{overs(existingInnings.legalBalls)}} overs.</p>
          </div>
        </div>
        <div class="resume-stats">
          <div><span>Score</span><strong>{{existingInnings.runs}}/{{existingInnings.wickets}}</strong></div>
          <div><span>Overs</span><strong>{{overs(existingInnings.legalBalls)}}</strong></div>
          <div><span>Innings</span><strong>{{existingInnings.inningsNumber}}</strong></div>
        </div>
        <button class="primary-action" [disabled]="resuming" (click)="resumeInnings()">
          {{resuming?'Opening…':'Resume innings'}} <b>→</b>
        </button>
      </section>
    } @else if(!error) {
      <section class="selection-progress reveal reveal-2">
        <div class="progress-leading">
          <div class="progress-step">04</div>
          <div><span>Final setup</span><strong>Select all three roles</strong></div>
        </div>
        <div class="progress-track"><i [style.width.%]="selectionProgress"></i></div>
        <div class="progress-count">{{selectedCount}} of 3 selected</div>
      </section>

      <section class="selection-workspace reveal reveal-3">
        <div class="workspace-head">
          <div>
            <div class="section-label">Innings {{inningsNumber}}</div>
            <h2>Set the opening combination</h2>
            <p>Select two different batters from {{battingName}} and one bowler from {{bowlingName}}.</p>
          </div>
          <div class="autosave"><i></i> Ready to start</div>
        </div>

        <div class="role-grid">
          <article class="role-card reveal-card" [class.complete]="strikerId">
            <div class="role-number">01</div>
            <div class="role-head"><div class="role-icon">S</div><div><span>Opening batter</span><h3>Striker</h3></div></div>
            <p>Faces the first delivery of the innings.</p>
            <app-select-field label="Select striker" name="striker" placeholder="Choose a player" [options]="battingOptions" [(value)]="strikerId"/>
          </article>

          <article class="role-card reveal-card" [class.complete]="nonStrikerId" [class.invalid]="strikerId&&strikerId===nonStrikerId">
            <div class="role-number">02</div>
            <div class="role-head"><div class="role-icon">NS</div><div><span>Opening batter</span><h3>Non-striker</h3></div></div>
            <p>Starts at the opposite end of the pitch.</p>
            <app-select-field label="Select non-striker" name="nonStriker" placeholder="Choose a different player" [options]="battingOptions" [(value)]="nonStrikerId"/>
          </article>

          <article class="role-card bowler reveal-card" [class.complete]="bowlerId">
            <div class="role-number">03</div>
            <div class="role-head"><div class="role-icon">B</div><div><span>Opening bowler</span><h3>First over</h3></div></div>
            <p>Delivers the first ball for {{bowlingName}}.</p>
            <app-select-field label="Select bowler" name="bowler" placeholder="Choose a player" [options]="bowlingOptions" [(value)]="bowlerId"/>
          </article>
        </div>

        <section class="selection-preview reveal-card" aria-label="Opening combination preview">
          <div class="preview-head">
            <div><div class="section-label">Live selection</div><h3>Opening combination</h3></div>
            <span class="preview-state" [class.ready]="canStart"><i></i>{{canStart?'Ready for live scoring':'Waiting for selections'}}</span>
          </div>
          <div class="preview-lineup">
            <div class="preview-player" [class.active]="strikerId">
              <span class="preview-role">Striker</span>
              <div class="preview-person"><div class="player-orb">{{playerInitials(strikerId)}}</div><strong>{{playerName(strikerId)||'Not selected'}}</strong></div>
            </div>
            <div class="preview-divider"><span>Opening pair</span></div>
            <div class="preview-player" [class.active]="nonStrikerId">
              <span class="preview-role">Non-striker</span>
              <div class="preview-person"><div class="player-orb">{{playerInitials(nonStrikerId)}}</div><strong>{{playerName(nonStrikerId)||'Not selected'}}</strong></div>
            </div>
            <div class="preview-bowler" [class.active]="bowlerId">
              <span class="preview-role">Opening bowler</span>
              <div class="preview-person"><div class="player-orb bowl">{{playerInitials(bowlerId)}}</div><strong>{{playerName(bowlerId)||'Not selected'}}</strong></div>
            </div>
          </div>
        </section>

        @if(strikerId&&strikerId===nonStrikerId){
          <div class="inline-warning"><span>!</span> Striker and non-striker must be different players.</div>
        }

        <div class="action-bar">
          <a [routerLink]="['/matches',matchId,'toss']">← Back to toss</a>
          <div class="action-copy"><span>All selections are required</span><strong>{{selectedCount}} / 3 complete</strong></div>
          <button class="primary-action" [disabled]="!canStart||starting" (click)="startInnings()">
            {{starting?'Starting innings…':'Start live scoring'}} <b>→</b>
          </button>
        </div>
      </section>
    }
  }
</section>`,
  styles:[`
:host{display:block}.opening-page{max-width:1180px;margin:0 auto;padding:28px 4vw 100px;color:var(--cp-text)}
.premium-motion{isolation:isolate}.reveal{opacity:0;transform:translateY(14px);animation:cpReveal .58s cubic-bezier(.22,1,.36,1) forwards}.reveal-1{animation-delay:.03s}.reveal-2{animation-delay:.11s}.reveal-3{animation-delay:.18s}.reveal-card{animation:cpCardIn .52s cubic-bezier(.22,1,.36,1) both}.role-grid .reveal-card:nth-child(1){animation-delay:.24s}.role-grid .reveal-card:nth-child(2){animation-delay:.31s}.role-grid .reveal-card:nth-child(3){animation-delay:.38s}.selection-preview.reveal-card{animation-delay:.44s}@keyframes cpReveal{to{opacity:1;transform:translateY(0)}}@keyframes cpCardIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}.back-link{display:inline-flex;align-items:center;gap:9px;margin-bottom:22px;color:var(--cp-text-muted);text-decoration:none;transition:color .2s ease,transform .2s ease}.back-link:hover{color:var(--cp-text);transform:translateX(-2px)}
.hero-card{position:relative;overflow:hidden;isolation:isolate;padding:30px;border:1px solid var(--cp-border);border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 6%,var(--cp-surface)),var(--cp-surface));box-shadow:var(--cp-shadow-sm)}.hero-card:before{content:"";position:absolute;inset:auto -8% -55% auto;width:430px;height:430px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--cp-info) 10%,transparent),transparent 65%);filter:blur(2px);animation:cpFloat 9s ease-in-out infinite;pointer-events:none}.hero-card:after{content:"";position:absolute;width:380px;height:380px;right:-180px;top:-250px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--cp-accent) 13%,transparent),transparent 68%);pointer-events:none}.hero-copy{position:relative;z-index:1;max-width:690px}.eyebrow,.section-label{display:flex;align-items:center;gap:8px;color:var(--cp-accent)}.eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--cp-accent);box-shadow:0 0 12px color-mix(in srgb,var(--cp-accent) 60%,transparent)}.hero-copy h1{margin:12px 0 7px;font-size:clamp(34px,5vw,56px);font-weight:850}.hero-copy p{margin:0;color:var(--cp-text-muted);max-width:620px}.hero-status{position:absolute;right:28px;top:28px;z-index:2;display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid var(--cp-border);border-radius:999px;background:color-mix(in srgb,var(--cp-surface) 85%,transparent);font-size:11px;font-weight:800;color:var(--cp-text-muted)}.status-dot{width:6px;height:6px;border-radius:50%;background:var(--cp-accent)}
.fixture-strip{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:22px;margin-top:28px;padding:17px 20px;border:1px solid var(--cp-border);border-radius:17px;background:color-mix(in srgb,var(--cp-bg) 24%,transparent)}.fixture-team{display:flex;align-items:center;gap:12px;min-width:0}.fixture-team.away{justify-content:flex-end;text-align:right}.team-mark{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--cp-accent) 34%,var(--cp-border));border-radius:12px;background:var(--cp-accent-soft);color:var(--cp-accent);font-weight:900}.team-mark.alt{color:var(--cp-info);border-color:color-mix(in srgb,var(--cp-info) 32%,var(--cp-border));background:color-mix(in srgb,var(--cp-info) 9%,transparent)}.fixture-team small{display:block;margin-bottom:4px;color:var(--cp-text-muted);font-size:11px;font-weight:700}.fixture-team strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.fixture-middle{text-align:center}.fixture-middle b{display:block;color:var(--cp-accent);font-size:12px}.fixture-middle span{display:block;margin:4px 0;font-size:15px;font-weight:850}.fixture-middle small{color:var(--cp-text-muted);font-size:11px}
.selection-progress{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;align-items:center;gap:24px;margin:18px 0;padding:17px 22px;border:1px solid var(--cp-border);border-radius:18px;background:var(--cp-surface);box-shadow:var(--cp-shadow-sm)}.progress-leading{display:flex;align-items:center;gap:12px}.progress-step{width:42px;height:42px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--cp-accent) 28%,var(--cp-border));border-radius:12px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:11px;font-weight:900}.progress-leading span{display:block;margin-bottom:3px;color:var(--cp-text-muted);font-size:11px;font-weight:700}.progress-leading strong{font-size:14px}.progress-track{height:7px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--cp-text) 8%,transparent)}.progress-track i{display:block;height:100%;min-width:3px;border-radius:inherit;background:var(--cp-accent);box-shadow:0 0 14px color-mix(in srgb,var(--cp-accent) 55%,transparent);transition:width .35s ease}.progress-count{color:var(--cp-text-muted);font-size:12px;font-weight:750}
.selection-workspace{padding:26px;border:1px solid var(--cp-border);border-radius:24px;background:var(--cp-surface);box-shadow:var(--cp-shadow-sm)}.workspace-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--cp-border)}.workspace-head h2{margin:7px 0 6px;font-size:26px;letter-spacing:var(--cp-tracking-tight)}.workspace-head p{margin:0;color:var(--cp-text-muted);font-size:14px;line-height:1.55}.autosave{display:inline-flex;align-items:center;gap:7px;padding:9px 11px;border:1px solid var(--cp-border);border-radius:10px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:11px;font-weight:800;white-space:nowrap}.autosave i{width:6px;height:6px;border-radius:50%;background:var(--cp-accent)}
.role-grid{position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px}.role-grid:has(.select-trigger.open){z-index:30}.role-card{position:relative;overflow:visible;padding:21px;border:1px solid var(--cp-border);border-radius:18px;background:linear-gradient(180deg,color-mix(in srgb,var(--cp-surface-raised) 48%,var(--cp-surface)),var(--cp-surface));transition:border-color .25s ease,transform .25s ease,box-shadow .25s ease}.role-card:hover{transform:translateY(-3px);border-color:var(--cp-border-strong);box-shadow:0 14px 30px color-mix(in srgb,#000 8%,transparent)}.role-card.complete{border-color:color-mix(in srgb,var(--cp-accent) 42%,var(--cp-border));box-shadow:inset 0 1px 0 color-mix(in srgb,var(--cp-accent) 10%,transparent),0 12px 28px color-mix(in srgb,var(--cp-accent) 7%,transparent);animation:cpComplete .45s cubic-bezier(.22,1,.36,1) both}.role-card.invalid{border-color:color-mix(in srgb,var(--cp-danger) 55%,var(--cp-border))}.role-number{position:absolute;right:18px;top:17px;color:var(--cp-text-muted);font-size:11px;font-weight:850}.role-head{display:flex;align-items:center;gap:11px}.role-icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--cp-border);border-radius:13px;background:var(--cp-surface-overlay);color:var(--cp-accent);font-size:12px;font-weight:900}.bowler .role-icon{color:var(--cp-info)}.role-head span{display:block;margin-bottom:3px;color:var(--cp-text-muted);font-size:11px;font-weight:750}.role-head h3{margin:0;font-size:17px}.role-card>p{min-height:38px;margin:16px 0;color:var(--cp-text-muted);font-size:12px;line-height:1.5}.selection-preview{position:relative;z-index:1;margin-top:18px;padding:18px 20px;border:1px solid var(--cp-border);border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 4%,var(--cp-surface)),var(--cp-surface));transition:border-color .25s ease,box-shadow .25s ease}.preview-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:16px}.preview-head h3{margin:4px 0 0;font-size:16px;letter-spacing:var(--cp-tracking-tight)}.preview-state{display:inline-flex;align-items:center;gap:7px;color:var(--cp-text-muted);font-size:11px;font-weight:750}.preview-state i{width:7px;height:7px;border-radius:50%;background:var(--cp-text-muted);opacity:.5}.preview-state.ready{color:var(--cp-accent)}.preview-state.ready i{background:var(--cp-accent);opacity:1;box-shadow:0 0 12px color-mix(in srgb,var(--cp-accent) 60%,transparent)}.preview-lineup{display:grid;grid-template-columns:1fr auto 1fr 1fr;gap:14px;align-items:center}.preview-player,.preview-bowler{min-width:0;padding:13px;border:1px solid var(--cp-border);border-radius:13px;background:var(--cp-surface-overlay);transition:transform .2s ease,border-color .2s ease,background .2s ease}.preview-player.active,.preview-bowler.active{border-color:color-mix(in srgb,var(--cp-accent) 34%,var(--cp-border));background:color-mix(in srgb,var(--cp-accent) 5%,var(--cp-surface-overlay));animation:cpComplete .38s cubic-bezier(.22,1,.36,1) both}.preview-role{display:block;margin-bottom:8px;color:var(--cp-text-muted);font-size:11px;font-weight:750}.preview-person{display:flex;align-items:center;gap:9px;min-width:0}.preview-person strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.player-orb{width:28px;height:28px;flex:0 0 28px;display:grid;place-items:center;border-radius:9px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:10px;font-weight:900}.player-orb.bowl{background:color-mix(in srgb,var(--cp-info) 10%,transparent);color:var(--cp-info)}.preview-divider{display:grid;place-items:center;color:var(--cp-text-muted);font-size:11px;font-weight:700;text-align:center}.preview-divider:before{content:"";display:block;width:1px;height:14px;background:var(--cp-border);margin:auto}.preview-divider:after{content:"";display:block;width:1px;height:14px;background:var(--cp-border);margin:auto}@media(max-width:900px){.preview-lineup{grid-template-columns:1fr 1fr}.preview-divider{display:none}.preview-bowler{grid-column:1/-1}}@media(max-width:620px){.preview-head{align-items:flex-start;flex-direction:column}.preview-lineup{grid-template-columns:1fr}.preview-bowler{grid-column:auto}}
.inline-warning{display:flex;align-items:center;gap:9px;margin-top:16px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--cp-danger) 38%,var(--cp-border));border-radius:12px;background:color-mix(in srgb,var(--cp-danger) 8%,transparent);color:var(--cp-danger);font-size:12px;font-weight:700}.inline-warning span{display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:var(--cp-danger);color:#fff;font-size:11px;font-weight:900}
.action-bar{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:24px;margin-top:24px;padding-top:22px;border-top:1px solid var(--cp-border)}.action-bar>a{color:var(--cp-text-muted);text-decoration:none;font-size:13px;font-weight:750}.action-copy{text-align:right}.action-copy span{display:block;color:var(--cp-text-muted);font-size:11px}.action-copy strong{display:block;margin-top:3px;font-size:13px}.primary-action{display:inline-flex;align-items:center;justify-content:center;gap:18px;padding:14px 18px;border:1px solid transparent;border-radius:12px;background:var(--cp-accent);color:var(--cp-accent-contrast);font-size:13px;font-weight:850;cursor:pointer;box-shadow:0 10px 24px color-mix(in srgb,var(--cp-accent) 18%,transparent);transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease}.primary-action:not(:disabled){position:relative;overflow:hidden}.primary-action:not(:disabled):before{content:"";position:absolute;inset:0;transform:translateX(-120%);background:linear-gradient(90deg,transparent,color-mix(in srgb,#fff 28%,transparent),transparent);transition:transform .6s ease}.primary-action:hover:not(:disabled):before{transform:translateX(120%)}.primary-action:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 15px 30px color-mix(in srgb,var(--cp-accent) 25%,transparent)}.primary-action:disabled{opacity:.48;cursor:not-allowed}
.resume-panel{display:grid;grid-template-columns:minmax(300px,1fr) auto auto;align-items:center;gap:24px;margin-top:18px;padding:24px;border:1px solid color-mix(in srgb,var(--cp-accent) 28%,var(--cp-border));border-radius:22px;background:linear-gradient(135deg,var(--cp-accent-soft),var(--cp-surface));box-shadow:var(--cp-shadow-sm)}.resume-main{display:flex;align-items:center;gap:14px}.resume-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:var(--cp-accent);color:var(--cp-accent-contrast);font-size:14px}.resume-main h2{margin:5px 0;font-size:22px}.resume-main p{margin:0;color:var(--cp-text-muted);font-size:13px}.resume-stats{display:flex;gap:20px}.resume-stats>div{min-width:64px}.resume-stats span{display:block;color:var(--cp-text-muted);font-size:11px}.resume-stats strong{display:block;margin-top:5px;font-size:17px}.error-state{display:flex;align-items:flex-start;gap:11px;margin-top:18px;padding:15px 17px;border:1px solid color-mix(in srgb,var(--cp-danger) 40%,var(--cp-border));border-radius:14px;background:color-mix(in srgb,var(--cp-danger) 7%,var(--cp-surface));color:var(--cp-danger)}.error-state>span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--cp-danger);color:#fff;font-weight:900}.error-state strong{font-size:13px}.error-state p{margin:4px 0 0;color:var(--cp-text-muted);font-size:12px}.loading-shell{display:flex;align-items:center;gap:14px;padding:26px;border:1px solid var(--cp-border);border-radius:18px;background:var(--cp-surface);box-shadow:var(--cp-shadow-sm)}.loading-mark{width:38px;height:38px;border:3px solid var(--cp-border);border-top-color:var(--cp-accent);border-radius:50%;animation:spin .85s linear infinite}.loading-shell strong,.loading-shell span{display:block}.loading-shell span{margin-top:4px;color:var(--cp-text-muted);font-size:12px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes cpFloat{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-28px,-18px,0) scale(1.08)}}@keyframes cpComplete{0%{transform:scale(.985)}55%{transform:scale(1.012)}100%{transform:scale(1)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
@media(max-width:900px){.role-grid{grid-template-columns:1fr}.role-card>p{min-height:0}.resume-panel{grid-template-columns:1fr}.resume-stats{justify-content:flex-start}.hero-status{position:static;margin-top:18px;width:max-content}.fixture-strip{grid-template-columns:1fr}.fixture-middle{display:flex;align-items:center;justify-content:center;gap:10px}.fixture-middle span{margin:0}.fixture-team.away{justify-content:flex-start;text-align:left;flex-direction:row-reverse}.action-bar{grid-template-columns:1fr auto}.action-copy{display:none}}
@media(max-width:620px){.opening-page{padding:22px 16px 80px}.hero-card{padding:22px 18px;border-radius:20px}.fixture-strip{padding:15px}.selection-progress{grid-template-columns:1fr;gap:13px}.progress-count{text-align:left}.selection-workspace{padding:20px 16px;border-radius:20px}.workspace-head{display:block}.autosave{margin-top:15px}.action-bar{grid-template-columns:1fr}.action-bar .primary-action{width:100%}.resume-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.resume-main{align-items:flex-start}.back-link{margin-bottom:18px}}
`]
})
export class OpeningPlayersComponent {
 private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly api='http://localhost:8080/api';
 matchId=this.route.snapshot.paramMap.get('id')||'';inningsNumber=Number(this.route.snapshot.queryParamMap.get('innings')||'1');match:Match|null=null;xi:XIPlayer[]=[];loading=true;error='';strikerId='';nonStrikerId='';bowlerId='';battingTeamId='';bowlingTeamId='';existingInnings:ExistingInnings|null=null;resuming=false;starting=false;
 constructor(){if(![1,2].includes(this.inningsNumber))this.inningsNumber=1;this.load()}
 get battingName(){return this.match?(this.battingTeamId===this.match.teamAId?this.match.teamAName:this.match.teamBName)||'Batting Team':'Batting Team'}
 get bowlingName(){return this.match?(this.bowlingTeamId===this.match.teamAId?this.match.teamAName:this.match.teamBName)||'Bowling Team':'Bowling Team'}
 get battingOptions():SelectOption[]{return this.xi.filter(p=>p.teamId===this.battingTeamId).map(p=>({value:p.playerId,label:p.name}))}
 get bowlingOptions():SelectOption[]{return this.xi.filter(p=>p.teamId===this.bowlingTeamId).map(p=>({value:p.playerId,label:p.name}))}
 get selectedCount(){return [this.strikerId,this.nonStrikerId,this.bowlerId].filter(Boolean).length}
 get selectionProgress(){return (this.selectedCount/3)*100}
 playerName(id:string){return this.xi.find(player=>player.playerId===id)?.name||''}
 playerInitials(id:string){const name=this.playerName(id);return name?name.split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase():'+'}
 get canStart(){return !!this.matchId&&!!this.strikerId&&!!this.nonStrikerId&&!!this.bowlerId&&this.strikerId!==this.nonStrikerId}
 load(){if(!this.matchId){this.loading=false;this.error='Match id is missing.';return}this.http.get<Match>(this.api+'/matches/'+this.matchId).subscribe({next:m=>{this.match=m;this.loadToss()},error:e=>{this.loading=false;this.error=e?.error?.message||'Unable to load match.'}})}
 loadToss(){this.http.get<any>(this.api+'/matches/'+this.matchId+'/toss').subscribe({next:t=>{if(!t.recorded){void this.router.navigateByUrl('/matches/'+this.matchId+'/toss');return}const firstBat=t.battingTeamId;const firstBowl=t.bowlingTeamId;this.battingTeamId=this.inningsNumber===1?firstBat:firstBowl;this.bowlingTeamId=this.inningsNumber===1?firstBowl:firstBat;this.loadXiAndExisting()},error:e=>{this.loading=false;this.error=e?.error?.message||'Unable to load toss.'}})}
 loadXiAndExisting(){this.http.get<XIPlayer[]>(this.api+'/matches/'+this.matchId+'/playing-xi').subscribe({next:xi=>{this.xi=xi;this.checkCurrentInnings()},error:e=>{this.loading=false;this.error=e?.error?.message||'Unable to load Playing XI.'}})}
 checkCurrentInnings(){this.http.get<ExistingInnings>(this.api+'/matches/'+this.matchId+'/current-innings').subscribe({next:innings=>{this.existingInnings=innings;if(innings.status==='LIVE'){if(!innings.bowlingTeamId){this.loading=false;this.error='Current innings is missing the bowling team.';return}this.inningsNumber=innings.inningsNumber;this.battingTeamId=innings.battingTeamId;this.bowlingTeamId=innings.bowlingTeamId;this.loading=false;return}if(innings.status==='COMPLETED'&&innings.inningsNumber===1){this.inningsNumber=2;this.battingTeamId=innings.bowlingTeamId||this.battingTeamId;this.bowlingTeamId=innings.battingTeamId;this.existingInnings=null;this.error='';this.loading=false;return}if(innings.status==='COMPLETED'&&innings.inningsNumber>=2){this.loading=false;this.error='Both innings are already completed. This match is finished.';return}this.loading=false},error:e=>{if(e?.status===404){this.existingInnings=null;this.loading=false}else{this.loading=false;this.error=e?.error?.message||'Unable to check current innings.'}}})}
 resumeInnings(){if(!this.existingInnings||this.resuming)return;this.resuming=true;void this.router.navigateByUrl('/matches/'+this.matchId+'/live-scoring?inningsId='+encodeURIComponent(this.existingInnings.inningsId))}
 startInnings(){if(!this.canStart||this.starting)return;this.starting=true;this.error='';this.http.post<StartResponse>(this.api+'/scoring/innings',{matchId:this.matchId,inningsNumber:this.inningsNumber,battingTeamId:this.battingTeamId,strikerId:this.strikerId,nonStrikerId:this.nonStrikerId,currentBowlerId:this.bowlerId}).subscribe({next:r=>{this.starting=false;const url='/matches/'+this.matchId+'/live-scoring?inningsId='+encodeURIComponent(r.id);void this.router.navigateByUrl(url).then(ok=>{if(!ok)this.error='Innings started, but Live Scoring route could not be opened.'})},error:e=>{this.starting=false;const msg=String(e?.error?.message||'').toLowerCase();if(e?.status===400&&msg.includes('already completed')&&this.inningsNumber===1){this.inningsNumber=2;const oldBat=this.battingTeamId;this.battingTeamId=this.bowlingTeamId;this.bowlingTeamId=oldBat;this.existingInnings=null;this.error='';return}this.error=e?.error?.message||'Unable to start innings.'}})}
 overs(balls:number){return Math.floor(balls/6)+'.'+(balls%6)}
}
