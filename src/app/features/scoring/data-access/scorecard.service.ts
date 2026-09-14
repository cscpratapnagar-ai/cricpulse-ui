import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScorecardData } from '../models/scorecard.models';
import { API_BASE_URL } from '../../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class ScorecardService {
  private readonly http = inject(HttpClient);

  getScorecard(matchId: string): Observable<ScorecardData> {
    if (!matchId) throw new Error('Match ID is required');
    return this.http.get<ScorecardData>(`${API_BASE_URL}/matches/${matchId}/scorecard`);
  }
}
