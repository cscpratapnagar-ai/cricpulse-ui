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
  templateUrl: './toss.component.html',
  styleUrl: './toss.component.scss']
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
