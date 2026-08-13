import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { LiveScore } from './live-score.service';

@Component({
  selector: 'app-scorecard',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    <section class="scorecard-page">
      <header class="topbar">
        <div>
          <span class="eyebrow">CRICPULSE · SCORECARD</span>
          <h1>Live Scorecard</h1>
          <p>Premium match centre · complete innings view</p>
        </div>
        <div class="actions">
          <span class="live"><i></i> LIVE</span>
          <a [routerLink]="['/matches', matchId, 'live']">Live match →</a>
        </div>
      </header>

      <section class="hero card">
        <div>
          <span class="label">CURRENT INNINGS</span>
          <div class="score">0<em>/0</em></div>
          <div class="meta">0.0 OVERS · RUN RATE 0.00</div>
        </div>
        <div class="hero-status">
          <span>LIVE SCORE</span>
          <strong>0/0</strong>
          <small>Waiting for scoring events</small>
        </div>
      </section>

      <nav class="tabs">
        <a class="active">Scorecard</a>
        <a [routerLink]="['/matches', matchId, 'live']">Live</a>
        <a>Stats</a>
        <a>Commentary</a>
      </nav>

      <div class="grid">
        <main>
          <article class="card panel">
            <header class="panel-title">
              <div><span>BATTING</span><h2>Batting Card</h2></div>
              <small>R · B · 4s · 6s · SR</small>
            </header>
            <div class="empty-state">Batting data will appear here when the innings starts.</div>
          </article>

          <article class="card panel">
            <header class="panel-title">
              <div><span>BOWLING</span><h2>Bowling Card</h2></div>
              <small>O · M · R · W · ECO</small>
            </header>
            <div class="empty-state">Bowling data will appear here when a bowler is active.</div>
          </article>
        </main>

        <aside>
          <article class="card panel side-panel">
            <header class="panel-title"><div><span>THIS OVER</span><h2>Ball sequence</h2></div></header>
            <div class="balls"><i>·</i><i>·</i><i>·</i><i>·</i><i>·</i><i>·</i></div>
          </article>
          <article class="card panel side-panel">
            <header class="panel-title"><div><span>PARTNERSHIP</span><h2>Current stand</h2></div></header>
            <strong class="partnership">0</strong>
            <small>runs · 0 balls</small>
          </article>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}.scorecard-page{max-width:1280px;margin:auto;padding:34px 4vw 90px;color:#edf8f2}.topbar{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}.eyebrow,.label,.panel-title span{font-size:9px;letter-spacing:2px;font-weight:900;color:#789386}.topbar h1{font-size:clamp(34px,5vw,60px);letter-spacing:-3px;line-height:.95;margin:10px 0}.topbar p{color:#789386;margin:0}.actions{display:flex;align-items:center;gap:10px}.actions a{color:#edf8f2;text-decoration:none;border:1px solid #ffffff15;border-radius:11px;padding:11px 14px;font-weight:800}.live{color:#c9ff71;font-size:10px;font-weight:900;border:1px solid #b8f45c33;border-radius:999px;padding:9px 12px}.live i{display:inline-block;width:6px;height:6px;background:#b8f45c;border-radius:50%;margin-right:6px}.card{border:1px solid #ffffff16;border-radius:22px;background:linear-gradient(180deg,#0f271ee6,#0a1914f7);box-shadow:0 18px 50px #0006;backdrop-filter:blur(16px)}.hero{padding:28px;display:flex;justify-content:space-between;align-items:end;margin-bottom:18px}.score{font-size:clamp(68px,10vw,120px);font-weight:950;letter-spacing:-8px;line-height:.85;margin:15px 0}.score em{font-style:normal;color:#91aa9d;font-size:.42em;letter-spacing:-2px;margin-left:8px}.meta{font-size:10px;letter-spacing:1.2px;color:#789386;font-weight:850}.hero-status{min-width:220px;padding:18px;border:1px solid #ffffff12;border-radius:16px;background:#ffffff05}.hero-status span{font-size:9px;color:#789386;letter-spacing:2px;font-weight:900}.hero-status strong{display:block;font-size:28px;margin:8px 0}.hero-status small{color:#789386}.tabs{display:flex;gap:4px;border-bottom:1px solid #ffffff12;margin-bottom:18px}.tabs a{padding:13px 18px;color:#789386;text-decoration:none;font-size:11px;font-weight:900}.tabs .active{color:#c9ff71;border-bottom:2px solid #b8f45c}.grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(270px,.7fr);gap:18px}.grid main,.grid aside{display:grid;gap:18px;align-content:start}.panel{padding:24px}.panel-title{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:18px}.panel-title h2{margin:5px 0 0;font-size:20px;letter-spacing:-.7px}.panel-title small{font-size:9px;color:#789386}.empty-state{min-height:130px;border:1px dashed #ffffff14;border-radius:15px;display:grid;place-items:center;text-align:center;padding:20px;color:#789386;font-size:11px}.balls{display:flex;gap:8px}.balls i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#ffffff08;border:1px solid #ffffff14;color:#789386;font-style:normal}.partnership{display:block;font-size:48px;line-height:.9;letter-spacing:-3px;margin-bottom:8px}.side-panel>small{color:#789386;font-size:11px}@media(max-width:900px){.grid{grid-template-columns:1fr}.hero{flex-direction:column;align-items:stretch}.hero-status{min-width:0}}@media(max-width:620px){.scorecard-page{padding:24px 16px 70px}.topbar{flex-direction:column;align-items:flex-start}.actions{width:100%;justify-content:space-between}.hero,.panel{padding:18px}.topbar h1{letter-spacing:-2px}.tabs a{padding:12px 10px}}
  `]
})
export class ScorecardComponent {
  private readonly route = inject(ActivatedRoute);
  matchId = this.route.snapshot.paramMap.get('id') || '';
  score$ = of<LiveScore | null>(null);
}
