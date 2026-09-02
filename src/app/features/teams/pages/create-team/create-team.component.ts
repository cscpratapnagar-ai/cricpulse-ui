import { API_BASE_URL } from '../../../../core/config/api.config';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface CreatedTeam {
  id: string;
  name: string;
  city: string | null;
  ownerId: string;
}

@Component({
  selector: 'app-create-team',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './create-team.component.html',
  styleUrl: './create-team.component.scss',
})
export class CreateTeamComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  name = '';
  city = '';
  loading = false;
  error = '';
  nameTouched = false;
  get canSubmit() {
    return this.name.trim().length >= 3 && this.name.trim().length <= 60;
  }
  get displayName() {
    return this.name.trim() || 'Your Team';
  }
  get displayCity() {
    return this.city.trim() || 'Location not set';
  }
  get initials() {
    const words = this.displayName.split(/\s+/).filter(Boolean);
    return (
      words
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase() || 'YT'
    );
  }
  submit(): void {
    this.nameTouched = true;
    const name = this.name.trim();
    if (!this.canSubmit) {
      this.error = name
        ? 'Team name must contain at least 3 characters.'
        : 'Please enter a team name.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.http
      .post<CreatedTeam>(`${API_BASE_URL}/teams`, {
        name,
        city: this.city.trim() || null,
      })
      .subscribe({
        next: (team) => {
          localStorage.setItem('cricketpulse_team', JSON.stringify(team));
          void this.router.navigateByUrl('/teams/' + team.id);
        },
        error: (error) => {
          this.loading = false;
          this.error = error?.error?.message || 'The team could not be created. Please try again.';
        },
      });
  }
}
