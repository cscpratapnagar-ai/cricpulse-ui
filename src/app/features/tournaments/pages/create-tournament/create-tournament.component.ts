import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from '../../../../ui/date-time-field.component';
import { CpDropdownComponent, CpDropdownOption } from '../../../../shared/cp-dropdown.component';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface TournamentResponse {
  id: string;
  name: string;
  format: string;
  overs: number;
  location: string | null;
  startDate: string | null;
  status: string;
}

type Step = 1 | 2 | 3;

export interface TournamentDraftInput {
  name: string;
  format: string;
  overs: number;
  startDate: string;
}

export interface TournamentDraftErrors {
  name?: string;
  format?: string;
  overs?: string;
  startDate?: string;
}

export function validateTournamentDraft(draft: TournamentDraftInput): TournamentDraftErrors {
  const errors: TournamentDraftErrors = {};
  const name = (draft.name || '').trim();
  if (!name) errors.name = 'Tournament name is required.';
  else if (name.length < 3) errors.name = 'Use at least 3 characters for the tournament name.';
  else if (name.length > 90) errors.name = 'Tournament name cannot exceed 90 characters.';

  if (!['T10', 'T20', 'ODI', 'TEST'].includes((draft.format || '').toUpperCase())) {
    errors.format = 'Choose a supported match format.';
  }

  const overs = Number(draft.overs);
  if (!Number.isInteger(overs) || overs < 1 || overs > 100) {
    errors.overs = 'Overs must be a whole number between 1 and 100.';
  }

  if (draft.startDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.startDate);
    if (!match) {
      errors.startDate = 'Choose a valid start date.';
    } else {
      const [, year, month, day] = match.map(Number);
      const parsed = new Date(year, month - 1, day);
      if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
      ) {
        errors.startDate = 'The selected calendar date is invalid.';
      }
    }
  }
  return errors;
}

@Component({
  selector: 'app-create-tournament',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DateTimeFieldComponent, CpDropdownComponent],
  templateUrl: './create-tournament.component.html',
  styleUrl: './create-tournament.component.scss',
})
export class CreateTournamentComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly api = API_BASE_URL;
  step: Step = 1;
  saving = false;
  error = '';
  fieldErrors: TournamentDraftErrors = {};
  draft = { name: '', format: 'T20', overs: 20, startDate: '', location: '' };
  readonly steps = [
    { id: 1 as Step, title: 'Basics', copy: 'Identity and format' },
    { id: 2 as Step, title: 'Schedule', copy: 'Date and location' },
    { id: 3 as Step, title: 'Review', copy: 'Confirm and launch' },
  ];
  readonly formatOptions: CpDropdownOption[] = [
    { value: 'T10', label: 'T10' },
    { value: 'T20', label: 'T20' },
    { value: 'ODI', label: 'ODI' },
    { value: 'TEST', label: 'Test' },
  ];

  get formatIcon() {
    const key = this.draft.format.toUpperCase();
    return key === 'TEST' ? '♜' : key === 'ODI' ? '◉' : key === 'T10' ? '⚡' : '🏆';
  }
  clearFieldError(field: keyof TournamentDraftErrors) {
    this.error = '';
    if (this.fieldErrors[field]) {
      const next = { ...this.fieldErrors };
      delete next[field];
      this.fieldErrors = next;
    }
  }
  private validateDraft() {
    this.fieldErrors = validateTournamentDraft(this.draft);
    return Object.keys(this.fieldErrors).length === 0;
  }
  private validateAll() {
    const valid = this.validateDraft();
    if (!valid) {
      this.step = this.fieldErrors.name || this.fieldErrors.format || this.fieldErrors.overs ? 1 : 2;
      this.error = 'Please correct the highlighted fields before creating the tournament.';
    }
    return valid;
  }
  goTo(target: Step) {
    if (this.saving) return;
    if (target < this.step) {
      this.step = target;
      this.error = '';
      return;
    }
    while (this.step < target) {
      if (!this.validateStep()) return;
      this.step = (this.step + 1) as Step;
    }
  }
  next() {
    if (this.saving) return;
    if (this.validateStep()) this.step = (this.step + 1) as Step;
  }
  previous() {
    this.step = (this.step - 1) as Step;
    this.error = '';
  }
  reset() {
    if (this.saving) return;
    this.step = 1;
    this.error = '';
    this.fieldErrors = {};
    this.draft = { name: '', format: 'T20', overs: 20, startDate: '', location: '' };
  }
  private validateStep() {
    this.error = '';
    if (this.step === 1) {
      this.fieldErrors = validateTournamentDraft({ ...this.draft, startDate: '' });
      const valid = Object.keys(this.fieldErrors).length === 0;
      if (!valid) this.error = 'Please correct the highlighted fields before continuing.';
      return valid;
    }
    if (this.step === 2) {
      const dateError = validateTournamentDraft({
        ...this.draft,
        name: 'Valid tournament',
        format: 'T20',
        overs: 20,
      }).startDate;
      this.fieldErrors = dateError ? { startDate: dateError } : {};
      if (dateError) {
        this.error = 'Please select a valid start date.';
        return false;
      }
    }
    return true;
  }
  create() {
    if (this.saving || !this.validateAll()) return;
    this.saving = true;
    this.error = '';
    const payload = {
      name: this.draft.name.trim(),
      format: this.draft.format,
      overs: Number(this.draft.overs),
      startDate: this.draft.startDate || null,
      location: this.draft.location.trim() || null,
    };
    this.http.post<TournamentResponse>(`${this.api}/tournaments`, payload).subscribe({
      next: (t) => {
        this.saving = false;
        this.router.navigate(['/tournaments', t.id]);
      },
      error: (e) => {
        this.saving = false;
        this.error = e?.error?.message || 'Unable to create tournament. Please try again.';
      },
    });
  }
}
