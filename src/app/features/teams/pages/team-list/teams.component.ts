import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { StateViewComponent } from '../../../../state-view.component';
import { Router, RouterLink } from '@angular/router';

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
  teams: Team[] = [];
  activeTeam: Team | null = null;
  activeTeamId: string | null = null;
  loading = true;
  error = false;
  constructor() {
    this.loadTeams();
  }
  loadTeams() {
    this.loading = true;
    this.error = false;
    this.http.get<Team[]>('http://localhost:8080/api/teams/mine').subscribe({
      next: (teams) => {
        this.teams = teams;
        const saved = localStorage.getItem('cricketpulse_active_team_id');
        this.activeTeam = teams.find((t) => t.id === saved) || teams[0] || null;
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
  createTeam() {
    this.router.navigate(['/dashboard/teams/new']);
  }
  selectTeam(t: Team) {
    this.activeTeam = t;
    this.activeTeamId = t.id;
    localStorage.setItem('cricketpulse_active_team_id', t.id);
  }
  openTeam(t: Team) {
    this.selectTeam(t);
    this.router.navigate(['/dashboard/teams', t.id]);
  }
}
