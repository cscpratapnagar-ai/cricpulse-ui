import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from '../../../../ui/date-time-field.component';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';

interface Team { id: string; name: string; }

@Component({
  selector: 'app-create-match', standalone: true,
  imports: [FormsModule, RouterLink, SelectFieldComponent, DateTimeFieldComponent],
  templateUrl: './create-match.component.html',
  styleUrl: './create-match.component.scss'

})
export class CreateMatchComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  teams: Team[] = []; loading = false; error = '';
  form = { name: '', format: 'T20', overs: 20, teamAId: '', teamBId: '', scheduledAt: '', venue: '' };
  formatOptions: SelectOption[] = [{value:'T20',label:'T20'}, {value:'T10',label:'T10'}, {value:'ODI',label:'ODI'}, {value:'TEST',label:'Test'}, {value:'CUSTOM',label:'Custom format'}];
  get teamOptions(): SelectOption[] { return this.teams.map(team => ({ value: team.id, label: team.name })); }
  constructor() { this.loadTeams(); }
  loadTeams(): void { const saved = localStorage.getItem('cricketpulse_team'); const active = saved ? JSON.parse(saved) as Team : null; this.http.get<Team[]>('http://localhost:8080/api/teams').subscribe({ next: teams => { this.teams = teams; this.form.teamAId = active?.id || teams[0]?.id || ''; }, error: () => { if (active) { this.teams = [active]; this.form.teamAId = active.id; } } }); }
  submit(): void {
    this.error = '';
    if (!this.form.name.trim() || !this.form.teamAId || !this.form.teamBId) { this.error = 'Complete the match name and select both teams.'; return; }
    if (this.form.teamAId === this.form.teamBId) { this.error = 'Your team and opponent must be different teams.'; return; }
    this.loading = true;
    this.http.post('http://localhost:8080/api/matches', { name: this.form.name.trim(), format: this.form.format, teamAId: this.form.teamAId, teamBId: this.form.teamBId, scheduledAt: this.form.scheduledAt ? new Date(this.form.scheduledAt).toISOString() : null }).subscribe({ next: () => void this.router.navigateByUrl('/matches'), error: () => { this.loading = false; this.error = 'Match could not be created. Check the selected teams and try again.'; } });
  }
}
