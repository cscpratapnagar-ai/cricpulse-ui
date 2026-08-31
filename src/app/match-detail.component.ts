import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  scheduledAt?: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (loading) {
      <section class="match-page"><div class="loading-card"><div class="shimmer line sm"></div><div class="shimmer line xl"></div><div class="shimmer line md"></div><div class="loading-score"><div class="shimmer orb"></div><div class="shimmer line"></div><div class="shimmer orb"></div></div></div></section>
    } @else if (match) {
      <section class="match-page">
        <div class="ambient glow-a"></div><div class="ambient glow-b"></div>
        <a class="back" routerLink="/matches"><span>←</span> ALL MATCHES</a>

        <section class="match-hero">
          <div class="hero-top">
            <div class="eyebrow"><i></i> MATCH COMMAND CENTER</div>
            <div class="status" [class.live]="match.status === 'LIVE'" [class.done]="match.status === 'COMPLETED'"><span></span>{{ match.status }}</div>
          </div>
          <div class="hero-title-row">
            <div class="hero-copy"><div class="match-ref">MATCH OVERVIEW</div><h1 [title]="match.name || 'Match'">{{ displayMatchTitle(match.name) }}</h1><p>Everything for this fixture, from match setup to the final delivery.</p></div>
            <div class="hero-actions">
              @if (match.status === 'COMPLETED') {
                <a class="primary" [routerLink]="['/matches', match.id, 'result']">View result <b>→</b></a>
              } @else if (match.status === 'LIVE') {
                <a class="primary live-btn" [routerLink]="['/matches', match.id, 'live-scoring']"><i></i> Live scoring <b>→</b></a>
              } @else {
                <a class="primary" [routerLink]="['/matches', match.id, 'playing-xi']">Continue setup <b>→</b></a>
              }
              <a class="icon-action" [routerLink]="['/matches', match.id, 'scorecard']" title="Scorecard">▤</a>
            </div>
          </div>

          <div class="fixture-board">
            <div class="team home"><div class="team-mark">{{ (match.teamAName || 'A').slice(0,1) }}</div><div class="team-copy"><span>HOME SIDE</span><strong [title]="match.teamAName || 'Team A'">{{ match.teamAName || 'Team A' }}</strong></div></div>
            <div class="fixture-core"><div class="vs">VS</div><div class="format">{{ match.format }}</div><div class="date">{{ displayDate(match.scheduledAt) }}</div></div>
            <div class="team away"><div class="team-copy"><span>AWAY SIDE</span><strong [title]="match.teamBName || 'Team B'">{{ match.teamBName || 'Team B' }}</strong></div><div class="team-mark alt">{{ (match.teamBName || 'B').slice(0,1) }}</div></div>
          </div>
        </section>

        <section class="command-grid">
          <article class="panel setup-panel">
            <div class="panel-head"><div><span class="kicker">MATCH CONTROL</span><h2>Matchday workflow</h2></div><span class="head-state">{{ match.status }}</span></div>
            <div class="workflow">
              <a class="flow-step" [routerLink]="['/matches', match.id, 'playing-xi']"><div class="step-no">01</div><div class="flow-copy"><b>Playing XI</b><span>Confirm both squads</span></div><i>→</i></a>
              <a class="flow-step" [routerLink]="['/matches', match.id, 'toss']"><div class="step-no">02</div><div class="flow-copy"><b>Toss & decision</b><span>Record the match call</span></div><i>→</i></a>
              <a class="flow-step" [routerLink]="['/matches', match.id, 'opening-players']"><div class="step-no">03</div><div class="flow-copy"><b>Opening players</b><span>Set striker, non-striker & bowler</span></div><i>→</i></a>
              <a class="flow-step accent-step" [routerLink]="['/matches', match.id, 'live-scoring']"><div class="step-no">04</div><div class="flow-copy"><b>Live scoring</b><span>Launch the scoring console</span></div><i>→</i></a>
            </div>
          </article>

          <article class="panel intelligence-panel">
            <div class="panel-head"><div><span class="kicker">MATCH INTELLIGENCE</span><h2>Fixture pulse</h2></div><span class="pulse"><i></i> READY</span></div>
            <div class="metrics">
              <div><span>FORMAT</span><b>{{ match.format }}</b><small>Match configuration</small></div>
              <div><span>SCHEDULE</span><b>{{ match.scheduledAt ? 'SET' : 'PENDING' }}</b><small>{{ match.scheduledAt ? 'Date confirmed' : 'Awaiting date' }}</small></div>
              <div><span>STATUS</span><b>{{ match.status }}</b><small>Current lifecycle</small></div>
              <div><span>MATCH ID</span><b class="id-value">{{ match.id }}</b><small>Fixture reference</small></div>
            </div>
          </article>
        </section>

        <section class="lower-grid">
          <article class="panel next-panel">
            <div class="panel-head"><div><span class="kicker">NEXT ACTION</span><h2>Take control</h2></div></div>
            @if (match.status === 'SCHEDULED') {
              <p>Complete the match setup in sequence. Your teams are locked in; now prepare the playing sides.</p>
              <a class="action-link" [routerLink]="['/matches', match.id, 'playing-xi']">Set Playing XI <b>→</b></a>
            } @else if (match.status === 'LIVE') {
              <p>The fixture is in progress. Open the live command center to continue recording every delivery.</p>
              <a class="action-link" [routerLink]="['/matches', match.id, 'live-scoring']">Open Live Scoring <b>→</b></a>
            } @else {
              <p>The match is complete. Review the result, scorecard and performance intelligence.</p>
              <a class="action-link" [routerLink]="['/matches', match.id, 'result']">Review Result <b>→</b></a>
            }
          </article>
          <article class="panel quick-panel">
            <div class="panel-head"><div><span class="kicker">QUICK ACCESS</span><h2>Match views</h2></div></div>
            <div class="quick-links">
              <a [routerLink]="['/matches', match.id, 'scorecard']"><span>▤</span> Scorecard <b>→</b></a>
              <a [routerLink]="['/matches', match.id, 'statistics']"><span>◈</span> Statistics <b>→</b></a>
              <a [routerLink]="['/matches', match.id, 'live']"><span>◉</span> Live Center <b>→</b></a>
            </div>
          </article>
        </section>
      </section>
    } @else {
      <section class="match-page"><div class="empty"><div class="empty-orb">!</div><div class="eyebrow"><i></i> MATCH NOT FOUND</div><h1>This fixture isn't available.</h1><p>The match may have been removed or this link is no longer valid.</p><a class="primary" routerLink="/matches">Back to matches <b>→</b></a></div></section>
    }
  `,
  styles: [`
