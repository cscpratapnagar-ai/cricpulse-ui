import { API_BASE_URL } from '../../../../core/config/api.config';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, startWith } from 'rxjs';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}
interface Player {
  id: string;
  name: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
}
interface PlayingPlayer {
  teamId: string;
  playerId: string;
  name: string;
}
interface InningsResponse {
  id: string;
  inningsNumber: number;
}

@Component({
  selector: 'app-scorer',
  standalone: true,
  imports: [AsyncPipe, RouterLink, SelectFieldComponent],
  templateUrl: './scorer.component.html',
  styleUrl: './scorer.component.scss',
})
export class ScorerComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly liveScore = inject(LiveScoreService);
  readonly runs = [0, 1, 2, 3, 4, 6];
  readonly wicketTypeOptions: SelectOption[] = [
    { value: 'BOWLED', label: 'Bowled' },
    { value: 'CAUGHT', label: 'Caught' },
    { value: 'LBW', label: 'LBW' },
    { value: 'RUN_OUT', label: 'Run out' },
    { value: 'STUMPED', label: 'Stumped' },
    { value: 'HIT_WICKET', label: 'Hit wicket' },
    { value: 'HIT_BALL_TWICE', label: 'Hit ball twice' },
    { value: 'OBSTRUCTING_THE_FIELD', label: 'Obstructing the field' },
  ];
  readonly inningsOptions: SelectOption[] = [
    { value: '1', label: 'Innings 1' },
    { value: '2', label: 'Innings 2' },
  ];
  matchId = this.route.snapshot.paramMap.get('id') || '';
  match: Match | null = null;
  inningsId = '';
  inningsNumber = '1';
  battingTeamId = '';
  strikerId = '';
  nonStrikerId = '';
  bowlerId = '';
  battingPlayers: Player[] = [];
  bowlingPlayers: Player[] = [];
  playingXi: PlayingPlayer[] = [];
  wicketType = 'BOWLED';
  dismissedPlayerId = '';
  newBatterId = '';
  wicketFielderId = '';
  currentWickets = 0;
  score$ = of<LiveScore | null>(null);
  starting = false;
  message = '';
  currentLegalBalls = 0;
  currentOver = 0;
  currentBall = 1;
  overBalls: string[] = [];
  partnershipRuns = 0;
  partnershipBalls = 0;
  constructor() {
    if (this.matchId) this.loadMatch();
  }
  get teamOptions(): SelectOption[] {
    return this.match
      ? [
          { value: this.match.teamAId, label: this.match.teamAName || 'Team A' },
          { value: this.match.teamBId, label: this.match.teamBName || 'Team B' },
        ]
      : [];
  }
  get battingOptions(): SelectOption[] {
    return this.battingPlayers.map((p) => ({ value: p.id, label: p.name }));
  }
  get bowlingOptions(): SelectOption[] {
    return this.bowlingPlayers.map((p) => ({ value: p.id, label: p.name }));
  }
  get battingTeamName(): string {
    if (!this.match) return 'Batting team';
    return this.battingTeamId === this.match.teamBId
      ? this.match.teamBName || 'Team B'
      : this.match.teamAName || 'Team A';
  }
  get currentOverLabel(): string {
    return `${this.currentOver}.${Math.max(0, this.currentBall - 1)}`;
  }
  private loadMatch(): void {
    this.http.get<Match>(`${API_BASE_URL}/matches/${this.matchId}`).subscribe({
      next: (m) => {
        this.match = m;
        this.battingTeamId = m.teamAId;
        this.loadPlayers();
      },
      error: () => (this.message = 'Could not load the match.'),
    });
  }
  private loadPlayers(): void {
    this.http.get<PlayingPlayer[]>(`${API_BASE_URL}/matches/${this.matchId}/playing-xi`).subscribe({
      next: (players) => {
        this.playingXi = Array.isArray(players) ? players : [];
        this.syncPlayingXi();
      },
      error: () => {
        this.playingXi = [];
        this.battingPlayers = [];
        this.bowlingPlayers = [];
        this.message = 'Could not load the confirmed Playing XI.';
      },
    });
  }
  onBattingTeamChange(): void {
    this.syncPlayingXi();
  }
  private syncPlayingXi(): void {
    if (!this.match) return;
    const bowlingTeamId = this.battingTeamId === this.match.teamAId ? this.match.teamBId : this.match.teamAId;
    this.battingPlayers = this.playingXi
      .filter((player) => player.teamId === this.battingTeamId)
      .map((player) => ({ id: player.playerId, name: player.name, role: '', battingStyle: '', bowlingStyle: '' }));
    this.bowlingPlayers = this.playingXi
      .filter((player) => player.teamId === bowlingTeamId)
      .map((player) => ({ id: player.playerId, name: player.name, role: '', battingStyle: '', bowlingStyle: '' }));
    if (!this.battingPlayers.some((player) => player.id === this.strikerId)) this.strikerId = this.battingPlayers[0]?.id || '';
    if (!this.battingPlayers.some((player) => player.id === this.nonStrikerId) || this.nonStrikerId === this.strikerId) {
      this.nonStrikerId = this.battingPlayers.find((player) => player.id !== this.strikerId)?.id || '';
    }
    if (!this.bowlingPlayers.some((player) => player.id === this.bowlerId)) this.bowlerId = this.bowlingPlayers[0]?.id || '';
    if (!this.battingPlayers.some((player) => player.id === this.dismissedPlayerId)) this.dismissedPlayerId = this.strikerId;
  }
  startInnings(): void {
    if (!this.match || !this.battingTeamId) {
      this.message = 'Choose the batting team first.';
      return;
    }
    this.starting = true;
    this.message = 'Starting innings…';
    this.http
      .post<InningsResponse>(`${API_BASE_URL}/scoring/innings`, {
        matchId: this.match.id,
        inningsNumber: Number(this.inningsNumber),
        battingTeamId: this.battingTeamId,
      })
      .subscribe({
        next: (r) => {
          this.starting = false;
          this.inningsId = r.id;
          this.currentWickets = 0;
          this.inningsNumber = String(r.inningsNumber);
          this.router
            .navigate(['/matches', this.matchId, 'live-scoring'], {
              queryParams: {
                inningsId: r.id,
                striker: this.strikerId,
                nonStriker: this.nonStrikerId,
                bowler: this.bowlerId,
              },
            })
            .then((ok) => {
              if (!ok) {
                this.message = 'Innings started, but Live Scoring navigation failed.';
                this.connectLive();
              }
            })
            .catch(() => {
              this.message = 'Innings started, but Live Scoring navigation failed.';
              this.connectLive();
            });
        },
        error: (err) => {
          this.starting = false;
          if (
            err?.status === 400 &&
            String(err?.error?.message || '')
              .toLowerCase()
              .includes('already exists')
          ) {
            this.message = 'Innings already exists. Opening Live Scoring…';
            this.http
              .get<LiveScore>(`${API_BASE_URL}/matches/${this.matchId}/current-innings`)
              .subscribe({
                next: (existing) => {
                  this.inningsId = existing.inningsId;
                  this.router.navigate(['/matches', this.matchId, 'live-scoring'], {
                    queryParams: { inningsId: existing.inningsId },
                  });
                },
                error: () => {
                  this.message = 'Innings already exists, but could not load it.';
                },
              });
            return;
          }
          this.message = err?.error?.message || 'Could not start innings.';
        },
      });
  }
  private connectLive(): void {
    if (this.inningsId)
      this.score$ = this.liveScore.watch(this.inningsId).pipe(
        startWith(null),
        catchError(() => of(null)),
      );
  }
  record(runs: number): void {
    this.submit(runs, 0, null, null, true);
  }
  extra(type: string): void {
    this.submit(0, 1, type, null, type !== 'WIDE' && type !== 'NO_BALL');
  }
  wicket(): void {
    this.submit(0, 0, null, 'BOWLED', true);
  }
  private submit(
    batRuns: number,
    extraRuns: number,
    extraType: string | null,
    wicketType: string | null,
    legal = true,
  ): void {
    if (!this.inningsId) {
      this.message = 'Start an innings first.';
      return;
    }
    if (!this.strikerId || !this.nonStrikerId || !this.bowlerId) {
      this.message = 'Select striker, non-striker and bowler.';
      return;
    }
    const payload = {
      inningsId: this.inningsId,
      overNumber: this.currentOver,
      ballNumber: this.currentBall,
      strikerId: this.strikerId,
      nonStrikerId: this.nonStrikerId,
      bowlerId: this.bowlerId,
      batRuns,
      extraRuns,
      extraType,
      wicketType,
      dismissedPlayerId: wicketType ? dismissedPlayerId || this.strikerId : null,
      newBatterId: wicketType ? newBatterId : null,
      wicketFielderId: wicketType ? wicketFielderId : null,
    };
    this.http
      .post(`${API_BASE_URL}/scoring/innings/${this.inningsId}/deliveries`, payload)
      .subscribe({
        next: () => {
          this.message = wicketType ? 'Wicket recorded' : `${batRuns || extraType || 0} recorded`;
          this.overBalls = [
            ...this.overBalls,
            wicketType
              ? 'W'
              : extraType === 'WIDE'
                ? 'Wd'
                : extraType === 'NO_BALL'
                  ? 'Nb'
                  : String(batRuns + extraRuns),
          ];
          this.partnershipRuns += batRuns + extraRuns;
          this.partnershipBalls += legal ? 1 : 0;
          if (legal) {
            this.currentLegalBalls++;
            if (this.currentLegalBalls % 6 === 0) {
              this.currentOver++;
              this.currentBall = 1;
              this.overBalls = [];
            } else this.currentBall++;
          }
        },
        error: () => (this.message = 'Delivery could not be recorded'),
      });
  }
  undo(): void {
    if (!this.inningsId) {
      this.message = 'Start an innings first.';
      return;
    }
    this.http.post(`${API_BASE_URL}/scoring/innings/${this.inningsId}/undo`, {}).subscribe({
      next: () => {
        this.message = 'Last delivery undone';
        this.currentLegalBalls = Math.max(0, this.currentLegalBalls - 1);
        this.currentBall = Math.max(1, this.currentBall - 1);
      },
      error: () => (this.message = 'Nothing to undo'),
    });
  }
  overs(balls: number): string {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }
}
