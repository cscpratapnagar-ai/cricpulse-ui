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
  role: 'OWNER' | 'MANAGER' | 'CAPTAIN' | 'VICE_CAPTAIN' | 'PLAYER';
  canManage: boolean;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly currentUserService = inject(CurrentUserService);

  private readonly teamState = signal<DashboardTeam | null>(null);
  private readonly workspacesState = signal<DashboardTeam[]>([]);
  private readonly teamLoadingState = signal(false);
  private readonly teamErrorState = signal(false);

  readonly user = computed(() => this.currentUserService.user());
  readonly team = this.teamState.asReadonly();
  readonly workspaces = this.workspacesState.asReadonly();
  readonly teamLoading = this.teamLoadingState.asReadonly();
  readonly teamError = this.teamErrorState.asReadonly();

  loadWorkspace(): void {
    if (this.teamLoadingState()) return;

    this.teamLoadingState.set(true);
    this.teamErrorState.set(false);

    this.http
      .get<DashboardTeam[]>(`${API_BASE_URL}/teams/workspaces`)
      .pipe(
        catchError(() => {
          this.teamErrorState.set(true);
          return of(null);
        }),
      )
      .subscribe((workspaces) => {
        if (workspaces) {
          this.workspacesState.set(workspaces);
          const savedId = localStorage.getItem('cricketpulse_active_team_id');
          const selected =
            workspaces.find((workspace) => workspace.id === savedId) ?? workspaces[0] ?? null;
          this.teamState.set(selected);
          if (selected) localStorage.setItem('cricketpulse_active_team_id', selected.id);
          else localStorage.removeItem('cricketpulse_active_team_id');
        }
        this.teamLoadingState.set(false);
      });
  }

  selectWorkspace(teamId: string): boolean {
    const selected = this.workspacesState().find((workspace) => workspace.id === teamId);
    if (!selected) return false;
    this.teamState.set(selected);
    localStorage.setItem('cricketpulse_active_team_id', selected.id);
    return true;
  }
}
