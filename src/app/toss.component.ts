import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface MatchView { id:string; name:string; teamAId:string; teamBId:string; teamAName:string; teamBName:string; format:string; status:string; scheduledAt?:string|null; }
interface TossResponse { matchId:string; tossWinnerTeamId:string|null; decision:string|null; battingTeamId:string|null; bowlingTeamId:string|null; recorded:boolean; }
interface TossSaveResponse { matchId:string; tossWinnerTeamId:string; decision:string; battingTeamId:string; bowlingTeamId:string; }

@Component({
  selector:'app-toss',
  standalone:true,
  imports:[FormsModule,RouterLink],
  template:`
<section class="toss-page premium-motion">
  <a class="back-link reveal r1" [routerLink]="['/matches', matchId]"><span>←</span> Match command center</a>

  <header class="toss-hero reveal r2">
    <div class="hero-copy">
      <div class="eyebrow"><i></i> Matchday setup · Step 3 of 4</div>
      <h1>Set the <em>toss.</em></h1>
      <p>Confirm who won the toss and lock in the first strategic decision of the match.</p>
    </div>
    <div class="hero-status">
      <span class="status-pill" [class.complete]="saved"><i></i>{{saved?'Confirmed':'Scheduled'}}</span>
      <div class="format-chip">{{match?.format || 'Match'}}</div>
    </div>
  </header>

  @if(loading){
    <section class="state-card reveal r3"><div class="loader"></div><div><strong>Preparing toss workspace</strong><span>Loading match context…</span></div></section>
  } @else {
    <main class="toss-workspace reveal r3">
      <section class="match-strip">
        <div class="strip-team"><span class="team-mark">{{(match?.teamAName||'A').slice(0,1)}}</span><div><small>Home side</small><strong>{{match?.teamAName||'Team A'}}</strong></div></div>
        <div class="strip-middle"><b>VS</b><small>Toss decision</small></div>
        <div class="strip-team away"><div><small>Away side</small><strong>{{match?.teamBName||'Team B'}}</strong></div><span class="team-mark">{{(match?.teamBName||'B').slice(0,1)}}</span></div>
      </section>

      <section class="setup-panel">
        <div class="panel-head">
          <div><span class="section-kicker">01 · Select winner</span><h2>Who won the toss?</h2></div>
          <div class="selection-count"><b>{{winnerTeamId?'1':'0'}}</b><span>/ 1 selected</span></div>
        </div>

        <div class="winner-grid">
          <button type="button" class="winner-card" [class.selected]="winnerTeamId===match?.teamAId" [disabled]="saved" (click)="winnerTeamId=match?.teamAId||''">
            <div class="winner-top"><span class="team-avatar">{{(match?.teamAName||'A').slice(0,1)}}</span><span class="choice-indicator"><i></i></span></div>
            <strong>{{match?.teamAName||'Team A'}}</strong><small>Choose as toss winner</small>
            <span class="selected-tag">Selected</span>
          </button>
          <div class="choice-vs"><span></span><b>VS</b><span></span></div>
          <button type="button" class="winner-card" [class.selected]="winnerTeamId===match?.teamBId" [disabled]="saved" (click)="winnerTeamId=match?.teamBId||''">
            <div class="winner-top"><span class="team-avatar">{{(match?.teamBName||'B').slice(0,1)}}</span><span class="choice-indicator"><i></i></span></div>
            <strong>{{match?.teamBName||'Team B'}}</strong><small>Choose as toss winner</small>
            <span class="selected-tag">Selected</span>
          </button>
        </div>

        <div class="decision-block">
          <div class="panel-head compact">
            <div><span class="section-kicker">02 · Choose strategy</span><h2>What did they elect to do?</h2></div>
            <div class="selection-count"><b>{{decision?'1':'0'}}</b><span>/ 1 selected</span></div>
          </div>
          <div class="decision-grid">
            <button type="button" class="decision-card" [class.active]="decision==='BAT'" [disabled]="saved" (click)="decision='BAT'">
              <span class="decision-icon">B</span><div><strong>Bat first</strong><small>Set the target and control the tempo</small></div><span class="decision-check">✓</span>
            </button>
            <button type="button" class="decision-card" [class.active]="decision==='BOWL'" [disabled]="saved" (click)="decision='BOWL'">
              <span class="decision-icon bowl">F</span><div><strong>Field first</strong><small>Attack early and chase with information</small></div><span class="decision-check">✓</span>
            </button>
          </div>
        </div>

        <section class="live-summary" [class.ready]="winnerTeamId&&decision">
          <div class="summary-head"><div><span class="section-kicker">Live decision preview</span><h3>Match strategy</h3></div><span class="summary-state"><i></i>{{winnerTeamId&&decision?'Ready to confirm':'Waiting for selections'}}</span></div>
          <div class="summary-grid">
            <div><small>Toss winner</small><strong>{{winnerName}}</strong></div>
            <div><small>Elected to</small><strong>{{decision==='BAT'?'Bat first':decision==='BOWL'?'Field first':'—'}}</strong></div>
            <div><small>Opening innings</small><strong>{{decision==='BAT'?winnerName:decision==='BOWL'?(winnerTeamId===match?.teamAId?match?.teamBName:match?.teamAName):'—'}}</strong></div>
          </div>
        </section>

        @if(error){<div class="message error"><b>!</b>{{error}}</div>}
        @if(success&&!saved){<div class="message success"><b>✓</b>{{success}}</div>}

        @if(!saved){
          <footer class="actions">
            <a [routerLink]="['/matches',matchId]">Cancel setup</a>
            <button type="button" class="confirm-btn" [disabled]="saving||!winnerTeamId||!decision" (click)="confirmToss()"><span>{{saving?'Saving decision…':'Confirm toss'}}</span><b>→</b></button>
          </footer>
        } @else {
          <footer class="locked-footer"><span class="lock-dot">✓</span><div><strong>Toss confirmed</strong><small>{{winnerName}} elected to {{decision==='BAT'?'bat':'field'}} first.</small></div></footer>
        }
      </section>
    </main>

    @if(saved){
      <section class="confirmation-card reveal r4">
        <div class="confirmation-orb">✓</div>
        <div class="confirmation-copy"><span class="section-kicker">Toss recorded</span><h2>{{winnerName}} won the toss</h2><p>Elected to {{decision==='BAT'?'bat':'field'}} first. The match is ready for the opening lineup.</p></div>
        <button type="button" (click)="continueToOpeningPlayers()">Continue setup <b>→</b></button>
      </section>
    }
  }
</section>`,
  styles:[`
:host{display:block}.toss-page{max-width:1160px;padding:42px 4vw 96px;color:var(--cp-text);isolation:isolate}.back-link{display:inline-flex;align-items:center;gap:9px;color:var(--cp-text-muted);text-decoration:none;font-size:13px;font-weight:700;transition:color .2s,transform .2s}.back-link:hover{color:var(--cp-text);transform:translateX(-2px)}.back-link span{color:var(--cp-accent)}.toss-hero{position:relative;display:flex;justify-content:space-between;gap:30px;margin:34px 0 22px;padding:30px;border:1px solid var(--cp-border);border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 5%,var(--cp-surface)),var(--cp-surface));overflow:hidden}.toss-hero:after{content:"";position:absolute;width:300px;height:300px;right:-90px;bottom:-190px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--cp-accent) 16%,transparent),transparent 66%);pointer-events:none}.hero-copy{position:relative;z-index:1;max-width:690px}.eyebrow,.section-kicker{display:flex;align-items:center;gap:8px;color:var(--cp-text-muted);font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:none}.eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--cp-accent);box-shadow:0 0 14px color-mix(in srgb,var(--cp-accent) 55%,transparent)}.hero-copy h1{margin:16px 0 9px;font-size:clamp(40px,5.4vw,68px);line-height:1;letter-spacing:var(--cp-tracking-tight)}.hero-copy h1 em{font-style:normal;color:var(--cp-text-muted)}.hero-copy p{margin:0;color:var(--cp-text-muted);font-size:15px;line-height:1.65}.hero-status{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-end;gap:12px}.status-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--cp-border);border-radius:999px;color:var(--cp-text-muted);font-size:11px;font-weight:800}.status-pill i{width:6px;height:6px;border-radius:50%;background:var(--cp-text-muted);opacity:.65}.status-pill.complete{color:var(--cp-accent);border-color:color-mix(in srgb,var(--cp-accent) 28%,var(--cp-border))}.status-pill.complete i{background:var(--cp-accent);opacity:1}.format-chip{padding:9px 12px;border-radius:10px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:12px;font-weight:850}.toss-workspace{border:1px solid var(--cp-border);border-radius:22px;background:var(--cp-surface);overflow:hidden;box-shadow:0 22px 55px color-mix(in srgb,var(--cp-text) 5%,transparent)}.match-strip{display:grid;grid-template-columns:1fr 110px 1fr;align-items:center;gap:20px;padding:20px 26px;border-bottom:1px solid var(--cp-border);background:var(--cp-surface-overlay)}.strip-team{display:flex;align-items:center;gap:12px;min-width:0}.strip-team.away{justify-content:flex-end;text-align:right}.team-mark,.team-avatar{display:grid;place-items:center;flex:0 0 auto;width:40px;height:40px;border-radius:13px;border:1px solid color-mix(in srgb,var(--cp-accent) 25%,var(--cp-border));background:var(--cp-accent-soft);color:var(--cp-accent);font-weight:900}.strip-team small{display:block;margin-bottom:5px;color:var(--cp-text-muted);font-size:11px;font-weight:750}.strip-team strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.strip-middle{text-align:center}.strip-middle b{display:block;font-size:13px;letter-spacing:.12em}.strip-middle small{display:block;margin-top:4px;color:var(--cp-text-muted);font-size:11px}.setup-panel{padding:28px}.panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.panel-head h2{margin:6px 0 0;font-size:21px;letter-spacing:var(--cp-tracking-tight)}.selection-count{display:flex;align-items:baseline;gap:4px;color:var(--cp-text-muted);font-size:11px;white-space:nowrap}.selection-count b{color:var(--cp-accent);font-size:15px}.winner-grid{display:grid;grid-template-columns:1fr 46px 1fr;align-items:center;gap:16px;margin-top:18px}.winner-card{position:relative;min-height:158px;padding:18px;border:1px solid var(--cp-border);border-radius:17px;background:var(--cp-surface-overlay);color:var(--cp-text);text-align:left;cursor:pointer;overflow:hidden;transition:border-color .25s ease,transform .25s ease,box-shadow .25s ease,background .25s ease}.winner-card:hover:not(:disabled){transform:translateY(-3px);border-color:color-mix(in srgb,var(--cp-accent) 45%,var(--cp-border));box-shadow:0 16px 30px color-mix(in srgb,var(--cp-accent) 8%,transparent)}.winner-card.selected{border-color:color-mix(in srgb,var(--cp-accent) 60%,var(--cp-border));background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 10%,var(--cp-surface-overlay)),var(--cp-surface-overlay));box-shadow:0 0 0 3px color-mix(in srgb,var(--cp-accent) 7%,transparent),0 18px 36px color-mix(in srgb,var(--cp-accent) 8%,transparent)}.winner-card:disabled{cursor:default}.winner-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.team-avatar{width:42px;height:42px}.choice-indicator{width:24px;height:24px;border-radius:50%;border:1px solid var(--cp-border);display:grid;place-items:center;transition:.2s}.choice-indicator i{width:8px;height:8px;border-radius:50%;background:transparent}.selected .choice-indicator{border-color:var(--cp-accent);background:var(--cp-accent)}.selected .choice-indicator:after{content:"✓";color:var(--cp-accent-contrast,#132019);font-size:12px;font-weight:900}.winner-card strong{display:block;font-size:16px}.winner-card small{display:block;margin-top:7px;color:var(--cp-text-muted);font-size:12px}.selected-tag{position:absolute;right:17px;bottom:16px;color:var(--cp-accent);font-size:11px;font-weight:850;opacity:0;transform:translateY(4px);transition:.22s}.selected .selected-tag{opacity:1;transform:none}.choice-vs{display:grid;place-items:center;gap:7px;color:var(--cp-text-muted);font-size:11px;font-weight:850}.choice-vs:before,.choice-vs:after{content:"";width:1px;height:22px;background:var(--cp-border)}.decision-block{margin-top:30px;padding-top:27px;border-top:1px solid var(--cp-border)}.compact{margin-bottom:16px}.decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.decision-card{position:relative;display:flex;align-items:center;gap:13px;min-height:96px;padding:16px;border:1px solid var(--cp-border);border-radius:15px;background:var(--cp-surface-overlay);color:var(--cp-text);text-align:left;cursor:pointer;transition:.25s}.decision-card:hover:not(:disabled),.decision-card.active{border-color:color-mix(in srgb,var(--cp-accent) 50%,var(--cp-border));background:color-mix(in srgb,var(--cp-accent) 6%,var(--cp-surface-overlay));transform:translateY(-2px)}.decision-card:disabled{cursor:default}.decision-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:14px;font-weight:900}.decision-icon.bowl{background:color-mix(in srgb,var(--cp-info) 10%,transparent);color:var(--cp-info)}.decision-card strong{display:block;font-size:14px}.decision-card small{display:block;margin-top:5px;color:var(--cp-text-muted);font-size:12px}.decision-check{margin-left:auto;width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--cp-border);border-radius:50%;color:transparent}.active .decision-check{border-color:var(--cp-accent);background:var(--cp-accent);color:var(--cp-accent-contrast,#132019);animation:pop .32s ease}.live-summary{margin-top:24px;padding:18px;border:1px solid var(--cp-border);border-radius:17px;background:var(--cp-surface-overlay);transition:.25s}.live-summary.ready{border-color:color-mix(in srgb,var(--cp-accent) 38%,var(--cp-border));box-shadow:0 12px 28px color-mix(in srgb,var(--cp-accent) 6%,transparent)}.summary-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:15px}.summary-head h3{margin:5px 0 0;font-size:16px}.summary-state{display:flex;align-items:center;gap:7px;color:var(--cp-text-muted);font-size:11px;font-weight:750}.summary-state i{width:7px;height:7px;border-radius:50%;background:var(--cp-text-muted);opacity:.5}.ready .summary-state{color:var(--cp-accent)}.ready .summary-state i{background:var(--cp-accent);opacity:1;box-shadow:0 0 12px color-mix(in srgb,var(--cp-accent) 60%,transparent)}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.summary-grid>div{min-width:0;padding:13px;border:1px solid var(--cp-border);border-radius:12px;background:var(--cp-surface)}.summary-grid small{display:block;margin-bottom:7px;color:var(--cp-text-muted);font-size:11px;font-weight:750}.summary-grid strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.message{display:flex;align-items:center;gap:9px;margin-top:16px;padding:12px 14px;border-radius:12px;font-size:13px}.message b{display:grid;place-items:center;width:20px;height:20px;border-radius:50%}.error{border:1px solid color-mix(in srgb,var(--cp-danger) 35%,var(--cp-border));color:var(--cp-danger);background:color-mix(in srgb,var(--cp-danger) 7%,var(--cp-surface))}.success{border:1px solid color-mix(in srgb,var(--cp-accent) 30%,var(--cp-border));color:var(--cp-accent);background:color-mix(in srgb,var(--cp-accent) 6%,var(--cp-surface))}.actions{display:flex;justify-content:space-between;align-items:center;margin-top:25px}.actions>a{color:var(--cp-text-muted);text-decoration:none;font-size:13px;font-weight:700}.actions>a:hover{color:var(--cp-text)}.confirm-btn,.confirmation-card button{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:28px;padding:14px 17px;border:0;border-radius:12px;background:var(--cp-accent);color:var(--cp-accent-contrast,#132019);font-size:13px;font-weight:850;cursor:pointer;box-shadow:0 12px 24px color-mix(in srgb,var(--cp-accent) 18%,transparent);transition:transform .2s,box-shadow .2s}.confirm-btn:not(:disabled):hover,.confirmation-card button:hover{transform:translateY(-2px);box-shadow:0 18px 32px color-mix(in srgb,var(--cp-accent) 25%,transparent)}.confirm-btn:not(:disabled):before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,#fff 25%,transparent),transparent);transform:translateX(-130%);transition:transform .65s ease}.confirm-btn:not(:disabled):hover:before{transform:translateX(130%)}.confirm-btn span,.confirm-btn b{position:relative}.confirm-btn:disabled{opacity:.42;cursor:not-allowed;box-shadow:none}.locked-footer{display:flex;align-items:center;gap:11px;margin-top:24px;padding:14px;border:1px solid color-mix(in srgb,var(--cp-accent) 28%,var(--cp-border));border-radius:13px;background:color-mix(in srgb,var(--cp-accent) 5%,var(--cp-surface))}.lock-dot,.confirmation-orb{display:grid;place-items:center;flex:0 0 auto;width:30px;height:30px;border-radius:10px;background:var(--cp-accent);color:var(--cp-accent-contrast,#132019);font-weight:900}.locked-footer strong{display:block;font-size:13px}.locked-footer small{display:block;margin-top:3px;color:var(--cp-text-muted);font-size:12px}.confirmation-card{display:flex;align-items:center;gap:16px;margin-top:18px;padding:20px 22px;border:1px solid color-mix(in srgb,var(--cp-accent) 25%,var(--cp-border));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--cp-accent) 7%,var(--cp-surface)),var(--cp-surface));box-shadow:0 18px 40px color-mix(in srgb,var(--cp-text) 5%,transparent)}.confirmation-orb{width:46px;height:46px;border-radius:15px;font-size:18px}.confirmation-copy{min-width:0}.confirmation-copy h2{margin:6px 0;font-size:18px;letter-spacing:var(--cp-tracking-tight)}.confirmation-copy p{margin:0;color:var(--cp-text-muted);font-size:13px}.confirmation-card button{margin-left:auto;white-space:nowrap}.state-card{display:flex;align-items:center;gap:12px;padding:22px;border:1px solid var(--cp-border);border-radius:18px;background:var(--cp-surface)}.state-card strong{display:block;font-size:14px}.state-card span{display:block;margin-top:4px;color:var(--cp-text-muted);font-size:12px}.loader{width:20px;height:20px;border:2px solid var(--cp-border);border-top-color:var(--cp-accent);border-radius:50%;animation:spin .8s linear infinite}.premium-motion .reveal{opacity:0;transform:translateY(14px);animation:reveal .55s cubic-bezier(.22,1,.36,1) forwards}.r1{animation-delay:.02s}.r2{animation-delay:.09s}.r3{animation-delay:.16s}.r4{animation-delay:.23s}@keyframes reveal{to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pop{0%{transform:scale(.7)}65%{transform:scale(1.15)}100%{transform:scale(1)}}@media(max-width:760px){.toss-page{padding:30px 20px 80px}.toss-hero{padding:24px;flex-direction:column}.hero-status{align-items:flex-start;flex-direction:row}.match-strip{grid-template-columns:1fr 60px 1fr;padding:17px}.strip-team strong{font-size:12px}.setup-panel{padding:20px}.winner-grid{grid-template-columns:1fr}.choice-vs{grid-template-columns:1fr auto 1fr;grid-template-rows:auto}.choice-vs:before,.choice-vs:after{width:auto;height:1px}.decision-grid,.summary-grid{grid-template-columns:1fr}.confirmation-card{align-items:flex-start;flex-wrap:wrap}.confirmation-card button{margin-left:62px}}@media(max-width:480px){.panel-head{align-items:flex-start;flex-direction:column;gap:8px}.hero-copy h1{font-size:42px}.match-strip{gap:8px}.team-mark{width:34px;height:34px}.strip-team{gap:8px}.strip-team small{font-size:10px}.strip-middle small{display:none}.actions{gap:14px}.confirm-btn{gap:18px}.confirmation-card button{margin-left:0;width:100%;justify-content:space-between}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`
})
export class TossComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = 'http://localhost:8080/api';

  matchId = this.route.snapshot.paramMap.get('id') || '';
  match: MatchView | null = null;
  winnerTeamId = '';
  decision = '';
  battingTeamId = '';
  bowlingTeamId = '';
  loading = true;
  saving = false;
  saved = false;
  error = '';
  success = '';

  get winnerName(): string {
    if (!this.match || !this.winnerTeamId) return '—';
    return this.winnerTeamId === this.match.teamAId ? this.match.teamAName : this.match.teamBName;
  }

  get battingName(): string {
    if (!this.match || !this.battingTeamId) return '—';
    return this.battingTeamId === this.match.teamAId ? this.match.teamAName : this.match.teamBName;
  }

  get bowlingName(): string {
    if (!this.match || !this.bowlingTeamId) return '—';
    return this.bowlingTeamId === this.match.teamAId ? this.match.teamAName : this.match.teamBName;
  }

  constructor() {
    this.loadMatch();
  }

  loadMatch(): void {
    if (!this.matchId) { this.loading = false; this.error = 'Match id is missing.'; return; }
    this.http.get<MatchView>(`${this.api}/matches/${this.matchId}`).subscribe({
      next: match => {
        this.match = match;
        this.loadToss();
      },
      error: err => { this.loading = false; this.error = err?.error?.message || 'Unable to load the match.'; }
    });
  }

  loadToss(): void {
    this.http.get<TossResponse>(`${this.api}/matches/${this.matchId}/toss`).subscribe({
      next: response => {
        this.loading = false;
        this.saved = response.recorded;
        this.winnerTeamId = response.tossWinnerTeamId || '';
        this.decision = response.decision || '';
        this.battingTeamId = response.battingTeamId || '';
        this.bowlingTeamId = response.bowlingTeamId || '';
        if (this.saved) this.success = 'Toss already recorded. Previous selection restored.';
      },
      error: err => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to load the toss.';
      }
    });
  }

  confirmToss(): void {
    this.error = '';
    this.success = '';
    if (!this.matchId || !this.winnerTeamId || !this.decision) {
      this.error = 'Select the toss winner and decision.';
      return;
    }
    this.saving = true;
    this.http.post<TossSaveResponse>(`${this.api}/matches/${this.matchId}/toss`, {
      matchId: this.matchId,
      winnerTeamId: this.winnerTeamId,
      decision: this.decision
    }).subscribe({
      next: response => {
        this.saving = false;
        this.saved = true;
        this.battingTeamId = response.battingTeamId;
        this.bowlingTeamId = response.bowlingTeamId;
        this.success = 'Toss recorded successfully.';
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.message || 'Toss could not be recorded.';
      }
    });
  }

  continueToOpeningPlayers(): void {
    void this.router.navigate(['/dashboard/matches', this.matchId, 'opening-players']);
  }
}
