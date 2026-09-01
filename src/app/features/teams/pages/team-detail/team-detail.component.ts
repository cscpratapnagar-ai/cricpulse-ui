import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { StateViewComponent } from '../../../../state-view.component';

interface Team {
  id: string;
  name: string;
  city?: string;
  ownerId: string;
}
interface Member {
  teamId: string;
  playerId: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
}
interface TeamAccess {
  teamId: string;
  role: string;
  canManage: boolean;
}
type Tab = 'overview' | 'squad' | 'management';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, StateViewComponent],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.scss',
})
export class TeamDetailComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  history = window.history;
  team: Team | null = null;
  members: Member[] = [];
  access: TeamAccess | null = null;
  loading = true;
  loadError = false;
  tab: Tab = 'overview';
  query = '';
  roleFilter = 'ALL';
  roleFilterOpen = false;
  email = '';
  role = 'PLAYER';
  addRoleOpen = false;
  memberRoleOpen: string | null = null;
  showAdd = false;
  saving = false;
  readonly roleFilterOptions = [
    { value: 'ALL', label: 'All roles', icon: '◉' },
    { value: 'OWNER', label: 'Owner', icon: '◆' },
    { value: 'MANAGER', label: 'Manager', icon: '◈' },
    { value: 'CAPTAIN', label: 'Captain', icon: '★' },
    { value: 'VICE_CAPTAIN', label: 'Vice captain', icon: '✦' },
    { value: 'PLAYER', label: 'Player', icon: '●' },
  ];
  readonly addRoleOptions = [
    { value: 'PLAYER', label: 'Player', icon: '●' },
    { value: 'CAPTAIN', label: 'Captain', icon: '★' },
    { value: 'VICE_CAPTAIN', label: 'Vice captain', icon: '✦' },
    { value: 'MANAGER', label: 'Manager', icon: '◈' },
  ];
  readonly memberRoleOptions = [
    { value: 'OWNER', label: 'Owner', icon: '◆' },
    { value: 'MANAGER', label: 'Manager', icon: '◈' },
    { value: 'CAPTAIN', label: 'Captain', icon: '★' },
    { value: 'VICE_CAPTAIN', label: 'Vice captain', icon: '✦' },
    { value: 'PLAYER', label: 'Player', icon: '●' },
  ];
  toast = '';
  toastType: 'success' | 'error' = 'success';
  confirmMember: Member | null = null;

  constructor() {
    this.reload();
  }
  reload() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.loadError = true;
      return;
    }
    this.loading = true;
    this.loadError = false;
    this.http.get<Team>(`http://localhost:8080/api/teams/${id}`).subscribe({
      next: (t) => {
        this.team = t;
        this.loadAccess(id);
        this.loadMembers(id);
      },
      error: (e) => {
        this.loading = false;
        this.loadError = true;
        this.showToast(e?.error?.message || 'Unable to load team', 'error');
      },
    });
  }
  loadAccess(id: string) {
    this.http.get<TeamAccess>(`http://localhost:8080/api/teams/${id}/access`).subscribe({
      next: (x) => (this.access = x),
      error: (e) => this.showToast(e?.error?.message || 'Unable to load team access', 'error'),
    });
  }
  loadMembers(id: string) {
    this.http.get<Member[]>(`http://localhost:8080/api/teams/${id}/members`).subscribe({
      next: (x) => {
        this.members = x || [];
        this.loading = false;
      },
      error: (e) => {
        this.members = [];
        this.loading = false;
        this.showToast(e?.error?.message || 'Unable to load squad', 'error');
      },
    });
  }
  setTab(tab: Tab) {
    this.tab = tab;
    this.closeDropdowns();
  }
  closeDropdowns() {
    this.roleFilterOpen = false;
    this.addRoleOpen = false;
    this.memberRoleOpen = null;
  }
  toggleRoleFilter() {
    const next = !this.roleFilterOpen;
    this.closeDropdowns();
    this.roleFilterOpen = next;
  }
  toggleAddRole() {
    const next = !this.addRoleOpen;
    this.closeDropdowns();
    this.addRoleOpen = next;
  }
  toggleMemberRole(playerId: string) {
    const next = this.memberRoleOpen === playerId ? null : playerId;
    this.closeDropdowns();
    this.memberRoleOpen = next;
  }
  get roleFilterLabel() {
    return this.roleFilterOptions.find((x) => x.value === this.roleFilter)?.label || 'All roles';
  }
  get addRoleLabel() {
    return this.addRoleOptions.find((x) => x.value === this.role)?.label || 'Player';
  }
  roleLabel(value: string) {
    return this.memberRoleOptions.find((x) => x.value === value)?.label || value.replace('_', ' ');
  }
  setRoleFilter(value: string) {
    this.roleFilter = value;
    this.closeDropdowns();
  }
  setAddRole(value: string) {
    this.role = value;
    this.closeDropdowns();
  }
  selectMemberRole(member: Member, value: string) {
    this.closeDropdowns();
    if (value !== member.role) this.changeRole(member, value);
  }
  get activePlayers() {
    return this.members.filter(
      (x) => x.role === 'PLAYER' || x.role === 'CAPTAIN' || x.role === 'VICE_CAPTAIN',
    ).length;
  }
  count(role: string) {
    return this.members.filter((x) => x.role === role).length;
  }
  get squadHealth() {
    if (!this.members.length) return 0;
    return Math.min(
      100,
      Math.round((this.activePlayers / Math.max(11, this.members.length)) * 100),
    );
  }
  get roleSummary() {
    const total = Math.max(1, this.members.length);
    return [
      {
        label: 'Players',
        count: this.count('PLAYER'),
        percent: (this.count('PLAYER') / total) * 100,
      },
      {
        label: 'Leadership',
        count: this.count('CAPTAIN') + this.count('VICE_CAPTAIN'),
        percent: ((this.count('CAPTAIN') + this.count('VICE_CAPTAIN')) / total) * 100,
      },
      {
        label: 'Management',
        count: this.count('MANAGER'),
        percent: (this.count('MANAGER') / total) * 100,
      },
    ];
  }
  get filteredMembers() {
    const q = this.query.trim().toLowerCase();
    return this.members.filter(
      (m) =>
        (!q || m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) &&
        (this.roleFilter === 'ALL' || m.role === this.roleFilter),
    );
  }
  addMember() {
    if (!this.team || !this.email.trim() || !this.access?.canManage || this.saving) return;
    this.saving = true;
    this.http
      .post<Member>(`http://localhost:8080/api/teams/${this.team.id}/members`, {
        email: this.email.trim(),
        role: this.role,
      })
      .subscribe({
        next: (m) => {
          this.members = [...this.members.filter((x) => x.playerId !== m.playerId), m];
          this.email = '';
          this.role = 'PLAYER';
          this.addRoleOpen = false;
          this.showAdd = false;
          this.saving = false;
          this.showToast(`${m.fullName} added to ${this.team!.name}`, 'success');
        },
        error: (e) => {
          this.saving = false;
          this.showToast(e?.error?.message || 'Unable to add player', 'error');
        },
      });
  }
  changeRole(m: Member, role: string) {
    this.memberRoleOpen = null;
    if (!this.team || !this.access?.canManage || m.role === 'OWNER' || this.saving) return;
    this.saving = true;
    this.http
      .patch<Member>(`http://localhost:8080/api/teams/${this.team.id}/members/${m.playerId}`, {
        role,
      })
      .subscribe({
        next: (x) => {
          m.role = x.role;
          this.saving = false;
          this.showToast(`${m.fullName} is now ${x.role.replace('_', ' ')}`, 'success');
        },
        error: (e) => {
          this.saving = false;
          this.showToast(e?.error?.message || 'Unable to change role', 'error');
        },
      });
  }
  requestRemove(m: Member) {
    if (m.role !== 'OWNER') this.confirmMember = m;
  }
  removeConfirmed() {
    const m = this.confirmMember;
    if (!this.team || !m || !this.access?.canManage || this.saving) return;
    this.saving = true;
    this.http
      .delete(`http://localhost:8080/api/teams/${this.team.id}/members/${m.playerId}`)
      .subscribe({
        next: () => {
          this.members = this.members.filter((x) => x.playerId !== m.playerId);
          this.confirmMember = null;
          this.saving = false;
          this.showToast(`${m.fullName} removed from the team`, 'success');
        },
        error: (e) => {
          this.saving = false;
          this.showToast(e?.error?.message || 'Unable to remove player', 'error');
        },
      });
  }
  showToast(message: string, type: 'success' | 'error') {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => (this.toast = ''), 3500);
  }
}
