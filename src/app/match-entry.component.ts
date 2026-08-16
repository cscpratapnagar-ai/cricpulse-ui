import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface MatchState {
  id: string;
  status: string;
}

@Component({
  selector: 'app-match-entry',
  standalone: true,
  template: `<section class="entry"><span>Opening match…</span></section>`,
  styles: [`:host{display:block}.entry{min-height:260px;display:grid;place-items:center;color:#789386;font-size:12px}`]
})
export class MatchEntryComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigateByUrl('/matches');
      return;
    }

    this.http.get<MatchState>(`http://localhost:8080/api/matches/${id}`).subscribe({
      next: match => {
        const target = match.status === 'COMPLETED'
          ? `/matches/${id}/result`
          : `/matches/${id}/overview`;
        void this.router.navigateByUrl(target, { replaceUrl: true });
      },
      error: () => {
        void this.router.navigateByUrl('/matches');
      }
    });
  }
}
