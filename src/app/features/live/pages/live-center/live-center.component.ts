import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, startWith } from 'rxjs';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';
import { LiveScore, LiveScoreService } from '../../../../live-score.service';

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

interface Player {
  id: string;
  name: string;
  battingStyle: string;
  bowlingStyle: string;
  role: string;
}

interface InningsResponse {
  id: string;
  matchId: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
}

@Component({
  selector: 'app-live-center',
  standalone: true,
  imports: [FormsModule, RouterLink, AsyncPipe, SelectFieldComponent],
  template: `
    <section class="live-page">
      <div class="page-heading">
        <div>
          <div class="eyebrow">LIVE CENTER</div>
          <h1>Live scoring</h1>
          <p>Choose a match, pick the batting side, and score every delivery with the same premium control flow we use across the app.</p>
        </div>
        <a class="primary" routerLink="/matches">Back to matches</a>
      </div>

      @if (loadingMatch) {
        <div class="hero skeleton">
          <div class="line line-sm"></div>
          <div class="line line-lg"></div>
          <div class="line line-md"></div>
        </div>
      } @else if (!activeMatch) {
        <section class="picker">
          <div class="panel-head">
            <div>
              <span class="panel-label">Choose a match</span>
              <h2>Pick the fixture you want to score</h2>
            </div>
          </div>

          <div class="match-grid">
            @for (match of matches; track match.id) {
              <a class="match-card" [routerLink]="['/matches', match.id, 'live']">
                <span class="status">{{ match.status }}</span>
                <strong>{{ match.name }}</strong>
                <small>{{ match.teamAName || 'Team A' }} vs {{ match.teamBName || 'Team B' }}</small>
              </a>
            }
          </div>
        </section>
      } @else {
        <section class="hero">
          <div>
            <div class="eyebrow">MATCH CONTROL</div>
            <h1>{{ activeMatch.name }}</h1>
            <p>{{ activeMatch.teamAName || 'Team A' }} vs {{ activeMatch.teamBName || 'Team B' }} · {{ activeMatch.format }} · {{ displayDate(activeMatch.scheduledAt) }}</p>
            <div class="hero-meta">
              <span class="chip live">{{ activeMatch.status }}</span>
              <span class="chip ghost">{{ activeMatch.format }}</span>
              <span class="chip ghost">{{ displayDate(activeMatch.scheduledAt) }}</span>
            </div>
          </div>
          <div class="hero-actions">
            <a class="secondary" [routerLink]="['/matches', activeMatch.id]">View match detail</a>
            <a class="secondary" routerLink="/matches">Choose another match</a>
          </div>
        </section>

        <section class="grid">
          <article class="panel panel-wide">
            <div class="panel-head">
              <div>
                <span class="panel-label">Start innings</span>
                <h2>Open the first batting phase</h2>
              </div>
            </div>

            <div class="setup-grid">
              <app-select-field
                label="Innings"
                placeholder="Select innings"
                [options]="inningsOptions"
                [(value)]="inningsNumberValue" />

              <app-select-field
                label="Batting team"
                placeholder="Select batting side"
                [options]="teamOptions"
                [value]="battingTeamId"
                (valueChange)="onBattingTeamChange($event)" />

              <div class="start-box">
                <div>
                  <b>Current setup</b>
                  <small>{{ battingTeamName }} is set to bat first</small>
                </div>
                <button class="primary" (click)="startInnings()" [disabled]="starting">{{ starting ? 'Starting innings...' : 'Start innings' }}</button>
              </div>
            </div>

            @if (error) {
              <p class="error">{{ error }}</p>
            }
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <span class="panel-label">Live scoreboard</span>
                <h2>Current score</h2>
              </div>
            </div>

            @if (score$ | async; as score) {
              @if (score) {
                <div class="scoreboard">
                  <div class="runs">{{ score.runs }}<small>/{{ score.wickets }}</small></div>
                  <div class="score-meta">
                    <span>{{ overs(score.legalBalls) }} OVERS</span>
                    <span>INNINGS {{ score.inningsNumber }}</span>
                    <span class="synced">● SYNCED</span>
                  </div>
                </div>
              } @else {
                <p class="waiting">Start an innings to connect the live scoreboard.</p>
              }
            }
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <span class="panel-label">Players</span>
                <h2>Scoring inputs</h2>
              </div>
            </div>

            <div class="inputs">
              <app-select-field
                label="Striker"
                placeholder="Select striker"
                [options]="battingPlayerOptions"
                [(value)]="strikerId" />

              <app-select-field
                label="Non-striker"
                placeholder="Select non-striker"
                [options]="battingPlayerOptions"
                [(value)]="nonStrikerId" />

              <app-select-field
                label="Bowler"
                placeholder="Select bowler"
                [options]="bowlingPlayerOptions"
                [(value)]="bowlerId" />
            </div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <span class="panel-label">Delivery console</span>
                <h2>Ball-by-ball scoring</h2>
              </div>
            </div>

            <div class="button-row">
              @for (run of runs; track run) {
                <button class="action" (click)="record(run)">{{ run }}</button>
              }
            </div>
            <div class="button-row">
              <button class="action" (click)="recordExtra('WIDE')">Wide</button>
              <button class="action" (click)="recordExtra('NO_BALL')">No ball</button>
              <button class="action" (click)="recordExtra('BYE')">Bye</button>
              <button class="action" (click)="recordExtra('LEG_BYE')">Leg bye</button>
              <button class="action danger" (click)="recordWicket()">Wicket</button>
              <button class="action ghost" (click)="undo()">Undo</button>
            </div>

            @if (message) {
              <p class="message">{{ message }}</p>
            }
          </article>

          <article class="panel panel-wide">
            <div class="panel-head">
              <div>
                <span class="panel-label">Timeline</span>
                <h2>What comes next</h2>
              </div>
            </div>

            <div class="timeline">
              <div><b>01</b><span>Set the striker, non-striker, and bowler using dropdowns</span></div>
              <div><b>02</b><span>Record each delivery and keep the score sync live</span></div>
              <div><b>03</b><span>Expand into commentary, wickets, and over summaries</span></div>
            </div>
          </article>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}
    .live-page{max-width:1180px;padding:44px 4vw 100px}
    .page-heading{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:22px}
    .eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}
    h1{margin:14px 0 8px;font-size:clamp(44px,6vw,76px);line-height:.92;letter-spacing:-4px}
    .page-heading p{color:#91aa9d;max-width:740px}
    .primary,.secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;padding:14px 18px;text-decoration:none;font-weight:850}
    .primary{border:0;background:#b8f45c;color:#10251e;box-shadow:0 10px 28px #b8f45c22}
    .secondary{border:1px solid #ffffff18;background:#ffffff06;color:#edf8f2}
    .hero{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding:28px;border:1px solid #ffffff18;border-radius:24px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005}
    .hero p{color:#91aa9d;max-width:760px}
    .hero-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
    .chip{padding:8px 11px;border-radius:999px;border:1px solid #ffffff12;background:#ffffff07;color:#91aa9d;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
    .chip.live{background:#b8f45c0f;border-color:#b8f45c33;color:#c9ff71}
    .chip.ghost{color:#91aa9d}
    .hero-actions{display:flex;flex-direction:column;gap:10px;min-width:220px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
    .panel{padding:24px;border:1px solid #ffffff18;border-radius:22px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005}
    .panel-wide{grid-column:1/-1}
    .panel-head{display:flex;justify-content:space-between;align-items:start;margin-bottom:18px}
    .panel-label{display:block;color:#789386;font-size:9px;letter-spacing:1.8px;font-weight:850;text-transform:uppercase;margin-bottom:6px}
    .panel h2{margin:0;font-size:20px;letter-spacing:-1px}
    .match-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .match-card{padding:18px;border-radius:18px;border:1px solid #ffffff12;background:#ffffff05;text-decoration:none;color:#edf8f2;display:grid;gap:10px;transition:transform .2s,border-color .2s}
    .match-card:hover{transform:translateY(-2px);border-color:#b8f45c55}
    .match-card .status{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:1.2px}
    .match-card strong{font-size:17px;line-height:1.2}
    .match-card small{color:#789386}
    .setup-grid{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:14px;align-items:end}
    .start-box{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px;border:1px solid #ffffff12;border-radius:16px;background:#ffffff06}
    .start-box b{display:block}
    .start-box small{display:block;color:#789386;margin-top:4px}
    .error{color:#ffaaa4;font-size:12px;margin-top:16px}
    .scoreboard{display:grid;gap:16px}
    .runs{font-size:86px;line-height:1;font-weight:900;letter-spacing:-6px;color:#f2fbe9}
    .runs small{font-size:34px;color:#91aa9d;letter-spacing:-2px}
    .score-meta{display:flex;gap:18px;flex-wrap:wrap;color:#91aa9d;font-size:10px;letter-spacing:1.2px;font-weight:800}
    .synced{color:#b8f45c}
    .waiting{color:#91aa9d}
    .inputs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .button-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
    .action{border:0;border-radius:12px;padding:12px 16px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer;transition:transform .2s,box-shadow .2s}
    .action:hover{transform:translateY(-2px);box-shadow:0 8px 18px #b8f45c30}
    .action.danger{background:#ff766d}
    .action.ghost{background:#ffffff08;color:#edf8f2;border:1px solid #ffffff14}
    .message{color:#c9ff71;font-size:12px;margin-top:14px}
    .timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .timeline div{padding:18px;border-radius:16px;border:1px solid #ffffff12;background:#ffffff05;display:grid;gap:12px}
    .timeline b{width:max-content;padding:6px 9px;border-radius:999px;background:#b8f45c12;color:#b8f45c;font-size:10px;letter-spacing:1px}
    .timeline span{color:#edf8f2;font-weight:700;line-height:1.5}
    .picker{padding:24px;border:1px solid #ffffff18;border-radius:24px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005}
    .skeleton .line{height:18px;border-radius:999px;background:linear-gradient(90deg,#ffffff08,#ffffff18,#ffffff08);background-size:200% 100%;animation:shimmer 1.3s linear infinite;margin-top:14px}
    .skeleton .line-sm{width:220px}
    .skeleton .line-lg{width:min(620px,90%);height:58px;border-radius:18px}
    .skeleton .line-md{width:min(420px,70%)}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @media(max-width:900px){.hero{flex-direction:column;align-items:stretch}.hero-actions{min-width:0;flex-direction:row;flex-wrap:wrap}.grid{grid-template-columns:1fr}.setup-grid,.inputs,.match-grid,.timeline{grid-template-columns:1fr}.start-box{flex-direction:column;align-items:stretch}}
    @media(max-width:700px){.live-page{padding:28px 20px 90px}h1{letter-spacing:-3px}.runs{font-size:66px}.hero-actions{flex-direction:column}}
  `]
})
export class LiveCenterComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly liveScore = inject(LiveScoreService);

  matches: Match[] = [];
  activeMatch: Match | null = null;
  loadingMatch = true;
  starting = false;
  error = '';
  inningsId = '';
  inningsNumberValue = '1';
  battingTeamId = '';
  strikerId = '';
  nonStrikerId = '';
  bowlerId = '';
  message = '';
  readonly runs = [0, 1, 2, 3, 4, 6];
  readonly inningsOptions: SelectOption[] = [
    { value: '1', label: 'Innings 1' },
    { value: '2', label: 'Innings 2' }
  ];
  battingPlayers: Player[] = [];
  bowlingPlayers: Player[] = [];
  score$ = of<LiveScore | null>(null);

  constructor() {
    const matchId = this.route.snapshot.paramMap.get('id');
    if (matchId) {
      this.loadMatch(matchId);
    } else {
      this.loadMatches();
    }
  }

  get teamOptions(): SelectOption[] {
    if (!this.activeMatch) {
      return [];
    }
    return [
      { value: this.activeMatch.teamAId, label: this.activeMatch.teamAName || 'Team A' },
      { value: this.activeMatch.teamBId, label: this.activeMatch.teamBName || 'Team B' }
    ];
  }

  get battingTeamName(): string {
    if (!this.activeMatch) {
      return 'Batting team';
    }
    return this.battingTeamId === this.activeMatch.teamBId
      ? (this.activeMatch.teamBName || 'Team B')
      : (this.activeMatch.teamAName || 'Team A');
  }

  get battingPlayerOptions(): SelectOption[] {
    return this.battingPlayers.map(player => ({ value: player.id, label: player.name }));
  }

  get bowlingPlayerOptions(): SelectOption[] {
    return this.bowlingPlayers.map(player => ({ value: player.id, label: player.name }));
  }

  loadMatches(): void {
    this.loadingMatch = true;
    this.http.get<Match[]>('http://localhost:8080/api/matches').subscribe({
      next: matches => {
        this.matches = matches;
        this.loadingMatch = false;
      },
      error: () => {
        this.matches = [];
        this.loadingMatch = false;
      }
    });
  }

  loadMatch(id: string): void {
    this.loadingMatch = true;
    this.http.get<Match>(`http://localhost:8080/api/matches/${id}`).subscribe({
      next: match => {
        this.activeMatch = match;
        this.battingTeamId = match.teamAId;
        this.loadingMatch = false;
        this.loadPlayersForTeams(match.teamAId, match.teamBId);
      },
      error: () => {
        this.activeMatch = null;
        this.loadingMatch = false;
      }
    });
  }

  onBattingTeamChange(teamId: string): void {
    this.battingTeamId = teamId;
    if (!this.activeMatch) {
      return;
    }

    const bowlingTeamId = teamId === this.activeMatch.teamAId ? this.activeMatch.teamBId : this.activeMatch.teamAId;
    this.loadPlayersForTeams(teamId, bowlingTeamId);
    this.strikerId = '';
    this.nonStrikerId = '';
    this.bowlerId = '';
  }

  private loadPlayersForTeams(battingTeamId: string, bowlingTeamId: string): void {
    this.http.get<Player[]>(`http://localhost:8080/api/players/teams/${battingTeamId}`).subscribe({
      next: players => {
        this.battingPlayers = players;
        this.strikerId = players[0]?.id || '';
        this.nonStrikerId = players[1]?.id || players[0]?.id || '';
      },
      error: () => {
        this.battingPlayers = [];
      }
    });

    this.http.get<Player[]>(`http://localhost:8080/api/players/teams/${bowlingTeamId}`).subscribe({
      next: players => {
        this.bowlingPlayers = players;
        this.bowlerId = players[0]?.id || '';
      },
      error: () => {
        this.bowlingPlayers = [];
      }
    });
  }

  startInnings(): void {
    if (!this.activeMatch) {
      this.error = 'Pick a match first.';
      return;
    }
    if (!this.battingTeamId) {
      this.error = 'Choose a batting team to start the innings.';
      return;
    }

    this.error = '';
    this.starting = true;
    this.http.post<InningsResponse>('http://localhost:8080/api/scoring/innings', {
      matchId: this.activeMatch.id,
      inningsNumber: Number(this.inningsNumberValue),
      battingTeamId: this.battingTeamId
    }).subscribe({
      next: response => {
        this.inningsId = response.id;
        this.message = `Innings ${response.inningsNumber} started`;
        this.starting = false;
        this.connectLive();
      },
      error: () => {
        this.error = 'Could not start innings. Check the selected team and try again.';
        this.starting = false;
      }
    });
  }

  connectLive(): void {
    if (!this.inningsId.trim()) {
      return;
    }
    this.score$ = this.liveScore.watch(this.inningsId.trim()).pipe(startWith(null), catchError(() => of(null)));
  }

  record(batRuns: number): void {
    this.submit(batRuns, 0, null, null, null, true);
  }

  recordExtra(extraType: string): void {
    this.submit(0, 1, extraType, null, null, extraType !== 'WIDE' && extraType !== 'NO_BALL');
  }

  recordWicket(): void {
    this.submit(0, 0, null, 'BOWLED', this.strikerId || null, true);
  }

  undo(): void {
    if (!this.inningsId.trim()) {
      this.message = 'Start an innings before undoing a ball.';
      return;
    }
    this.http.post(`http://localhost:8080/api/scoring/innings/${this.inningsId}/undo`, {}).subscribe({
      next: () => this.message = 'Last delivery undone',
      error: () => this.message = 'Nothing to undo'
    });
  }

  private submit(batRuns: number, extraRuns: number, extraType: string | null, wicketType: string | null, dismissedPlayerId: string | null, legalBall: boolean): void {
    if (!this.inningsId.trim()) {
      this.message = 'Start an innings before recording deliveries.';
      return;
    }
    if (!this.strikerId.trim() || !this.nonStrikerId.trim() || !this.bowlerId.trim()) {
      this.message = 'Choose striker, non-striker, and bowler first.';
      return;
    }

    const payload = {
      inningsId: this.inningsId,
      overNumber: this.currentOver,
      ballNumber: this.currentBall,
      strikerId: this.strikerId.trim(),
      nonStrikerId: this.nonStrikerId.trim(),
      bowlerId: this.bowlerId.trim(),
      batRuns,
      extraRuns,
      extraType,
      wicketType,
      dismissedPlayerId
    };

    this.http.post(`http://localhost:8080/api/scoring/innings/${this.inningsId}/deliveries`, payload).subscribe({
      next: () => {
        this.message = 'Delivery recorded';
        this.advanceBall(legalBall);
      },
      error: () => this.message = 'Delivery could not be recorded'
    });
  }

  private currentOver = 0;
  private currentBall = 1;
  private legalBallsInOver = 0;

  private advanceBall(legalBall: boolean): void {
    this.currentBall++;
    if (legalBall) {
      this.legalBallsInOver++;
    }
    if (this.legalBallsInOver === 6) {
      this.currentOver++;
      this.currentBall = 1;
      this.legalBallsInOver = 0;
    }
  }

  overs(legalBalls: number): string {
    return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  }

  displayDate(value?: string): string {
    if (!value) {
      return 'Schedule pending';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }
}
