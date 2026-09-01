import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, startWith } from 'rxjs';
import { LiveScore } from '../../../../core/services/live-score.service';
import { ScorecardData } from '../../../models/scorecard.models';
import { ScorecardService } from '../../../data-access/scorecard.service';

@Component({
  selector: 'app-scorecard',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, RouterLink],
  templateUrl: './scorecard.component.html',
  styleUrl: './scorecard.component.scss',
})
export class ScorecardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ScorecardService);
  matchId = this.route.snapshot.paramMap.get('id') || '';
  data: ScorecardData | null = null;
  score$ = of<LiveScore | null>(null);
  constructor() {
    this.load();
  }
  overs(b: number) {
    return `${Math.floor(b / 6)}.${b % 6}`;
  }
  rate(r: number, b: number) {
    return b ? (r / (b / 6)).toFixed(2) : '0.00';
  }
  private load() {
    if (!this.matchId) return;
    this.service
      .getScorecard(this.matchId)
      .pipe(
        catchError(() => of(null)),
        startWith(null),
      )
      .subscribe((data) => {
        if (data) {
          this.data = data;
          this.score$ = of({
            inningsId: data.inningsId,
            matchId: this.matchId,
            inningsNumber: data.inningsNumber,
            runs: data.runs,
            wickets: data.wickets,
            legalBalls: data.legalBalls,
          } as LiveScore);
        }
      });
  }
}
