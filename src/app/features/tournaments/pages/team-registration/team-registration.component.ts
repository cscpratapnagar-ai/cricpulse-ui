import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface RegistrationPlayer {
  fullName: string;
  jerseyNumber: number | null;
  battingStyle: string;
  bowlingStyle: string;
}
interface Registration {
  id: string;
  teamName: string;
  city: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  players: RegistrationPlayer[];
}

@Component({
  selector: 'app-team-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './team-registration.component.html',
  styleUrl: './team-registration.component.scss',
})
export class TeamRegistrationComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = API_BASE_URL;
  readonly tournamentId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly manageMode = this.route.snapshot.routeConfig?.path === 'tournaments/:id/registrations';
  teamName = '';
  city = '';
  contactName = '';
  contactEmail = '';
  contactPhone = '';
  players: RegistrationPlayer[] = Array.from({ length: 11 }, (_, index) => ({
    fullName: '',
    jerseyNumber: index + 1,
    battingStyle: '',
    bowlingStyle: '',
  }));
  registrations: Registration[] = [];
  loading = false;
  submitting = false;
  error = '';
  message = '';
  reviewBusy = '';
  registrationOpen = false;
  registrationSettingsLoading = false;
  registrationSettingsBusy = false;
  constructor() {
    if (this.manageMode) {
      this.loadRegistrations();
      this.loadRegistrationSettings();
    }
  }
  addPlayer(): void {
    if (this.players.length < 30)
      this.players.push({ fullName: '', jerseyNumber: null, battingStyle: '', bowlingStyle: '' });
  }
  removePlayer(index: number): void {
    if (this.players.length > 2) this.players.splice(index, 1);
  }
  submit(): void {
    this.error = '';
    this.message = '';
    const players = this.players.filter((player) => player.fullName.trim());
    if (players.length < 2 || players.length > 30) {
      this.error = 'Add between 2 and 30 players with names.';
      return;
    }
    const jerseys = players.map((player) => player.jerseyNumber);
    if (
      jerseys.some((number) => number === null || number < 0 || number > 999) ||
      new Set(jerseys).size !== jerseys.length
    ) {
      this.error = 'Every player needs a unique jersey number between 0 and 999.';
      return;
    }
    this.submitting = true;
    this.http
      .post<Registration>(
        `${this.api}/public/tournaments/${encodeURIComponent(this.tournamentId)}/registrations`,
        {
          teamName: this.teamName,
          city: this.city,
          contactName: this.contactName,
          contactEmail: this.contactEmail,
          contactPhone: this.contactPhone,
          players,
        },
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          this.message = 'Registration submitted. The organizer will review your application.';
          this.teamName = '';
          this.city = '';
          this.players = Array.from({ length: 11 }, (_, index) => ({
            fullName: '',
            jerseyNumber: index + 1,
            battingStyle: '',
            bowlingStyle: '',
          }));
        },
        error: (e) => {
          this.submitting = false;
          this.error =
            e?.error?.message || 'Registration could not be submitted. Please try again.';
        },
      });
  }
  loadRegistrationSettings(): void {
    this.registrationSettingsLoading = true;
    this.http
      .get<{ open: boolean }>(`${this.api}/tournaments/${encodeURIComponent(this.tournamentId)}/registration`)
      .subscribe({
        next: (settings) => {
          this.registrationOpen = settings.open;
          this.registrationSettingsLoading = false;
        },
        error: () => {
          this.registrationSettingsLoading = false;
        },
      });
  }
  toggleRegistration(): void {
    this.registrationSettingsBusy = true;
    this.error = '';
    this.http
      .patch<{ open: boolean }>(`${this.api}/tournaments/${encodeURIComponent(this.tournamentId)}/registration`, {
        open: !this.registrationOpen,
        deadline: null,
      })
      .subscribe({
        next: (settings) => {
          this.registrationOpen = settings.open;
          this.registrationSettingsBusy = false;
          this.message = settings.open ? 'Public team registration is now open.' : 'Public team registration is closed.';
        },
        error: (e) => {
          this.registrationSettingsBusy = false;
          this.error = e?.error?.message || 'Unable to update registration settings.';
        },
      });
  }
  loadRegistrations(): void {
    this.loading = true;
    this.error = '';
    this.http
      .get<
        Registration[]
      >(`${this.api}/tournaments/${encodeURIComponent(this.tournamentId)}/registrations`)
      .subscribe({
        next: (rows) => {
          this.registrations = rows;
          this.loading = false;
        },
        error: (e) => {
          this.error = e?.error?.message || 'Unable to load registrations.';
          this.loading = false;
        },
      });
  }
  review(row: Registration, status: 'APPROVED' | 'REJECTED'): void {
    this.reviewBusy = row.id;
    this.error = '';
    this.http
      .patch<Registration>(
        `${this.api}/tournaments/${encodeURIComponent(this.tournamentId)}/registrations/${encodeURIComponent(row.id)}`,
        { status },
      )
      .subscribe({
        next: () => {
          this.reviewBusy = '';
          this.message = `${row.teamName} ${status.toLowerCase()}.`;
          this.loadRegistrations();
        },
        error: (e) => {
          this.reviewBusy = '';
          this.error = e?.error?.message || 'Review action failed.';
        },
      });
  }
}
