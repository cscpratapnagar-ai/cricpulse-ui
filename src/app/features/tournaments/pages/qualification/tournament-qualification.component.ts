import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface Point {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  nrr: number;
}
interface Qualifier {
  seed: number;
  label: string;
  higherSeed: Point;
  lowerSeed: Point;
}
interface Preview {
  eligible: boolean;
  message: string;
  table: Point[];
  qualifiers: Qualifier[];
}

@Component({
  selector: 'app-tournament-qualification',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-qualification.component.html',
  styleUrl: './tournament-qualification.component.scss',
})
export class TournamentQualificationComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = API_BASE_URL;
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  preview: Preview | null = null;
  error = '';
  constructor() {
    if (this.id) this.load();
    else this.loading = false;
  }
  load() {
    this.http.get<Preview>(`${this.api}/tournaments/${this.id}/qualification`).subscribe({
      next: (r) => {
        this.preview = r;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Unable to load qualification preview.';
        this.loading = false;
      },
    });
  }
}
