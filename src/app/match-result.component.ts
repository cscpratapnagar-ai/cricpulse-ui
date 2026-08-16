import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface TeamScore {
  teamId: string;
  teamName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  totalOvers?: number;
}

interface MatchResult {
  matchId: string;
  matchName: string;
  format: string;
  status: string;
  resultType: string;
  resultText: string;
  winningTeamId?: string;
  firstInnings: TeamScore;
  secondInnings: TeamScore;
}

@Component({
  selector: 'app-match-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="result-page">
      @if (loading) {
        <section class="card loading">Loading match result…</section>
      } @else if (result) {
        <a class="back" [routerLink]="['/matches', result.matchId, 'overview']">← Back to match</a>

        <header class="hero card">
          <div>
            <span class="eyebrow">CRICPULSE · MATCH RESULT</span>
            <h1>{{ result.matchName }}</h1>
            <p>{{ result.format }} · Match completed</p>
          </div>
          <div class="trophy">🏆</div>
        </header>

        <section class="result-banner card">
          <span class="eyebrow">FINAL RESULT</span>
          <h2>{{ result.resultText }}</h2>
          <span class="completed">MATCH COMPLETED</span>
        </section>

        <section class="scores">
          <article class="score-card card" [class.winner]="result.winningTeamId === result.firstInnings.teamId">
            <div class="team-head">
              <span>INNINGS 1</span>
              @if (result.winningTeamId === result.firstInnings.teamId) { <b>WINNER</b> }
            </div>
            <h2>{{ result.firstInnings.teamName }}</h2>
            <div class="score">{{ result.firstInnings.runs }}<small>/{{ result.firstInnings.wickets }}</small></div>
            <div class="overs">{{ overs(result.firstInnings.legalBalls) }} OVERS</div>
          </article>

          <div class="vs">VS</div>

          <article class="score-card card" [class.winner]="result.winningTeamId === result.secondInnings.teamId">
            <div class="team-head">
              <span>INNINGS 2</span>
              @if (result.winningTeamId === result.secondInnings.teamId) { <b>WINNER</b> }
            </div>
            <h2>{{ result.secondInnings.teamName }}</h2>
            <div class="score">{{ result.secondInnings.runs }}<small>/{{ result.secondInnings.wickets }}</small></div>
            <div class="overs">{{ overs(result.secondInnings.legalBalls) }} OVERS</div>
          </article>
        </section>

        <section class="card summary">
          <div><span>RESULT TYPE</span><strong>{{ result.resultType }}</strong></div>
          <div><span>STATUS</span><strong>{{ result.status }}</strong></div>
          <div><span>FIRST INNINGS</span><strong>{{ result.firstInnings.runs }}/{{ result.firstInnings.wickets }}</strong></div>
          <div><span>SECOND INNINGS</span><strong>{{ result.secondInnings.runs }}/{{ result.secondInnings.wickets }}</strong></div>
        </section>

        <div class="actions">
          <a [routerLink]="['/matches', result.matchId, 'overview']">Match Centre →</a>
          <a [routerLink]="['/matches', result.matchId, 'live']">Scoreboard →</a>
        </div>
      } @else {
        <section class="card error">
          <span class="eyebrow">RESULT UNAVAILABLE</span>
          <h1>Match result is not ready.</h1>
          <p>Both innings must be completed before the final result can be calculated.</p>
          <a routerLink="/matches">Back to matches →</a>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.result-page{max-width:1180px;margin:auto;padding:38px 4vw 100px;color:#edf8f2}.card{border:1px solid #ffffff16;border-radius:24px;background:linear-gradient(180deg,#0f271ee8,#091712f7);box-shadow:0 18px 50px #0006}.back{display:inline-block;margin-bottom:18px;color:#91aa9d;text-decoration:none;font-size:12px}.back:hover{color:#b8f45c}.hero{display:flex;justify-content:space-between;align-items:center;padding:30px;margin-bottom:18px}.eyebrow{display:block;color:#789386;font-size:9px;font-weight:900;letter-spacing:2px}.hero h1{margin:9px 0 6px;font-size:clamp(34px,5vw,62px);line-height:.95;letter-spacing:-3px}.hero p{margin:0;color:#91aa9d;font-size:12px}.trophy{width:70px;height:70px;border-radius:22px;display:grid;place-items:center;background:#b8f45c12;border:1px solid #b8f45c30;font-size:32px}.result-banner{padding:32px;text-align:center;border-color:#b8f45c30;background:linear-gradient(180deg,#b8f45c12,#091712f7)}.result-banner h2{margin:12px 0 16px;font-size:clamp(25px,4vw,44px);letter-spacing:-2px}.completed{display:inline-block;padding:8px 12px;border-radius:999px;background:#b8f45c;color:#10251e;font-size:9px;font-weight:950;letter-spacing:1.5px}.scores{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin-top:18px}.score-card{padding:25px}.score-card.winner{border-color:#b8f45c55;box-shadow:0 18px 55px #b8f45c0c}.team-head{display:flex;justify-content:space-between;gap:8px;color:#789386;font-size:9px;font-weight:900;letter-spacing:1.5px}.team-head b{color:#b8f45c}.score-card h2{margin:12px 0 8px;font-size:22px}.score{font-size:76px;font-weight:950;line-height:.9;letter-spacing:-5px}.score small{font-size:.4em;color:#91aa9d;margin-left:5px;letter-spacing:-1px}.overs{margin-top:12px;color:#789386;font-size:10px;font-weight:900;letter-spacing:1.2px}.vs{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:1px solid #b8f45c30;background:#b8f45c10;color:#b8f45c;font-size:10px;font-weight:950}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:18px;overflow:hidden}.summary div{padding:20px;background:#ffffff04}.summary span{display:block;color:#789386;font-size:8px;font-weight:900;letter-spacing:1.4px;margin-bottom:7px}.summary strong{font-size:15px}.actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.actions a,.error a{padding:12px 16px;border-radius:11px;background:#b8f45c;color:#10251e;text-decoration:none;font-size:11px;font-weight:900}.loading,.error{padding:50px}.error h1{margin:10px 0}.error p{color:#91aa9d;margin-bottom:20px}@media(max-width:800px){.scores{grid-template-columns:1fr}.vs{justify-self:center}.summary{grid-template-columns:1fr 1fr}.hero{align-items:flex-start}.trophy{width:56px;height:56px;font-size:25px}}@media(max-width:520px){.result-page{padding:25px 16px 80px}.summary{grid-template-columns:1fr}.actions{flex-direction:column}.actions a{text-align:center}}
  `]
})
export class MatchResultComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  loading = true;
  result: MatchResult | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading = false; return; }
    this.http.get<MatchResult>(`http://localhost:8080/api/matches/${id}/result`).subscribe({
      next: result => { this.result = result; this.loading = false; },
      error: () => { this.result = null; this.loading = false; }
    });
  }

  overs(balls: number): string {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }
}
