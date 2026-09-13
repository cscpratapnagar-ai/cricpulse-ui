import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { StateViewComponent } from '../../../../shared/components/state-view/state-view.component';

interface Team {
  id: string;
  name: string;
  city?: string;
  ownerId: string;
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

  readonly skeletonItems = Array.from({ length: 6 }, (_, index) => index);
  teams: Team[] = [];
  activeTeam: Team | null = null;
  activeTeamId: string | null = null;
  loading = true;
  error = false;

  get uniqueCities(): number {
    return new Set(this.teams.map((team) => team.city?.trim()).filter(Boolean)).size;
  }

  constructor() {
    this.loadTeams();
  }

  loadTeams(): void {
    this.loading = true;
    this.error = false;
    this.http.get<Team[]>(`${API_BASE_URL}/teams/mine`).subscribe({
      next: (teams) => {
        this.teams = teams;
        const saved = localStorage.getItem('cricketpulse_active_team_id');
        this.activeTeam = teams.find((team) => team.id === saved) || teams[0] || null;
        this.activeTeamId = this.activeTeam?.id || null;
        this.loading = false;
      },
      error: () => {
        this.teams = [];
        this.activeTeam = null;
        this.activeTeamId = null;
        this.error = true;
        this.loading = false;
      },
    });
  }

  createTeam(): void {
    this.router.navigate(['/dashboard/teams/new']);
  }

  selectTeam(team: Team): void {
    this.activeTeam = team;
    this.activeTeamId = team.id;
    localStorage.setItem('cricketpulse_active_team_id', team.id);
  }

  openTeam(team: Team): void {
    this.selectTeam(team);
    this.router.navigate(['/dashboard/teams', team.id]);
  }
}
