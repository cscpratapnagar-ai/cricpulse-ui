import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Team {
  id: string;
  name: string;
  city?: string;
  ownerId: string;
}
interface Row {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}
interface Result {
  created: any[];
  skipped: any[];
  createdCount: number;
  skippedCount: number;
}

@Component({
  selector: 'app-bulk-team-players-v2',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bulk-team-players.component.html',
  styleUrl: './bulk-team-players.component.scss',
})
export class BulkTeamPlayersV2Component {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private api = 'http://localhost:8080/api';
  team: Team | null = null;
  rows: Row[] = [];
  count = 15;
  saving = false;
  result: Result | null = null;
  toast = '';
  error = false;
  query = '';
  roleFilter = 'ALL';
  roleOpen = false;
  openRoleIndex: number | null = null;
  presets = [11, 15, 22, 30];
  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id)
      this.http
        .get<Team>(`${this.api}/teams/${id}`)
        .subscribe({
          next: (t) => (this.team = t),
          error: (e) => this.show(e?.error?.message || 'Unable to load team', true),
        });
  }
  get validRows() {
    return this.rows.filter((r) => this.isValid(r));
  }
  get invalidCount() {
    return this.rows.length - this.validRows.length;
  }
  get filteredRows() {
    const q = this.query.trim().toLowerCase();
    return this.rows.filter(
      (r) =>
        (!q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) &&
        (this.roleFilter === 'ALL' || r.role === this.roleFilter),
    );
  }
  setCount(n: number) {
    this.count = n;
    this.generate();
  }
  clampCount() {
    this.count = Math.max(1, Math.min(50, Number(this.count) || 1));
  }
  setRoleFilter(role: string) {
    this.roleFilter = role;
    this.roleOpen = false;
  }
  toggleFilter() {
    this.roleOpen = !this.roleOpen;
    this.openRoleIndex = null;
  }
  toggleRole(index: number) {
    this.openRoleIndex = this.openRoleIndex === index ? null : index;
    this.roleOpen = false;
  }
  selectRole(row: Row, role: string) {
    row.role = role;
    this.openRoleIndex = null;
  }
  roleLabel(role: string) {
    return role === 'VICE_CAPTAIN'
      ? 'Vice captain'
      : role === 'CAPTAIN'
        ? 'Captain'
        : role === 'ALL'
          ? 'All roles'
          : 'Player';
  }
  rowIndex(r: Row) {
    return this.rows.indexOf(r);
  }
  initials(name: string) {
    const p = name.trim().split(/\s+/).filter(Boolean);
    return (
      p
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase() || 'P'
    );
  }
  isValid(r: Row) {
    return (
      r.fullName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) &&
      /^\d{10}$/.test(r.phone)
    );
  }
  generate() {
    this.clampCount();
    const n = this.count,
      stamp = Date.now(),
      slug = (this.team?.name || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    this.rows = Array.from({ length: n }, (_, i) => ({
      fullName: `Player ${String(i + 1).padStart(2, '0')}`,
      email: `player${String(i + 1).padStart(2, '0')}.${stamp}@${slug}.cricpulse.test`,
      phone: String(9000000000 + ((stamp + i * 7919) % 999999999)),
      password: 'Test@12345',
      role: 'PLAYER',
    }));
    this.result = null;
  }
  remove(i: number) {
    this.rows.splice(i, 1);
    this.rows = [...this.rows];
  }
  clear() {
    this.rows = [];
    this.result = null;
    this.query = '';
  }
  create() {
    if (!this.team || !this.rows.length) return;
    if (this.invalidCount) {
      this.show('Fix invalid player details before creating accounts', true);
      return;
    }
    const seen = new Set<string>();
    if (
      this.rows.some((r) => {
        const k = r.email.trim().toLowerCase();
        if (seen.has(k)) return true;
        seen.add(k);
        return false;
      })
    ) {
      this.show('Duplicate email addresses found in the squad', true);
      return;
    }
    this.saving = true;
    this.http
      .post<Result>(`${this.api}/teams/${this.team.id}/players/bulk`, { players: this.rows })
      .subscribe({
        next: (r) => {
          this.result = r;
          this.rows = [];
          this.saving = false;
          this.show(`${r.createdCount} player accounts created and added`, false);
        },
        error: (e) => {
          this.saving = false;
          this.show(e?.error?.message || 'Unable to create players', true);
        },
      });
  }
  show(m: string, e: boolean) {
    this.toast = m;
    this.error = e;
    window.setTimeout(() => (this.toast = ''), 4000);
  }
}
