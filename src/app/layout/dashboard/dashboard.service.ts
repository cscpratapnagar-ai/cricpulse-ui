import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { CurrentUserService } from '../../core/services/current-user.service';

export interface DashboardTeam {
  id: string;
  name: string;
  city: string;
  ownerId: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly currentUserService = inject(CurrentUserService);

  private readonly teamState = signal<DashboardTeam | null>(null);
  private readonly teamLoadingState = signal(false);
  private readonly teamErrorState = signal(false);

  readonly user = computed(() => this.currentUserService.user());
  readonly team = this.teamState.asReadonly();
  readonly teamLoading = this.teamLoadingState.asReadonly();
  readonly teamError = this.teamErrorState.asReadonly();

  loadWorkspace(): void {
    if (this.teamLoadingState()) return;

    this.teamLoadingState.set(true);
    this.teamErrorState.set(false);

    this.http
      .get<DashboardTeam[]>(`${API_BASE_URL}/teams/mine`)
      .pipe(
        catchError(() => {
          this.teamErrorState.set(true);
          return of([] as DashboardTeam[]);
        }),
      )
      .subscribe((teams) => {
        this.teamState.set(teams[0] ?? null);
        this.teamLoadingState.set(false);
      });
  }
}
