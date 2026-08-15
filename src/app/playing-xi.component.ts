import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
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

interface PlayingPlayer {
  teamId: string;
  playerId: string;
  name: string;
  captain: boolean;
  wicketKeeper: boolean;
}

interface TeamState {
  id: string;
  name: string;
  members: Member[];
  selected: PlayingPlayer[];
  captainId: string | null;
  wicketKeeperId: string | null;
}

@Component({
  selector: 'app-playing-xi',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      @if (loading) {
        <div class="loading-card"><div class="pulse"></div><div class="pulse short"></div><div class="pulse"></div></div>
      } @else if (match) {
        <header class="hero">
          <div>
            <a class="back" [routerLink]="['/matches', match.id]">← Back to match</a>
            <div class="eyebrow">MATCH SETUP · PLAYING XI</div>
            <h1>{{ match.name }}</h1>
            <p>{{ match.teamAName || 'Team A' }} <b>vs</b> {{ match.teamBName || 'Team B' }} · {{ match.format }}</p>
          </div>
          <div class="status" [class.locked]="match.status !== 'SCHEDULED'">{{ match.status }}</div>
        </header>

        @if (match.status !== 'SCHEDULED') {
          <div class="notice error">Playing XI is locked because this match is no longer scheduled.</div>
        }

        <div class="teams-grid">
          @for (team of teams; track team.id) {
            <section class="team-panel">
              <header class="team-head">
                <div>
                  <span class="team-label">TEAM {{ $index + 1 }}</span>
                  <h2>{{ team.name }}</h2>
                </div>
                <div class="counter" [class.full]="team.selected.length === 11">{{ team.selected.length }}/11</div>
              </header>

              <div class="role-row">
                <div class="role-box"><span>Captain</span><strong>{{ captainName(team) || 'Not selected' }}</strong></div>
                <div class="role-box"><span>Wicket Keeper</span><strong>{{ keeperName(team) || 'Not selected' }}</strong></div>
              </div>

              <div class="split">
                <div class="available">
                  <div class="subhead"><span>Squad</span><small>{{ team.members.length }} registered</small></div>
                  <div class="player-list">
                    @for (member of team.members; track member.playerId) {
                      <article class="player" [class.selected]="isSelected(team, member.playerId)">
                        <div class="avatar">{{ initials(member.fullName) }}</div>
                        <div class="identity"><strong>{{ member.fullName }}</strong><small>{{ member.role }}</small></div>
                        <button class="select" [disabled]="match.status !== 'SCHEDULED' || (!isSelected(team, member.playerId) && team.selected.length >= 11)" (click)="togglePlayer(team, member)">
                          {{ isSelected(team, member.playerId) ? 'Selected' : 'Select' }}
                        </button>
                      </article>
                    } @empty {
                      <div class="empty">No registered players in this team.</div>
                    }
                  </div>
                </div>

                <div class="selected-panel">
                  <div class="subhead"><span>Playing XI</span><small>Drag/order can be added later</small></div>
                  <div class="xi-list">
                    @for (player of team.selected; track player.playerId; let i = $index) {
                      <article class="xi-player">
                        <span class="number">{{ i + 1 }}</span>
                        <div class="identity"><strong>{{ player.name }}</strong><small>{{ player.captain ? 'Captain' : '' }}{{ player.captain && player.wicketKeeper ? ' · ' : '' }}{{ player.wicketKeeper ? 'Wicket Keeper' : '' }}</small></div>
                        <button class="icon-btn" [disabled]="match.status !== 'SCHEDULED'" (click)="removePlayer(team, player.playerId)">×</button>
                      </article>
                    } @empty {
                      <div class="empty">Select up to 11 players.</div>
                    }
                  </div>

                  <div class="actions">
                    <button class="role-btn" [disabled]="!team.selected.length || match.status !== 'SCHEDULED'" (click)="openRole(team)">Captain / WK</button>
                    <span>{{ team.selected.length }}/11 selected</span>
                  </div>
                </div>
              </div>
            </section>
          }
        </div>

        <section class="bottom-bar">
          <div><strong>Playing XI setup</strong><span>Select 11 players for each side. Captain and wicket keeper are team-specific.</span></div>
          <button class="save" [disabled]="saving || !canSave" (click)="saveAll()">{{ saving ? 'Saving…' : 'Save Playing XI' }}</button>
        </section>

        @if (roleTeam) {
          <div class="modal-backdrop" (click)="closeRole()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-head"><div><span class="eyebrow">TEAM ROLE</span><h3>{{ roleTeam.name }}</h3></div><button class="icon-btn" (click)="closeRole()">×</button></div>
              <label>Captain</label>
              <select [value]="roleTeam.captainId || ''" (change)="setCaptain(roleTeam, $any($event.target).value)">
                <option value="">Select captain</option>
                @for (p of roleTeam.selected; track p.playerId) { <option [value]="p.playerId">{{ p.name }}</option> }
              </select>
              <label>Wicket Keeper</label>
              <select [value]="roleTeam.wicketKeeperId || ''" (change)="setKeeper(roleTeam, $any($event.target).value)">
                <option value="">Select wicket keeper</option>
                @for (p of roleTeam.selected; track p.playerId) { <option [value]="p.playerId">{{ p.name }}</option> }
              </select>
              <button class="save modal-save" (click)="saveRoles(roleTeam)">Save roles</button>
            </div>
          </div>
        }

        @if (toast) { <div class="toast" [class.error]="toastType === 'error'">{{ toast }}</div> }
      } @else {
        <div class="empty-page"><h2>Match not found</h2><a routerLink="/matches">Back to matches</a></div>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.page{max-width:1250px;padding:34px 4vw 120px;color:#edf8f2}.hero{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}.back{display:inline-block;color:#91aa9d;text-decoration:none;font-size:12px;margin-bottom:18px}.back:hover{color:#b8f45c}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}.hero h1{font-size:clamp(38px,5vw,62px);letter-spacing:-3px;line-height:.95;margin:10px 0}.hero p{margin:0;color:#91aa9d}.hero p b{color:#b8f45c;margin:0 7px}.status,.counter{padding:9px 12px;border-radius:999px;background:#b8f45c12;border:1px solid #b8f45c30;color:#b8f45c;font-size:10px;font-weight:900;letter-spacing:1px}.status.locked{color:#ff9b9b;border-color:#ff6b6b33;background:#ff6b6b0d}.notice{padding:14px 16px;border-radius:13px;margin-bottom:18px;font-size:12px}.notice.error{background:#ff6b6b0b;border:1px solid #ff6b6b25;color:#ffb5b5}.teams-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.team-panel{border:1px solid #ffffff15;border-radius:22px;background:linear-gradient(180deg,#0f271ed9,#0a1914f2);box-shadow:0 16px 44px #0005;overflow:hidden}.team-head{padding:22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffffff0d}.team-label{color:#789386;font-size:9px;letter-spacing:1.8px;font-weight:850}.team-head h2{margin:6px 0 0;font-size:25px;letter-spacing:-1px}.counter.full{background:#b8f45c;color:#10251e}.role-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 18px}.role-box{background:#ffffff05;border:1px solid #ffffff0d;border-radius:13px;padding:12px;display:grid;gap:5px}.role-box span{color:#789386;font-size:9px;text-transform:uppercase;letter-spacing:1.3px;font-weight:800}.role-box strong{font-size:12px}.split{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ffffff0d}.available,.selected-panel{padding:16px}.selected-panel{background:#07150f66;border-left:1px solid #ffffff0d}.subhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.subhead span{font-size:12px;font-weight:850}.subhead small{color:#5f776b;font-size:9px}.player-list,.xi-list{display:grid;gap:7px;max-height:430px;overflow:auto}.player,.xi-player{display:flex;align-items:center;gap:9px;padding:9px;border:1px solid #ffffff0c;border-radius:11px;background:#ffffff03}.player.selected{border-color:#b8f45c35;background:#b8f45c09}.avatar{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:#173d2d;color:#b8f45c;font-size:11px;font-weight:900;flex:none}.identity{flex:1;min-width:0;display:grid;gap:3px}.identity strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.identity small{font-size:9px;color:#789386;min-height:10px}.select{border:1px solid #ffffff15;background:#ffffff06;color:#dbe9e1;border-radius:8px;padding:7px 9px;font-size:9px;font-weight:800;cursor:pointer}.player.selected .select{color:#b8f45c;border-color:#b8f45c30}.select:disabled{opacity:.45;cursor:not-allowed}.number{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:#ffffff08;color:#789386;font-size:9px;font-weight:900}.icon-btn{border:0;background:transparent;color:#91aa9d;font-size:20px;cursor:pointer;padding:3px}.icon-btn:hover{color:#ff9b9b}.icon-btn:disabled{opacity:.35}.actions{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #ffffff0c}.actions span{font-size:9px;color:#789386}.role-btn{border:1px solid #b8f45c25;background:#b8f45c0b;color:#b8f45c;border-radius:8px;padding:8px 10px;font-size:9px;font-weight:800;cursor:pointer}.role-btn:disabled{opacity:.35}.bottom-bar{position:sticky;bottom:18px;margin-top:20px;padding:14px 16px;border:1px solid #b8f45c25;border-radius:16px;background:#07150ff2;backdrop-filter:blur(16px);display:flex;justify-content:space-between;align-items:center;gap:16px;box-shadow:0 14px 45px #0008}.bottom-bar strong{display:block;font-size:12px}.bottom-bar span{display:block;color:#789386;font-size:10px;margin-top:4px}.save{border:0;background:#b8f45c;color:#10251e;border-radius:10px;padding:12px 17px;font-weight:900;cursor:pointer}.save:disabled{opacity:.4;cursor:not-allowed}.modal-backdrop{position:fixed;inset:0;background:#0009;display:grid;place-items:center;z-index:1000;padding:20px}.modal{width:min(440px,100%);padding:22px;border-radius:20px;background:#0c2119;border:1px solid #ffffff18;box-shadow:0 25px 80px #000b;display:grid;gap:10px}.modal-head{display:flex;justify-content:space-between;align-items:start;margin-bottom:5px}.modal h3{margin:7px 0 12px;font-size:22px}.modal label{font-size:10px;color:#789386;text-transform:uppercase;letter-spacing:1px;font-weight:800}.modal select{width:100%;background:#081a14;color:#edf8f2;border:1px solid #ffffff18;border-radius:9px;padding:11px}.modal-save{margin-top:8px}.toast{position:fixed;right:24px;bottom:24px;z-index:1200;background:#173d2d;color:#dbe9e1;border:1px solid #b8f45c55;border-radius:12px;padding:13px 16px;box-shadow:0 12px 40px #0008}.toast.error{border-color:#ff6b6b66}.loading-card{max-width:900px;margin:70px auto;padding:35px;border-radius:22px;background:#0c2119}.pulse{height:24px;border-radius:10px;background:linear-gradient(90deg,#ffffff08,#ffffff18,#ffffff08);background-size:200% 100%;animation:shimmer 1.3s linear infinite;margin-bottom:16px}.pulse.short{width:55%;height:48px}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.empty{padding:30px;text-align:center;color:#789386}.empty-page{padding:80px;text-align:center}.empty-page a{color:#b8f45c}@media(max-width:1000px){.teams-grid{grid-template-columns:1fr}}@media(max-width:700px){.page{padding:25px 16px 100px}.hero{align-items:start;flex-direction:column}.split{grid-template-columns:1fr}.selected-panel{border-left:0;border-top:1px solid #ffffff0d}.role-row{grid-template-columns:1fr}.bottom-bar{align-items:stretch;flex-direction:column}.save{width:100%}}
  `]
})
export class PlayingXiComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private readonly api = 'http://localhost:8080/api';

  loading = true;
  saving = false;
  match: Match | null = null;
  teams: TeamState[] = [];
  roleTeam: TeamState | null = null;
  toast = '';
  toastType: 'success' | 'error' = 'success';

  constructor() {
    const matchId = this.route.snapshot.paramMap.get('id');
    if (!matchId) return;
    this.load(matchId);
  }

  load(matchId: string) {
    this.http.get<Match>(`${this.api}/matches/${matchId}`).subscribe({
      next: match => {
        this.match = match;
        const a: TeamState = { id: match.teamAId, name: match.teamAName || 'Team A', members: [], selected: [], captainId: null, wicketKeeperId: null };
        const b: TeamState = { id: match.teamBId, name: match.teamBName || 'Team B', members: [], selected: [], captainId: null, wicketKeeperId: null };
        this.teams = [a, b];
        this.loadTeam(a, matchId);
        this.loadTeam(b, matchId);
      },
      error: e => { this.loading = false; this.showToast(e?.error?.message || 'Unable to load match', 'error'); }
    });
  }

  loadTeam(team: TeamState, matchId: string) {
    this.http.get<Member[]>(`${this.api}/teams/${team.id}/members`).subscribe({
      next: members => {
        team.members = members;
        this.http.get<PlayingPlayer[]>(`${this.api}/matches/${matchId}/playing-xi`).subscribe({
          next: xi => {
            team.selected = xi.filter(p => p.teamId === team.id);
            team.captainId = team.selected.find(p => p.captain)?.playerId || null;
            team.wicketKeeperId = team.selected.find(p => p.wicketKeeper)?.playerId || null;
            this.loading = this.teams.some(t => !t.members.length && !t.selected.length) && false;
            if (this.teams.every(t => t.members.length > 0 || t.selected.length > 0)) this.loading = false;
          },
          error: e => { this.loading = false; this.showToast(e?.error?.message || 'Unable to load Playing XI', 'error'); }
        });
      },
      error: e => { this.loading = false; this.showToast(e?.error?.message || `Unable to load ${team.name} squad`, 'error'); }
    });
  }

  get canSave(): boolean {
    return this.teams.every(t => t.selected.length > 0 && t.selected.length <= 11);
  }

  isSelected(team: TeamState, playerId: string) { return team.selected.some(p => p.playerId === playerId); }

  togglePlayer(team: TeamState, member: Member) {
    if (this.isSelected(team, member.playerId)) {
      this.removePlayer(team, member.playerId);
      return;
    }
    if (team.selected.length >= 11) return this.showToast(`${team.name} already has 11 players.`, 'error');
    this.savePlayer(team, member, false, false);
  }

  savePlayer(team: TeamState, member: Member, captain: boolean, wicketKeeper: boolean) {
    if (!this.match) return;
    this.http.post(`${this.api}/matches/${this.match.id}/playing-xi`, { teamId: team.id, playerId: member.playerId, captain, wicketKeeper }).subscribe({
      next: () => {
        team.selected.push({ teamId: team.id, playerId: member.playerId, name: member.fullName, captain, wicketKeeper });
        if (captain) team.captainId = member.playerId;
        if (wicketKeeper) team.wicketKeeperId = member.playerId;
        this.showToast(`${member.fullName} added to Playing XI`, 'success');
      },
      error: e => this.showToast(e?.error?.message || 'Unable to select player', 'error')
    });
  }

  removePlayer(team: TeamState, playerId: string) {
    if (!this.match) return;
    this.http.delete(`${this.api}/matches/${this.match.id}/playing-xi/${team.id}/${playerId}`).subscribe({
      next: () => {
        const p = team.selected.find(x => x.playerId === playerId);
        team.selected = team.selected.filter(x => x.playerId !== playerId);
        if (team.captainId === playerId) team.captainId = null;
        if (team.wicketKeeperId === playerId) team.wicketKeeperId = null;
        this.showToast(`${p?.name || 'Player'} removed`, 'success');
      },
      error: e => this.showToast(e?.error?.message || 'Unable to remove player', 'error')
    });
  }

  openRole(team: TeamState) { this.roleTeam = team; }
  closeRole() { this.roleTeam = null; }
  setCaptain(team: TeamState, id: string) { team.captainId = id || null; }
  setKeeper(team: TeamState, id: string) { team.wicketKeeperId = id || null; }

  saveRoles(team: TeamState) {
    if (!this.match) return;
    const requests = team.selected.map(p => this.http.post(`${this.api}/matches/${this.match!.id}/playing-xi`, {
      teamId: team.id,
      playerId: p.playerId,
      captain: p.playerId === team.captainId,
      wicketKeeper: p.playerId === team.wicketKeeperId
    }));
    if (!requests.length) return;
    this.saving = true;
    let done = 0;
    let failed = false;
    requests.forEach(req => req.subscribe({
      next: () => { done++; if (done === requests.length && !failed) { this.saving = false; this.roleTeam = null; this.syncRoles(team); this.showToast(`${team.name} roles saved`, 'success'); } },
      error: e => { if (!failed) { failed = true; this.saving = false; this.showToast(e?.error?.message || 'Unable to save roles', 'error'); } }
    }));
  }

  syncRoles(team: TeamState) {
    team.selected = team.selected.map(p => ({ ...p, captain: p.playerId === team.captainId, wicketKeeper: p.playerId === team.wicketKeeperId }));
  }

  saveAll() {
    if (!this.canSave) return this.showToast('Select at least one player for both teams.', 'error');
    this.showToast('Playing XI is already saved as players are selected.', 'success');
  }

  initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
  captainName(team: TeamState) { return team.selected.find(p => p.playerId === team.captainId)?.name; }
  keeperName(team: TeamState) { return team.selected.find(p => p.playerId === team.wicketKeeperId)?.name; }

  showToast(message: string, type: 'success' | 'error') {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => this.toast = '', 3200);
  }
}
