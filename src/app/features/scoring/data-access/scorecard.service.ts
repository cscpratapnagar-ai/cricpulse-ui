import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScorecardData } from './scorecard.models';

@Injectable({ providedIn: 'root' })
export class ScorecardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api';

  getScorecard(matchId: string): Observable<ScorecardData> {
    if (!matchId) throw new Error('Match ID is required');
    return this.http.get<ScorecardData>(`${this.apiUrl}/matches/${matchId}/scorecard`);
  }
}
