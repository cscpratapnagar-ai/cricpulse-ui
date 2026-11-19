import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { DashboardService } from '../../../../layout/dashboard/dashboard.service';
import { StateViewComponent } from '../../../../shared/components/state-view/state-view.component';

interface Team {
  id: string;
  name: string;
  city?: string;
  ownerId: string;
  role: 'OWNER' | 'MANAGER' | 'CAPTAIN' | 'VICE_CAPTAIN' | 'PLAYER';
  canManage: boolean;
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [RouterLink, StateViewComponent],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss',
})
export class TeamsComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dashboard = inject(DashboardService);

  readonly skeletonItems = Array.from({ length: 6 }, (_, index) => index);
  teams: Team[] = [];
  activeTeam: Team | null = null;
  activeTeamId: string | null = null;
  loading = true;
  refreshing = false;
  error = false;
  refreshError = false;
  private hasLoaded = false;

  get uniqueCities(): number {
    return new Set(this.teams.map((team) => team.city?.trim()).filter(Boolean)).size;
  }

  constructor() {
    this.loadTeams();
  }

  loadTeams(): void {
    this.loading = !this.hasLoaded;
    this.refreshing = this.hasLoaded;
    this.error = false;
    this.refreshError = false;
    this.http.get<Team[]>(`${API_BASE_URL}/teams/workspaces`).subscribe({
      next: (teams) => {
        this.teams = teams;
        const saved = localStorage.getItem('cricketpulse_active_team_id');
        this.activeTeam = teams.find((team) => team.id === saved) || teams[0] || null;
        this.activeTeamId = this.activeTeam?.id || null;
        this.hasLoaded = true;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        this.loading = false;
        this.refreshing = false;
        if (this.hasLoaded) {
          this.refreshError = true;
          return;
        }
        this.error = true;
      },
    });
  }

  createTeam(): void {
    this.router.navigate(['/dashboard/teams/new']);
  }

  roleLabel(role: Team['role']): string {
    switch (role) {
      case 'OWNER':
        return 'OWNER';
      case 'MANAGER':
        return 'MANAGER';
      case 'CAPTAIN':
        return 'CAPTAIN';
      case 'VICE_CAPTAIN':
        return 'VICE-CAPTAIN';
      default:
        return 'PLAYER';
    }
  }

  selectTeam(team: Team): void {
    this.activeTeam = team;
    this.activeTeamId = team.id;
    localStorage.setItem('cricketpulse_active_team_id', team.id);
    this.dashboard.selectWorkspace(team.id);
  }

  openTeam(team: Team): void {
    this.selectTeam(team);
    this.router.navigate(['/dashboard/teams', team.id]);
  }
}
