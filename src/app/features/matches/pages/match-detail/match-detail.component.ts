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
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss']

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

  displayMatchTitle(value?: string): string {
    const title = value?.trim();
    return title || 'Match overview';
  }

  displayDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }).format(date);
  }
}
