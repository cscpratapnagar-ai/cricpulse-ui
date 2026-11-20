import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';
import { API_BASE_URL } from '../../../../core/config/api.config';
interface Tournament {
  id: string;
  name: string;
  format: string;
  overs: number;
  location: string | null;
  startDate: string | null;
  status: string;
}
interface Team {
  id: string;
  name: string;
  city: string | null;
  seed: number | null;
  ownerId?: string;
}
interface Match {
  id: string;
  name: string;
  status: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}
interface Fixture {
  matchId: string;
  fixtureNumber: number | null;
  stage: string;
  matchName: string;
  teamAName: string;
  teamBName: string;
  status: string;
  scheduledAt?: string | null;
}
type MatchStaffRole = 'SCORER' | 'UMPIRE' | 'COMMENTATOR' | 'STREAMER';
interface MatchStaff {
  matchId: string;
  userId: string;
  fullName: string;
  email: string | null;
  role: MatchStaffRole;
  assignedAt: string;
}
interface StaffCandidate {
  userId: string;
  fullName: string;
  email: string | null;
}
interface TournamentManager {
  tournamentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  role: 'MANAGER';
  assignedAt: string;
}
interface ManagerCandidate {
  userId: string;
  fullName: string;
  email: string | null;
}
interface TournamentManagersResponse {
  managers: TournamentManager[];
  canManage: boolean;
}
interface Point {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  nrr: number;
}
interface GenerateResponse {
  tournamentId: string;
  generated: number;
  skipped: number;
  totalPairs: number;
  fixtures: Fixture[];
}
@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SelectFieldComponent],
  templateUrl: './tournament-detail.component.html',
  styleUrl: './tournament-detail.component.premium.scss',
})
export class TournamentDetailComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = API_BASE_URL;
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  busy = false;
  editing = false;
  savingEdit = false;
  statusChanging = false;
  editErrors: Record<string, string> = {};
  editDraft = { name: '', format: 'T20', overs: 20, location: '', startDate: '' };
  actionError = '';
  actionMessage = '';
  activeTab = signal<'overview' | 'operations' | 'teams' | 'fixtures' | 'standings' | 'analytics'>(
    'overview',
  );
  tabs = [
    { key: 'overview' as const, label: 'Overview', icon: '◈' },
    { key: 'operations' as const, label: 'Operations', icon: '⌘' },
    { key: 'teams' as const, label: 'Teams', icon: '♜' },
    { key: 'fixtures' as const, label: 'Fixtures', icon: '▦' },
    { key: 'standings' as const, label: 'Standings', icon: '≡' },
    { key: 'analytics' as const, label: 'Analytics', icon: '↗' },
  ];
  t: Tournament | null = null;
  teams: Team[] = [];
  availableTeams: Team[] = [];
  fixtures: Fixture[] = [];
  availableMatches: Match[] = [];
  points: Point[] = [];
  teamToAdd = '';
  matchToAdd = '';
  staffPanelMatchId: string | null = null;
  staffAssignments: MatchStaff[] = [];
  staffCandidates: StaffCandidate[] = [];
  staffSearch = '';
  selectedStaffCandidateId = '';
  selectedStaffRole: MatchStaffRole = 'SCORER';
  staffLoading = false;
  staffSearching = false;
  staffBusy = false;
  staffError = '';
  staffMessage = '';
  managerPanelOpen = false;
  tournamentManagers: TournamentManager[] = [];
  managerCandidates: ManagerCandidate[] = [];
  managerSearch = '';
  selectedManagerCandidateId = '';
  managerLoading = false;
  managerSearching = false;
  managerBusy = false;
  managerError = '';
  managerMessage = '';
  canManageManagers = false;
  readonly staffRoles: { value: MatchStaffRole; label: string }[] = [
    { value: 'SCORER', label: 'Scorer' },
    { value: 'STREAMER', label: 'Broadcast operator' },
    { value: 'UMPIRE', label: 'Umpire' },
    { value: 'COMMENTATOR', label: 'Commentator' },
  ];
  constructor() {
    if (this.id) this.load();
    else this.loading = false;
  }
  load() {
    this.http.get<Tournament>(`${this.api}/tournaments/${this.id}`).subscribe({
      next: (t) => {
        this.t = t;
        this.loadChildren();
      },
      error: (e) => {
        this.actionError = e?.error?.message || 'Tournament could not be loaded.';
        this.loading = false;
      },
    });
  }
  loadChildren() {
    forkJoin({
      registered: this.http.get<Team[]>(`${this.api}/tournaments/${this.id}/teams`),
      mine: this.http.get<Team[]>(`${this.api}/teams/mine`),
      fixtures: this.http.get<Fixture[]>(`${this.api}/tournaments/${this.id}/fixtures`),
      matches: this.http.get<Match[]>(`${this.api}/matches`),
      points: this.http.get<Point[]>(`${this.api}/tournaments/${this.id}/points-table`),
    }).subscribe({
      next: (r) => {
        this.teams = r.registered || [];
        const registeredIds = new Set(this.teams.map((x) => x.id));
        this.availableTeams = (r.mine || []).filter((x) => !registeredIds.has(x.id));
        this.fixtures = r.fixtures || [];
        const fixtureIds = new Set(this.fixtures.map((f) => f.matchId));
        this.availableMatches = (r.matches || []).filter(
          (m) =>
            !fixtureIds.has(m.id) && registeredIds.has(m.teamAId) && registeredIds.has(m.teamBId),
        );
        this.points = r.points || [];
        this.teamToAdd = '';
        if (this.matchToAdd && !this.availableMatches.some((m) => m.id === this.matchToAdd))
          this.matchToAdd = '';
        this.loading = false;
      },
      error: (e) => {
        this.actionError =
          e?.error?.message || 'Unable to load tournament data. Please refresh and try again.';
        this.loading = false;
      },
    });
  }
  get teamOptions(): SelectOption[] {
    return this.availableTeams.map((x) => ({
      value: x.id,
      label: x.city ? `${x.name} · ${x.city}` : x.name,
    }));
  }
  get matchOptions(): SelectOption[] {
    return this.availableMatches.map((m) => ({
      value: m.id,
      label: `${m.name} · ${m.teamAName || 'Team A'} vs ${m.teamBName || 'Team B'} · ${m.status}`,
    }));
  }
  addTeam() {
    if (!this.teamToAdd) {
      this.actionError = 'Select a team first.';
      return;
    }
    this.busy = true;
    this.actionError = '';
    this.actionMessage = '';
    this.http.post(`${this.api}/tournaments/${this.id}/teams/${this.teamToAdd}`, null).subscribe({
      next: () => {
        this.teamToAdd = '';
        this.busy = false;
        this.actionMessage = 'Team added successfully.';
        this.loadChildren();
      },
      error: (e) => {
        this.actionError = e?.error?.message || 'Unable to add team.';
        this.busy = false;
      },
    });
  }
  linkMatch() {
    if (!this.matchToAdd) {
      this.actionError = 'Select an eligible match first.';
      return;
    }
    const selected = this.availableMatches.find((m) => m.id === this.matchToAdd);
    const registered = new Set(this.teams.map((t) => t.id));
    if (!selected || !registered.has(selected.teamAId) || !registered.has(selected.teamBId)) {
      this.actionError = 'Both teams in the selected match must be registered in this tournament.';
      return;
    }
    this.busy = true;
    this.actionError = '';
    this.actionMessage = '';
    this.http
      .post(`${this.api}/tournaments/${this.id}/matches/${this.matchToAdd}?stage=LEAGUE`, null)
      .subscribe({
        next: () => {
          this.matchToAdd = '';
          this.busy = false;
          this.actionMessage = 'Fixture linked successfully.';
          this.loadChildren();
        },
        error: (e) => {
          this.actionError =
            e?.error?.message || 'Unable to link match. Make sure both teams are registered.';
          this.busy = false;
        },
      });
  }
  generateFixtures() {
    if (this.teams.length < 2) {
      this.actionError = 'Add at least 2 teams before generating fixtures.';
      return;
    }
    this.busy = true;
    this.actionError = '';
    this.actionMessage = '';
    this.http
      .post<GenerateResponse>(`${this.api}/tournaments/${this.id}/fixtures/generate`, null)
      .subscribe({
        next: (r) => {
          this.busy = false;
          this.actionMessage = r.generated
            ? `${r.generated} league fixture${r.generated === 1 ? '' : 's'} generated. ${r.skipped} existing pairing${r.skipped === 1 ? '' : 's'} preserved.`
            : 'All team pairings already have fixtures.';
          this.loadChildren();
        },
        error: (e) => {
          this.busy = false;
          this.actionError = e?.error?.message || 'Unable to generate fixtures.';
        },
      });
  }
  get completed() {
    return this.fixtures.filter((x) => x.status === 'COMPLETED').length;
  }
  get scheduled() {
    return this.fixtures.filter((x) => x.status === 'SCHEDULED').length;
  }
  get pending() {
    return this.fixtures.length - this.completed - this.scheduled - this.liveFixtures.length;
  }
  get completion() {
    return this.fixtures.length ? Math.round((this.completed / this.fixtures.length) * 100) : 0;
  }
  get liveFixtures() {
    return this.fixtures.filter((fixture) => fixture.status === 'LIVE');
  }
  get upcomingFixtures() {
    return this.fixtures.filter((fixture) => fixture.status === 'SCHEDULED');
  }
  get completedFixtures() {
    return this.fixtures.filter((fixture) => fixture.status === 'COMPLETED');
  }
  workflowRoute(fixture: Fixture): string[] {
    if (fixture.status === 'LIVE') return ['/matches', fixture.matchId, 'live-scoring'];
    if (fixture.status === 'COMPLETED') return ['/matches', fixture.matchId, 'result'];
    return ['/matches', fixture.matchId, 'playing-xi'];
  }
  workflowAction(fixture: Fixture): string {
    if (fixture.status === 'LIVE') return 'Open live scoring';
    if (fixture.status === 'COMPLETED') return 'View match result';
    return 'Continue match setup';
  }
  scheduledLabel(value?: string | null): string {
    if (!value) return 'Time not scheduled';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Schedule needs review'
      : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
  toggleManagerPanel() {
    this.managerPanelOpen = !this.managerPanelOpen;
    if (this.managerPanelOpen) this.loadTournamentManagers();
  }
  loadTournamentManagers() {
    this.managerLoading = true;
    this.managerError = '';
    this.http
      .get<TournamentManagersResponse>(`${this.api}/tournaments/${this.id}/staff`)
      .subscribe({
        next: (response) => {
          this.tournamentManagers = response?.managers || [];
          this.canManageManagers = !!response?.canManage;
          this.managerLoading = false;
        },
        error: (error) => {
          this.managerLoading = false;
          this.managerError = error?.error?.message || 'Unable to load tournament organisers.';
        },
      });
  }
  searchManagerCandidates() {
    const query = this.managerSearch.trim();
    if (query.length < 2) {
      this.managerError = 'Enter at least 2 characters to search registered user accounts.';
      return;
    }
    this.managerSearching = true;
    this.managerError = '';
    this.http
      .get<
        ManagerCandidate[]
      >(`${this.api}/tournaments/${this.id}/staff/candidates?q=${encodeURIComponent(query)}`)
      .subscribe({
        next: (candidates) => {
          this.managerCandidates = candidates || [];
          this.selectedManagerCandidateId = this.managerCandidates[0]?.userId || '';
          this.managerSearching = false;
        },
        error: (error) => {
          this.managerSearching = false;
          this.managerError = error?.error?.message || 'Unable to search organiser accounts.';
        },
      });
  }
  assignTournamentManager() {
    if (!this.selectedManagerCandidateId) {
      this.managerError = 'Search and select a registered user account first.';
      return;
    }
    this.managerBusy = true;
    this.managerError = '';
    this.managerMessage = '';
    this.http
      .put(`${this.api}/tournaments/${this.id}/staff/manager`, {
        userId: this.selectedManagerCandidateId,
      })
      .subscribe({
        next: () => {
          this.managerBusy = false;
          this.managerMessage = 'Tournament manager access granted.';
          this.selectedManagerCandidateId = '';
          this.managerCandidates = [];
          this.loadTournamentManagers();
        },
        error: (error) => {
          this.managerBusy = false;
          this.managerError = error?.error?.message || 'Unable to assign tournament manager.';
        },
      });
  }
  removeTournamentManager(manager: TournamentManager) {
    this.managerBusy = true;
    this.managerError = '';
    this.managerMessage = '';
    this.http
      .delete(`${this.api}/tournaments/${this.id}/staff/manager/${manager.userId}`)
      .subscribe({
        next: () => {
          this.managerBusy = false;
          this.managerMessage = `${manager.fullName} no longer has tournament manager access.`;
          this.loadTournamentManagers();
        },
        error: (error) => {
          this.managerBusy = false;
          this.managerError = error?.error?.message || 'Unable to remove tournament manager.';
        },
      });
  }
  toggleStaffPanel(fixture: Fixture) {
    if (this.staffPanelMatchId === fixture.matchId) {
      this.staffPanelMatchId = null;
      return;
    }
    this.staffPanelMatchId = fixture.matchId;
    this.staffAssignments = [];
    this.staffCandidates = [];
    this.staffSearch = '';
    this.selectedStaffCandidateId = '';
    this.staffError = '';
    this.staffMessage = '';
    this.loadMatchStaff(fixture.matchId);
  }
  loadMatchStaff(matchId = this.staffPanelMatchId) {
    if (!matchId) return;
    this.staffLoading = true;
    this.staffError = '';
    this.http.get<MatchStaff[]>(`${this.api}/matches/${matchId}/staff`).subscribe({
      next: (staff) => {
        if (this.staffPanelMatchId === matchId) this.staffAssignments = staff || [];
        this.staffLoading = false;
      },
      error: (e) => {
        this.staffLoading = false;
        this.staffError =
          e?.status === 403
            ? 'Only the tournament owner, team owner, manager or captain can manage match staff.'
            : e?.error?.message || 'Unable to load assigned match staff.';
      },
    });
  }
  searchStaffCandidates() {
    const matchId = this.staffPanelMatchId;
    const query = this.staffSearch.trim();
    if (!matchId) return;
    if (query.length < 2) {
      this.staffError = 'Enter at least 2 characters to search user accounts.';
      return;
    }
    this.staffSearching = true;
    this.staffError = '';
    this.http
      .get<
        StaffCandidate[]
      >(`${this.api}/matches/${matchId}/staff/candidates?q=${encodeURIComponent(query)}`)
      .subscribe({
        next: (candidates) => {
          this.staffCandidates = candidates || [];
          this.selectedStaffCandidateId = this.staffCandidates[0]?.userId || '';
          this.staffSearching = false;
        },
        error: (e) => {
          this.staffSearching = false;
          this.staffError = e?.error?.message || 'Unable to search user accounts.';
        },
      });
  }
  assignMatchStaff() {
    const matchId = this.staffPanelMatchId;
    if (!matchId || !this.selectedStaffCandidateId) {
      this.staffError = 'Search and select a registered user account first.';
      return;
    }
    this.staffBusy = true;
    this.staffError = '';
    this.staffMessage = '';
    this.http
      .put<MatchStaff>(
        `${this.api}/matches/${matchId}/staff/${this.selectedStaffRole.toLowerCase()}`,
        { userId: this.selectedStaffCandidateId },
      )
      .subscribe({
        next: (assignment) => {
          this.staffBusy = false;
          this.staffMessage = `${assignment.fullName} assigned as ${this.staffRoleLabel(assignment.role)}.`;
          this.selectedStaffCandidateId = '';
          this.loadMatchStaff(matchId);
        },
        error: (e) => {
          this.staffBusy = false;
          this.staffError = e?.error?.message || 'Unable to assign match staff.';
        },
      });
  }
  removeMatchStaff(assignment: MatchStaff) {
    const matchId = this.staffPanelMatchId;
    if (!matchId) return;
    this.staffBusy = true;
    this.staffError = '';
    this.staffMessage = '';
    this.http
      .delete(
        `${this.api}/matches/${matchId}/staff/${assignment.role.toLowerCase()}/${assignment.userId}`,
      )
      .subscribe({
        next: () => {
          this.staffBusy = false;
          this.staffMessage = `${assignment.fullName} removed from this match.`;
          this.loadMatchStaff(matchId);
        },
        error: (e) => {
          this.staffBusy = false;
          this.staffError = e?.error?.message || 'Unable to remove match staff.';
        },
      });
  }
  staffRoleLabel(role: MatchStaffRole) {
    return this.staffRoles.find((item) => item.value === role)?.label || role;
  }
  beginEdit() {
    if (!this.t || this.t.status !== 'DRAFT' || this.savingEdit) return;
    this.editDraft = {
      name: this.t.name,
      format: this.t.format,
      overs: this.t.overs,
      location: this.t.location || '',
      startDate: this.t.startDate || '',
    };
    this.editErrors = {};
    this.actionError = '';
    this.editing = true;
  }
  cancelEdit() {
    if (this.savingEdit) return;
    this.editing = false;
    this.editErrors = {};
  }
  validateEdit(): boolean {
    const errors: Record<string, string> = {};
    const name = this.editDraft.name.trim();
    if (!name) errors['name'] = 'Tournament name is required.';
    else if (name.length < 3 || name.length > 90)
      errors['name'] = 'Name must be between 3 and 90 characters.';
    if (!['T10', 'T20', 'ODI', 'TEST'].includes(this.editDraft.format.toUpperCase())) {
      errors['format'] = 'Choose a supported tournament format.';
    }
    const overs = Number(this.editDraft.overs);
    if (!Number.isInteger(overs) || overs < 1 || overs > 100) {
      errors['overs'] = 'Overs must be a whole number between 1 and 100.';
    }
    if (this.editDraft.location.trim().length > 120) {
      errors['location'] = 'Location cannot exceed 120 characters.';
    }
    if (this.editDraft.startDate) {
      const match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(this.editDraft.startDate);
      if (!match) errors['startDate'] = 'Choose a valid start date.';
      else {
        const [, year, month, day] = match.map(Number);
        const parsed = new Date(year, month - 1, day);
        if (
          parsed.getFullYear() !== year ||
          parsed.getMonth() !== month - 1 ||
          parsed.getDate() !== day
        ) {
          errors['startDate'] = 'The selected calendar date is invalid.';
        }
      }
    }
    this.editErrors = errors;
    return Object.keys(errors).length === 0;
  }
  saveEdit() {
    if (!this.t || this.savingEdit || !this.editing || this.t.status !== 'DRAFT') return;
    if (!this.validateEdit()) return;
    this.savingEdit = true;
    this.actionError = '';
    const payload = {
      name: this.editDraft.name.trim(),
      format: this.editDraft.format.toUpperCase(),
      overs: Number(this.editDraft.overs),
      location: this.editDraft.location.trim() || null,
      startDate: this.editDraft.startDate || null,
    };
    this.http.patch<Tournament>(`${this.api}/tournaments/${this.id}`, payload).subscribe({
      next: (updated) => {
        this.t = updated;
        this.savingEdit = false;
        this.editing = false;
        this.actionMessage = 'Tournament details saved successfully.';
      },
      error: (error) => {
        this.savingEdit = false;
        this.actionError =
          error?.error?.message || 'Unable to save tournament details. Please try again.';
      },
    });
  }
  changeStatus(target: 'ACTIVE' | 'COMPLETED') {
    if (!this.t || this.statusChanging || this.busy) return;
    const prompt =
      target === 'ACTIVE'
        ? 'Activate this tournament? Make sure at least two teams and one fixture are ready.'
        : 'Mark this tournament as completed? This is allowed only after every fixture is completed.';
    if (!window.confirm(prompt)) return;
    this.statusChanging = true;
    this.actionError = '';
    this.actionMessage = '';
    this.http
      .patch<Tournament>(`${this.api}/tournaments/${this.id}/status`, { status: target })
      .subscribe({
        next: (updated) => {
          this.t = updated;
          this.statusChanging = false;
          this.actionMessage =
            target === 'ACTIVE'
              ? 'Tournament is now active.'
              : 'Tournament completed successfully.';
        },
        error: (error) => {
          this.statusChanging = false;
          this.actionError = error?.error?.message || 'Unable to change tournament status.';
        },
      });
  }
  refresh() {
    this.loading = true;
    this.actionError = '';
    this.load();
  }
}
