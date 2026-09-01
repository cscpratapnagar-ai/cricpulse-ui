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
  templateUrl: './live-center.component.html',
  styleUrl: './live-center.component.scss'
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
