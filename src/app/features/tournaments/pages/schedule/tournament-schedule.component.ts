import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from '../../../../ui/date-time-field.component';

interface Tournament {
  id: string;
  name: string;
  format: string;
  overs: number;
}
interface Fixture {
  matchId: string;
  fixtureNumber: number | null;
  stage: string;
  matchName: string;
  teamAName: string;
  teamBName: string;
  status: string;
  scheduledAt: string | null;
}

@Component({
  selector: 'app-tournament-schedule',
  standalone: true,
  imports: [CommonModule, RouterLink, DateTimeFieldComponent],
  templateUrl: './tournament-schedule.component.html',
  styleUrl: './tournament-schedule.component.scss',
})
export class TournamentScheduleComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = 'http://localhost:8080/api';
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  busy = '';
  message = '';
  error = '';
  t: Tournament | null = null;
  fixtures: Fixture[] = [];
  draft: Record<string, string> = {};
  constructor() {
    if (this.id) this.load();
    else this.loading = false;
  }
  load() {
    this.http.get<Tournament>(this.api + '/tournaments/' + this.id).subscribe({
      next: (t) => {
        this.t = t;
        this.http.get<Fixture[]>(this.api + '/tournaments/' + this.id + '/fixtures').subscribe({
          next: (fs) => {
            this.fixtures = fs || [];
            for (const f of this.fixtures)
              if (f.scheduledAt && !this.draft[f.matchId])
                this.draft[f.matchId] = this.toInput(f.scheduledAt);
            this.loading = false;
          },
          error: (e) => {
            this.error = e?.error?.message || 'Unable to load fixtures.';
            this.loading = false;
          },
        });
      },
      error: (e) => {
        this.error = e?.error?.message || 'Tournament could not be loaded.';
        this.loading = false;
      },
    });
  }
  save(f: Fixture) {
    this.busy = f.matchId;
    this.message = '';
    this.error = '';
    this.http
      .post<Fixture>(
        this.api + '/tournaments/' + this.id + '/fixtures/' + f.matchId + '/schedule',
        { scheduledAt: this.toOffset(this.draft[f.matchId]) },
      )
      .subscribe({
        next: (r) => {
          f.scheduledAt = r.scheduledAt;
          this.busy = '';
          this.message = 'Fixture #' + (f.fixtureNumber || '—') + ' scheduled successfully.';
        },
        error: (e) => {
          this.busy = '';
          this.error = e?.error?.message || 'Unable to schedule fixture.';
        },
      });
  }
  private toInput(v: string) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return (
      d.getFullYear() +
      '-' +
      p(d.getMonth() + 1) +
      '-' +
      p(d.getDate()) +
      'T' +
      p(d.getHours()) +
      ':' +
      p(d.getMinutes())
    );
  }
  private toOffset(v: string) {
    const d = new Date(v);
    return d.toISOString();
  }
  format(v: string) {
    return new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