:host{display:block;--ink:var(--cp-text);--muted:var(--cp-text-muted);--line:var(--cp-border);--line-strong:var(--cp-border-strong);--surface:var(--cp-surface);--raised:var(--cp-surface-raised);--accent:var(--cp-accent);--accent-soft:var(--cp-accent-soft)}
.match-page{position:relative;isolation:isolate;max-width:1240px;margin:0 auto;padding:42px 4vw 100px;overflow:hidden}.ambient{position:absolute;z-index:-1;width:360px;height:360px;border-radius:50%;filter:blur(90px);opacity:.09;pointer-events:none}.glow-a{background:var(--accent);right:-180px;top:120px}.glow-b{background:#5b9fff;left:-220px;bottom:80px}.back{display:inline-flex;align-items:center;gap:9px;margin-bottom:34px;color:var(--muted);text-decoration:none;font-size:9px;font-weight:900;letter-spacing:1.6px;transition:.2s}.back span{font-size:16px}.back:hover{color:var(--accent);transform:translateX(-2px)}
.match-hero{padding:28px;border:1px solid var(--line);border-radius:25px;background:linear-gradient(145deg,var(--surface),var(--raised));box-shadow:0 25px 65px color-mix(in srgb,#000 11%,transparent)}.hero-top,.hero-title-row{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.eyebrow,.kicker{display:flex;align-items:center;gap:8px;color:var(--accent);font-size:8px;font-weight:900;letter-spacing:1.8px}.eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}.status{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:1px}.status span{width:6px;height:6px;border-radius:50%;background:var(--muted)}.status.live{border-color:color-mix(in srgb,#ff626c 32%,var(--line));color:#e9636b}.status.live span{background:#e9636b;box-shadow:0 0 0 4px color-mix(in srgb,#e9636b 14%,transparent);animation:blink 1.5s infinite}.status.done{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 25%,var(--line))}.status.done span{background:var(--accent)}
.hero-title-row{align-items:flex-end;margin-top:18px}.hero-copy{min-width:0;max-width:760px}.match-ref{margin-bottom:8px;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:1.35px}.hero-title-row h1{margin:0 0 8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-size:clamp(28px,3.2vw,46px);line-height:1.08;letter-spacing:-1.8px;font-weight:800}.hero-title-row p{margin:0;color:var(--muted);font-size:12px;line-height:1.55}.hero-actions{display:flex;gap:8px;align-items:center}.primary,.icon-action,.action-link{transition:.2s;text-decoration:none}.primary{height:45px;padding:0 15px;border-radius:11px;display:inline-flex;align-items:center;gap:13px;background:var(--accent);color:var(--cp-accent-contrast);font-size:10px;font-weight:900;box-shadow:0 13px 28px color-mix(in srgb,var(--accent) 16%,transparent)}.primary:hover,.action-link:hover{transform:translateY(-2px);box-shadow:0 17px 34px color-mix(in srgb,var(--accent) 24%,transparent)}.primary b,.action-link b{font-size:15px}.live-btn i{width:7px;height:7px;border-radius:50%;background:currentColor;animation:blink 1.3s infinite}.icon-action{width:45px;height:45px;border:1px solid var(--line);border-radius:11px;display:grid;place-items:center;background:var(--surface);color:var(--muted);font-size:16px}.icon-action:hover{border-color:var(--accent);color:var(--accent)}
.fixture-board{display:grid;grid-template-columns:1fr 180px 1fr;align-items:center;gap:20px;margin-top:28px;padding:22px;border:1px solid var(--line);border-radius:18px;background:color-mix(in srgb,var(--cp-text) 2%,transparent)}.team{display:flex;align-items:center;gap:13px;min-width:0}.team-copy{min-width:0;max-width:100%}.team.away{justify-content:flex-end;text-align:right}.team-mark{width:48px;height:48px;flex:0 0 48px;border-radius:15px;display:grid;place-items:center;background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 25%,var(--line));color:var(--accent);font-size:18px;font-weight:900}.team-mark.alt{background:color-mix(in srgb,#5799e8 12%,transparent);border-color:color-mix(in srgb,#5799e8 25%,var(--line));color:#5799e8}.team span{display:block;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:1.4px;margin-bottom:5px}.team strong{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-size:clamp(13px,1.45vw,17px);letter-spacing:-.35px}.fixture-core{min-width:0;text-align:center;padding:0 8px}.vs{font-size:16px;font-weight:900;letter-spacing:2px;color:var(--ink)}.format{display:inline-block;margin-top:7px;padding:5px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:8px;font-weight:900;letter-spacing:1px}.date{margin-top:7px;color:var(--muted);font-size:9px}
.command-grid,.lower-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-top:16px}.panel{padding:22px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:0 15px 40px color-mix(in srgb,#000 6%,transparent)}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:17px}.panel h2{margin:6px 0 0;color:var(--ink);font-size:18px;letter-spacing:-.6px}.head-state{padding:6px 8px;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:8px;font-weight:900;letter-spacing:.8px}.workflow{display:grid;gap:8px}.flow-step{position:relative;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid transparent;border-radius:13px;background:color-mix(in srgb,var(--cp-text) 2.5%,transparent);color:var(--ink);text-decoration:none;transition:.2s}.flow-step:hover{transform:translateX(3px);border-color:var(--line);background:var(--raised)}.flow-step.accent-step{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 18%,var(--line))}.step-no{width:31px;height:31px;flex:0 0 31px;border-radius:9px;display:grid;place-items:center;background:var(--raised);color:var(--muted);font-size:9px;font-weight:900}.accent-step .step-no{background:var(--accent);color:var(--cp-accent-contrast)}.flow-copy{display:grid;gap:3px;min-width:0}.flow-copy b{font-size:11px}.flow-copy span{color:var(--muted);font-size:9px}.flow-step>i{margin-left:auto;color:var(--muted);font-style:normal;font-size:15px}.flow-step:hover>i{color:var(--accent)}
.pulse{display:flex;align-items:center;gap:6px;color:var(--accent);font-size:8px;font-weight:900;letter-spacing:1px}.pulse i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent);animation:blink 1.8s infinite}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.metrics>div{min-width:0;padding:13px;border:1px solid var(--line);border-radius:13px;background:color-mix(in srgb,var(--cp-text) 2%,transparent);display:grid;gap:5px}.metrics span{color:var(--muted);font-size:7px;font-weight:900;letter-spacing:1.1px}.metrics b{overflow:hidden;text-overflow:ellipsis;color:var(--ink);font-size:12px;white-space:nowrap}.metrics small{color:var(--muted);font-size:8px}.metrics .id-value{font-size:9px}
.lower-grid{grid-template-columns:1fr 1fr}.next-panel p{max-width:530px;margin:0 0 17px;color:var(--muted);font-size:11px;line-height:1.65}.action-link{display:inline-flex;align-items:center;gap:12px;color:var(--accent);font-size:10px;font-weight:900}.quick-links{display:grid;gap:7px}.quick-links a{display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:8px;padding:9px;border-radius:10px;color:var(--ink);text-decoration:none;font-size:10px;transition:.18s}.quick-links a:hover{background:var(--raised);color:var(--accent);transform:translateX(2px)}.quick-links a span{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}.quick-links b{font-size:13px;color:var(--muted)}
.loading-card{min-height:310px;padding:30px;border:1px solid var(--line);border-radius:25px;background:var(--surface);display:grid;align-content:center;gap:14px}.shimmer{background:linear-gradient(90deg,color-mix(in srgb,var(--cp-text) 3%,transparent),color-mix(in srgb,var(--cp-text) 8%,transparent),color-mix(in srgb,var(--cp-text) 3%,transparent));background-size:200% 100%;animation:shimmer 1.25s linear infinite}.line{height:14px;border-radius:999px;width:48%}.line.sm{width:15%;height:8px}.line.xl{width:70%;height:46px;border-radius:12px}.line.md{width:42%}.loading-score{display:flex;align-items:center;justify-content:space-between;margin-top:20px}.orb{width:55px;height:55px;border-radius:16px}.loading-score .line{width:50%}
.empty{max-width:650px;padding:70px 0}.empty-orb{width:56px;height:56px;margin-bottom:20px;border-radius:18px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:22px;font-weight:900}.empty h1{margin:14px 0 10px;font-size:34px;letter-spacing:-1.5px}.empty p{margin:0 0 22px;color:var(--muted);font-size:12px}
@keyframes blink{50%{opacity:.35}}@keyframes shimmer{to{background-position:-200% 0}}@media(max-width:920px){.fixture-board{grid-template-columns:minmax(0,1fr) 120px minmax(0,1fr)}.command-grid{grid-template-columns:1fr}.hero-title-row{align-items:flex-start;flex-direction:column}.hero-actions{width:100%}.lower-grid{grid-template-columns:1fr}}@media(max-width:680px){.match-page{padding:30px 18px 80px}.match-hero{padding:20px}.fixture-board{grid-template-columns:1fr;gap:14px}.fixture-core{order:2}.team.away{order:3;justify-content:flex-start;text-align:left}.team.away .team-mark{order:-1}.hero-actions{justify-content:space-between}.primary{flex:1;justify-content:center}.command-grid,.lower-grid{gap:12px}.panel{padding:18px}.metrics{grid-template-columns:1fr}.hero-copy{width:100%}.hero-title-row h1{font-size:30px;letter-spacing:-1.2px}.team strong{font-size:14px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}`]

})
export class MatchDetailComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  loading = true;
  match: Match | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading = false; return; }
    this.http.get<Match>(`http://localhost:8080/api/matches/${id}`).subscribe({
      next: match => { this.match = match; this.loading = false; },
      error: () => { this.match = null; this.loading = false; }
    });
  }

  displayMatchTitle(value?: string): string {
    const title = value?.trim();
    return title || 'Match overview';
  }

  displayDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }).format(date);
  }
}
