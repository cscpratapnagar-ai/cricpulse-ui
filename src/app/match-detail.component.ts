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
      <section class="match-page"><div class="hero skeleton"><div class="eyebrow"></div><div class="title"></div><div class="subtitle"></div></div></section>
    } @else if (match) {
      <section class="match-page">
        <a class="back" routerLink="/matches">← Back to matches</a>
        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow">MATCH COMMAND CENTER</div>
            <h1>{{ match.name }}</h1>
            <p>From setup to live scoring, this is the control room for your cricket fixture.</p>
            <div class="hero-meta">
              <span class="chip" [class.live]="match.status === 'LIVE'">{{ match.status }}</span>
              <span class="chip ghost">{{ match.format }}</span>
              <span class="chip ghost">{{ displayDate(match.scheduledAt) }}</span>
            </div>
          </div>
          <div class="hero-actions">
            <a class="primary" [routerLink]="['/matches', match.id, 'playing-xi']">Playing XI →</a>
            <a class="live-action" [routerLink]="['/matches', match.id, 'live']">Open live center →</a>
            <a class="secondary" routerLink="/matches/new">Create another match</a>
          </div>
        </section>

        <section class="grid">
          <article class="panel">
            <div class="panel-head"><div><span class="panel-label">Teams</span><h2>Playing sides</h2></div></div>
            <div class="team-grid">
              <div class="team-card"><span>Home</span><strong>{{ match.teamAName || 'Team A' }}</strong><small>{{ match.teamAId }}</small></div>
              <div class="versus">VS</div>
              <div class="team-card away"><span>Away</span><strong>{{ match.teamBName || 'Team B' }}</strong><small>{{ match.teamBId }}</small></div>
            </div>
          </article>
          <article class="panel">
            <div class="panel-head"><div><span class="panel-label">Match info</span><h2>Overview</h2></div></div>
            <div class="info-list">
              <div><span>Match ID</span><b>{{ match.id }}</b></div>
              <div><span>Format</span><b>{{ match.format }}</b></div>
              <div><span>Status</span><b>{{ match.status }}</b></div>
              <div><span>Scheduled</span><b>{{ displayDate(match.scheduledAt) }}</b></div>
            </div>
          </article>
          <article class="panel panel-wide">
            <div class="panel-head"><div><span class="panel-label">Flow</span><h2>What happens next</h2></div></div>
            <div class="timeline">
              <div><b>01</b><span>Confirm toss and playing XI</span></div>
              <div><b>02</b><span>Start live scoring for the innings</span></div>
              <div><b>03</b><span>Track scorecard, commentary, and result</span></div>
            </div>
          </article>
        </section>
      </section>
    } @else {
      <section class="match-page"><div class="empty"><div class="eyebrow">MATCH NOT FOUND</div><h1>We could not load this match.</h1><p>The match may have been removed or the link is incorrect.</p><a class="primary" routerLink="/matches">Back to matches →</a></div></section>
    }
  `,
  styles: [`
    :host{display:block}.match-page{max-width:1160px;padding:44px 4vw 100px}.back{display:inline-block;margin-bottom:22px;color:#91aa9d;text-decoration:none;font-size:12px}.back:hover{color:#b8f45c}.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;padding:28px;border:1px solid #ffffff18;border-radius:24px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{margin:14px 0 10px;font-size:clamp(44px,6vw,76px);letter-spacing:-4px;line-height:.92}.hero-copy p{margin:0;max-width:680px;color:#91aa9d}.hero-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.chip{padding:8px 11px;border-radius:999px;border:1px solid #b8f45c24;background:#b8f45c12;color:#c9ff71;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}.chip.ghost{background:#ffffff07;color:#91aa9d;border-color:#ffffff12}.chip.live{background:#b8f45c0f;border-color:#b8f45c33}.hero-actions{display:flex;flex-direction:column;gap:10px;min-width:220px}.primary,.secondary,.live-action{display:inline-flex;justify-content:center;align-items:center;border-radius:12px;padding:14px 18px;text-decoration:none;font-weight:850;white-space:nowrap}.primary{background:#b8f45c;color:#10251e;box-shadow:0 10px 28px #b8f45c22}.live-action{border:1px solid #b8f45c30;color:#b8f45c;background:#b8f45c0b}.secondary{border:1px solid #ffffff18;color:#edf8f2;background:#ffffff06}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;margin-top:18px}.panel{padding:24px;border:1px solid #ffffff18;border-radius:22px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005}.panel-wide{grid-column:1/-1}.panel-head{display:flex;justify-content:space-between;align-items:start;margin-bottom:18px}.panel-label{display:block;color:#789386;font-size:9px;letter-spacing:1.8px;font-weight:850;text-transform:uppercase;margin-bottom:6px}.panel h2{margin:0;font-size:20px;letter-spacing:-1px}.team-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}.team-card{display:grid;gap:8px;padding:18px;border:1px solid #ffffff12;border-radius:18px;background:#ffffff06}.team-card span{color:#789386;font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase}.team-card strong{font-size:22px;line-height:1.1}.team-card small{color:#5d776b;font-size:10px;word-break:break-all}.team-card.away{text-align:right}.versus{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#b8f45c;background:#b8f45c12;border:1px solid #b8f45c24;font-weight:900;letter-spacing:1px}.info-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.info-list div{padding:16px;border-radius:16px;background:#ffffff05;border:1px solid #ffffff12;display:grid;gap:8px}.info-list span{color:#789386;font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase}.info-list b{font-size:14px;word-break:break-word}.timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.timeline div{padding:18px;border-radius:16px;border:1px solid #ffffff12;background:#ffffff05;display:grid;gap:12px}.timeline b{width:max-content;padding:6px 9px;border-radius:999px;background:#b8f45c12;color:#b8f45c;font-size:10px;letter-spacing:1px}.timeline span{color:#edf8f2;font-weight:700;line-height:1.5}.empty{padding:60px 0}.empty p{color:#91aa9d;max-width:560px}.skeleton{min-height:220px;display:grid;gap:14px}.skeleton .eyebrow,.skeleton .title,.skeleton .subtitle{background:linear-gradient(90deg,#ffffff08,#ffffff18,#ffffff08);background-size:200% 100%;animation:shimmer 1.3s linear infinite;border-radius:999px}.skeleton .eyebrow{width:170px;height:10px}.skeleton .title{width:min(620px,90%);height:58px;border-radius:18px}.skeleton .subtitle{width:min(500px,75%);height:16px}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media(max-width:900px){.hero{flex-direction:column;align-items:stretch}.hero-actions{min-width:0;flex-direction:row;flex-wrap:wrap}.grid{grid-template-columns:1fr}.timeline{grid-template-columns:1fr}.info-list{grid-template-columns:1fr}}@media(max-width:700px){.match-page{padding:28px 20px 90px}h1{letter-spacing:-3px}.team-grid{grid-template-columns:1fr}.team-card.away{text-align:left}.versus{justify-self:start}.hero-actions{flex-direction:column}}
  `]
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

  displayDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }).format(date);
  }
}
