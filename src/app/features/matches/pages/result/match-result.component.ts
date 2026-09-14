import { API_BASE_URL } from '../../../../core/config/api.config';
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
  templateUrl: './match-result.component.html',
  styleUrl: './match-result.component.scss',
})
export class MatchResultComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  loading = true;
  result: MatchResult | null = null;
  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.http.get<MatchResult>(`${API_BASE_URL}/matches/${id}/result`).subscribe({
      next: (r) => {
        this.result = r;
        this.loading = false;
      },
      error: () => {
        this.result = null;
        this.loading = false;
      },
    });
  }
  overs(balls: number) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }
}
