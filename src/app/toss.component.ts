import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SelectFieldComponent } from './ui/select-field.component';

interface MatchView {
  id: string;
  name: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  format: string;
  status: string;
  scheduledAt?: string | null;
}

interface TossResponse {
  matchId: string;
  tossWinnerTeamId: string | null;
  decision: string | null;
  battingTeamId: string | null;
  bowlingTeamId: string | null;
  recorded: boolean;
}

interface TossSaveResponse {
  matchId: string;
  tossWinnerTeamId: string;
  decision: string;
  battingTeamId: string;
  bowlingTeamId: string;
}

@Component({
  selector: 'app-toss',
  standalone: true,
  imports: [FormsModule, RouterLink, SelectFieldComponent],
  template: `
    <section class="toss-page">
      <a class="back" [routerLink]="['/matches', matchId]">← Back to match</a>

      <div class="heading">
        <div class="eyebrow">MATCH SETUP · TOSS</div>
        <h1>Who won<br><em>the toss?</em></h1>
        <p>{{ match?.name || 'Prepare the match before the first ball.' }}</p>
      </div>

      @if (loading) {
        <div class="state-card">Loading match details…</div>
      } @else {
        <div class="setup-card">
          <div class="step-head">
            <div>
              <b>01 · Toss result</b>
              <small>{{ saved ? 'Toss already recorded. Selection is locked.' : 'Select the winner and what they chose.' }}</small>
            </div>
            <span>{{ match?.format || 'MATCH' }}</span>
          </div>

          <div class="teams">
            <button type="button" class="team-card" [class.selected]="winnerTeamId === match?.teamAId" [disabled]="saved" (click)="winnerTeamId = match?.teamAId || ''">
              <span class="radio">{{ winnerTeamId === match?.teamAId ? '✓' : '' }}</span>
              <strong>{{ match?.teamAName || 'Team A' }}</strong>
              <small>Team A</small>
            </button>
            <div class="vs">VS</div>
            <button type="button" class="team-card" [class.selected]="winnerTeamId === match?.teamBId" [disabled]="saved" (click)="winnerTeamId = match?.teamBId || ''">
              <span class="radio">{{ winnerTeamId === match?.teamBId ? '✓' : '' }}</span>
              <strong>{{ match?.teamBName || 'Team B' }}</strong>
              <small>Team B</small>
            </button>
          </div>

          <div class="decision-title">Elected to</div>
          <div class="decisions">
            <button type="button" [class.active]="decision === 'BAT'" [disabled]="saved" (click)="decision = 'BAT'">
              <span>🏏</span><b>BAT</b><small>Start with the bat</small>
            </button>
            <button type="button" [class.active]="decision === 'BOWL'" [disabled]="saved" (click)="decision = 'BOWL'">
              <span>⚾</span><b>BOWL</b><small>Start with the ball</small>
            </button>
          </div>

          @if (error) { <div class="error">{{ error }}</div> }
          @if (success) { <div class="success">✓ {{ success }}</div> }

          <div class="summary">
            <div><span>Toss winner</span><b>{{ winnerName }}</b></div>
            <div><span>Decision</span><b>{{ decision || '—' }}</b></div>
          </div>

          @if (!saved) {
            <div class="actions">
              <a [routerLink]="['/matches', matchId]">Cancel</a>
              <button type="button" [disabled]="saving || !winnerTeamId || !decision" (click)="confirmToss()">
                {{ saving ? 'Saving toss…' : 'Confirm Toss' }} <b>→</b>
              </button>
            </div>
          } @else {
            <div class="locked-note">✓ Toss confirmed · You can continue to opening players.</div>
          }
        </div>
      }

      @if (saved) {
        <div class="result-card">
          <div class="result-icon">✓</div>
          <div>
            <div class="eyebrow">TOSS RECORDED</div>
            <h2>{{ winnerName }} won the toss and elected to {{ decision }}</h2>
            <p>{{ battingName }} will bat first · {{ bowlingName }} will bowl first.</p>
          </div>
          <button type="button" (click)="continueToOpeningPlayers()">Continue →</button>
        </div>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.toss-page{max-width:1120px;padding:45px 4vw 100px}.back{display:inline-block;color:#91aa9d;text-decoration:none;font-size:12px;margin-bottom:55px}.back:hover{color:#b8f45c}.heading{margin-bottom:34px}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}.heading h1{margin:17px 0 10px;font-size:clamp(48px,7vw,76px);line-height:.93;letter-spacing:-5px}.heading em{color:#91aa9d;font-style:normal}.heading p{color:#91aa9d}.setup-card,.result-card,.state-card{max-width:1050px;padding:28px;border:1px solid #ffffff18;border-radius:22px;background:#0c2119d9;box-shadow:0 20px 55px #0004}.step-head{display:flex;justify-content:space-between;padding-bottom:21px;border-bottom:1px solid #ffffff12}.step-head div{display:grid;gap:5px}.step-head small{color:#789386;font-size:11px}.step-head>span{color:#b8f45c;font-size:10px;font-weight:850}.teams{display:grid;grid-template-columns:1fr 45px 1fr;align-items:center;gap:14px;padding:26px 0}.team-card{position:relative;min-height:120px;text-align:left;padding:22px;border:1px solid #ffffff14;border-radius:15px;background:#ffffff05;color:#fff;cursor:pointer;display:grid;gap:7px;transition:.2s}.team-card:hover:not(:disabled){border-color:#b8f45c66;transform:translateY(-2px)}.team-card.selected{border-color:#b8f45c;background:#b8f45c0d;box-shadow:0 0 0 3px #b8f45c12}.team-card:disabled{cursor:default;opacity:1}.team-card strong{font-size:18px}.team-card small{color:#789386;font-size:10px}.radio{position:absolute;right:16px;top:16px;width:22px;height:22px;border:1px solid #ffffff2b;border-radius:50%;display:grid;place-items:center;color:#10251e;background:transparent;font-size:12px}.selected .radio{background:#b8f45c;border-color:#b8f45c}.vs{text-align:center;color:#789386;font-size:10px;font-weight:850}.decision-title{color:#b9ccc2;font-size:12px;font-weight:750;margin:4px 0 10px}.decisions{display:grid;grid-template-columns:1fr 1fr;gap:14px}.decisions button{min-height:110px;text-align:left;padding:18px;border:1px solid #ffffff14;border-radius:14px;background:#ffffff05;color:#fff;cursor:pointer;display:grid;grid-template-columns:auto 1fr;column-gap:12px;align-items:center;transition:.2s}.decisions button:disabled{cursor:default;opacity:1}.decisions button span{grid-row:span 2;font-size:25px}.decisions button b{font-size:15px}.decisions button small{color:#789386;font-size:10px}.decisions button:hover:not(:disabled),.decisions button.active{border-color:#b8f45c;background:#b8f45c0d}.summary{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}.summary div{padding:14px 16px;border:1px solid #ffffff12;border-radius:11px;background:#ffffff04;display:grid;gap:5px}.summary span{color:#789386;font-size:10px}.summary b{font-size:13px}.actions{display:flex;justify-content:flex-end;align-items:center;gap:20px;margin-top:25px}.actions a{color:#91aa9d;text-decoration:none;font-size:12px}.actions button,.result-card>button{padding:14px 18px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}.actions button b{margin-left:18px}.actions button:disabled{opacity:.5;cursor:not-allowed}.locked-note{margin-top:20px;padding:13px 15px;border-radius:11px;border:1px solid #b8f45c24;background:#b8f45c0b;color:#b8f45c;font-size:11px;font-weight:750}.error,.success{margin-top:16px;padding:12px 14px;border-radius:10px;font-size:12px}.error{color:#ffaaa4;background:#ff6b6010;border:1px solid #ff6b6030}.success{color:#b8f45c;background:#b8f45c0b;border:1px solid #b8f45c25}.result-card{margin-top:18px;display:flex;align-items:center;gap:18px}.result-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#b8f45c;color:#10251e;font-weight:900}.result-card h2{margin:6px 0;font-size:18px}.result-card p{margin:0;color:#91aa9d;font-size:12px}.result-card>button{margin-left:auto;white-space:nowrap}.state-card{color:#91aa9d}@media(max-width:650px){.toss-page{padding:35px 20px 90px}.back{margin-bottom:38px}.heading h1{letter-spacing:-3px}.teams{grid-template-columns:1fr;gap:10px}.vs{display:none}.decisions,.summary{grid-template-columns:1fr}.actions{justify-content:space-between}.result-card{align-items:flex-start;flex-wrap:wrap}.result-card>button{margin-left:60px}}
  `]
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
