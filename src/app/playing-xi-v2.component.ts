import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from './ui/select-field.component';

interface Match { id:string; name:string; format:string; status:string; teamAId:string; teamBId:string; teamAName?:string; teamBName?:string; }
interface Member { teamId:string; playerId:string; userId:string; fullName:string; email:string; phone?:string; role:string; }
interface XIPlayer { teamId:string; playerId:string; name:string; captain:boolean; viceCaptain:boolean; wicketKeeper:boolean; }
interface TeamState { id:string; name:string; members:Member[]; selected:XIPlayer[]; captainId:string|null; viceCaptainId:string|null; wicketKeeperId:string|null; loading:boolean; accessible:boolean; }

@Component({
  selector:'app-playing-xi-v2', standalone:true, imports:[CommonModule,RouterLink,SelectFieldComponent],
  template:`
  <section class="xi-page">
    @if (loadingMatch) {
      <div class="loading-shell"><div class="shimmer mini"></div><div class="shimmer title"></div><div class="shimmer sub"></div><div class="loading-grid"><div class="shimmer card"></div><div class="shimmer card"></div></div></div>
    } @else if (match) {
      <a class="back-link" [routerLink]="['/matches',match.id]"><span>←</span> Match command center</a>

      <header class="hero">
        <div class="hero-top">
          <div class="eyebrow"><i></i> Matchday setup · Step 1 of 4</div>
          <div class="status"><span></span>{{match.status}}</div>
        </div>
        <div class="hero-main">
          <div class="hero-copy"><h1>Playing XI</h1><p>Build the matchday squads, assign leadership and lock in the players who take the field.</p></div>
          <div class="fixture-mini"><span>{{match.format}}</span><b>VS</b><small>11 players per side</small></div>
        </div>
        <div class="teams-line">
          <div><i>{{(match.teamAName||'A').slice(0,1)}}</i><strong [title]="match.teamAName||'Team A'">{{match.teamAName||'Team A'}}</strong></div>
          <span>VS</span>
          <div class="away"><strong [title]="match.teamBName||'Team B'">{{match.teamBName||'Team B'}}</strong><i class="alt">{{(match.teamBName||'B').slice(0,1)}}</i></div>
        </div>
      </header>

      @if (match.status !== 'SCHEDULED') { <div class="notice"><b>Selection locked</b><span>This match has progressed beyond setup, so Playing XI can no longer be changed.</span></div> }

      <section class="progress">
        <div class="progress-summary"><div class="progress-icon">01</div><div class="progress-copy"><span>Selection progress</span><b>{{(teams[0]?.selected?.length || 0)+(teams[1]?.selected?.length || 0)}} <small>of 22 players selected</small></b></div></div>
        <div class="progress-center"><div class="progress-track"><i [style.width.%]="((teams[0]?.selected?.length || 0)+(teams[1]?.selected?.length || 0))/22*100"></i></div><span>{{(((teams[0]?.selected?.length || 0)+(teams[1]?.selected?.length || 0))/22*100) | number:'1.0-0'}}% complete</span></div>
        <div class="progress-meta"><span class="step-status">Step 1 of 4</span><span class="save-status"><i></i>Changes save automatically</span></div>
      </section>

      <div class="team-grid">
        @for (team of teams; track team.id; let teamIndex=$index) {
          <section class="team-card">
            <header class="team-head">
              <div class="team-identity"><div class="team-badge" [class.away-badge]="teamIndex===1">{{teamIndex===0?'A':'B'}}</div><div><span>{{teamIndex===0?'Home side':'Away side'}}</span><h2 [title]="team.name">{{team.name}}</h2></div></div>
              <div class="count"><b>{{team.selected.length}}</b><span>/ 11</span></div>
            </header>

            @if (team.loading) { <div class="loading">Loading squad intelligence…</div> }
            @else if (!team.accessible) {
              <div class="access-denied"><div class="lock">⌁</div><b>Team-managed squad</b><p>You can review this fixture, but this team's lineup is controlled by its team manager.</p></div>
              <div class="roles read-only">
                <div><small>Captain</small><strong>{{roleName(team,team.captainId) || 'Not selected'}}</strong></div><div><small>Vice-captain</small><strong>{{roleName(team,team.viceCaptainId) || 'Not selected'}}</strong></div><div><small>Wicketkeeper</small><strong>{{roleName(team,team.wicketKeeperId) || 'Not selected'}}</strong></div>
              </div>
            } @else {
              <section class="roles-panel">
                <div class="section-label"><div><span>Match leadership</span><b>Assign key roles</b></div><button class="save-role" [disabled]="saving || match.status!=='SCHEDULED' || !team.selected.length" (click)="saveRoles(team)">{{saving?'Saving…':'Save roles'}}</button></div>
                <div class="role-grid">
                  <app-select-field label="Captain" name="captain" placeholder="Select captain" [options]="roleOptions(team)" [(value)]="team.captainId" />
                  <app-select-field label="Vice Captain" name="viceCaptain" placeholder="Select vice captain" [options]="roleOptions(team)" [(value)]="team.viceCaptainId" />
                  <app-select-field label="Wicket Keeper" name="wicketKeeper" placeholder="Select keeper" [options]="roleOptions(team)" [(value)]="team.wicketKeeperId" />
                </div>
              </section>

              <div class="selection-board">
                <section class="squad-list">
                  <div class="workspace-head">
                    <div>
                      <span>Match squad</span>
                      <h3>Select players</h3>
                      <p>Choose up to 11 players for this match.</p>
                    </div>
                    <div class="head-count"><b>{{team.selected.length}}</b><span>selected</span></div>
                  </div>

                  <div class="squad-table">
                    <div class="table-labels"><span>Player</span><span>Role</span><span>Selection</span></div>
                    <div class="players-scroll">
                      @for (m of team.members; track m.playerId; let i=$index) {
                        <article class="squad-row" [class.selected]="isSelected(team,m.playerId)" (click)="match.status==='SCHEDULED' && toggle(team,m)">
                          <div class="player-main">
                            <div class="row-number">{{i+1 | number:'2.0'}}</div>
                            <div class="avatar">{{initials(m.fullName)}}</div>
                            <div class="player-copy"><b [title]="m.fullName">{{m.fullName}}</b><small>Available for selection</small></div>
                          </div>
                          <div class="role-pill">{{m.role || 'Player'}}</div>
                          <button type="button" [class.selected-action]="isSelected(team,m.playerId)" [disabled]="match.status!=='SCHEDULED' || (!isSelected(team,m.playerId) && team.selected.length>=11)" (click)="$event.stopPropagation(); toggle(team,m)">
                            <i>{{isSelected(team,m.playerId)?'✓':'+'}}</i><span>{{isSelected(team,m.playerId)?'Selected':'Add'}}</span>
                          </button>
                        </article>
                      } @empty { <div class="empty">No registered players are available for this side.</div> }
                    </div>
                  </div>
                </section>

                <aside class="xi-list">
                  <div class="xi-stage">
                    <div class="xi-top">
                      <div><span>Playing XI</span><h3>{{team.selected.length === 11 ? 'Lineup complete' : 'Match lineup'}}</h3></div>
                      <div class="xi-count"><b>{{team.selected.length}}</b><span>/11</span></div>
                    </div>
                    <p class="xi-subtitle">{{team.selected.length === 11 ? 'All players are ready for matchday.' : 'Select players to complete your matchday lineup.'}}</p>
                    <div class="xi-progress"><i [style.width.%]="team.selected.length/11*100"></i></div>

                    <div class="xi-scroll">
                      @for (p of team.selected; track p.playerId; let i=$index) {
                        <article class="xi-row">
                          <div class="order">{{i+1}}</div>
                          <div class="xi-avatar">{{initials(p.name)}}</div>
                          <div class="player-copy">
                            <b [title]="p.name">{{p.name}}</b>
                            <div class="tags">@if(p.captain){<span>Captain</span>} @if(p.viceCaptain){<span>Vice-captain</span>} @if(p.wicketKeeper){<span>Wicketkeeper</span>} @if(!p.captain&&!p.viceCaptain&&!p.wicketKeeper){<small>Playing XI</small>}</div>
                          </div>
                          <button [disabled]="match.status!=='SCHEDULED'" (click)="remove(team,p.playerId)" title="Remove player"><span>×</span></button>
                        </article>
                      }
                      @for (slot of [1,2,3,4,5,6,7,8,9,10,11]; track slot) {
                        @if (slot > team.selected.length) {
                          <div class="xi-slot"><span>{{slot}}</span><i></i><small>Open position</small></div>
                        }
                      }
                    </div>

                    <div class="xi-footer">
                      <div><i></i><span>{{team.selected.length === 11 ? 'Selection complete' : (11-team.selected.length) + ' positions remaining'}}</span></div>
                      <small>Changes save automatically</small>
                    </div>
                  </div>
                </aside>
              </div>
            }
          </section>
        }
      </div>

      <div class="sticky-bar">
        <div class="sticky-state"><i></i><div><span>Changes save instantly</span><b>Player selections are synced to the match</b></div></div>
        <a [routerLink]="['/matches',match.id,'toss']" class="continue" [class.disabled]="!isSelectionComplete()" [attr.aria-disabled]="!isSelectionComplete()">Continue to Toss <b>→</b></a>
      </div>

      @if(toast){<div class="toast"><i>✓</i>{{toast}}</div>}
    }
  </section>`,
  styles:[`
:host{display:block}.xi-page{position:relative;max-width:1380px;margin:0 auto;padding:38px 4vw 118px;color:var(--cp-text);--ink:var(--cp-text);--muted:var(--cp-text-muted);--line:var(--cp-border);--strong:var(--cp-border-strong);--surface:var(--cp-surface);--raised:var(--cp-surface-raised);--accent:var(--cp-accent);--accent-soft:var(--cp-accent-soft)}
.back-link{display:inline-flex;align-items:center;gap:8px;margin-bottom:26px;color:var(--muted);text-decoration:none;font-size:13px;font-weight:800;letter-spacing:1.5px;transition:.2s}.back-link span{font-size:16px}.back-link:hover{color:var(--accent);transform:translateX(-2px)}
.hero{padding:27px 29px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,var(--surface),var(--raised));box-shadow:0 24px 65px color-mix(in srgb,#000 10%,transparent)}.hero-top,.hero-main{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.eyebrow{display:flex;align-items:center;gap:8px;color:var(--accent);font-size:14px;font-weight:800;letter-spacing:.8px}.eyebrow i,.sticky-state>i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}.status{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:14px;font-weight:800;letter-spacing:.6px}.status span{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}.hero-main{align-items:flex-end;margin-top:18px}.hero-copy{min-width:0}.hero h1{margin:0 0 7px;color:var(--ink);font-size:clamp(30px,4vw,50px);line-height:1;letter-spacing:-2px}.hero p{max-width:660px;margin:0;color:var(--muted);font-size:14px;line-height:1.6}.fixture-mini{display:grid;justify-items:end;gap:5px;min-width:115px;text-align:right}.fixture-mini span{padding:5px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:14px;font-weight:800;letter-spacing:.6px}.fixture-mini b{font-size:17px;letter-spacing:2px}.fixture-mini small{color:var(--muted);font-size:8px;letter-spacing:1px}
.teams-line{display:grid;grid-template-columns:minmax(0,1fr) 76px minmax(0,1fr);align-items:center;gap:15px;margin-top:24px;padding:15px 18px;border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--cp-text) 2%,transparent)}.teams-line>div{display:flex;align-items:center;gap:10px;min-width:0}.teams-line .away{justify-content:flex-end;text-align:right}.teams-line i{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 28%,var(--line));border-radius:11px;background:var(--accent-soft);color:var(--accent);font-style:normal;font-weight:900}.teams-line i.alt{color:#5799e8;background:color-mix(in srgb,#5799e8 10%,transparent);border-color:color-mix(in srgb,#5799e8 25%,var(--line))}.teams-line strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.teams-line>span{text-align:center;color:var(--muted);font-size:13px;font-weight:800;letter-spacing:1.5px}
.notice{display:flex;align-items:center;gap:12px;margin-top:14px;padding:13px 15px;border:1px solid color-mix(in srgb,#e9636b 25%,var(--line));border-radius:12px;background:color-mix(in srgb,#e9636b 6%,transparent);font-size:14px}.notice b{color:#e9636b}.notice span{color:var(--muted)}
.progress{display:grid;grid-template-columns:minmax(235px,.9fr) minmax(220px,1.2fr) minmax(250px,.9fr);align-items:center;gap:26px;margin:18px 0;padding:18px 22px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 4%,var(--surface)),var(--surface));box-shadow:0 10px 30px color-mix(in srgb,#000 4%,transparent)}.progress-summary{display:flex;align-items:center;gap:13px}.progress-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 24%,var(--line));color:var(--accent);font-size:11px;font-weight:900}.progress-copy{display:grid;gap:5px}.progress-copy>span{color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.35px}.progress-copy b{font-size:16px}.progress-copy small{color:var(--muted);font-size:11px;font-weight:600}.progress-center{display:grid;gap:8px}.progress-track{height:7px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--cp-text) 7%,transparent)}.progress-track i{display:block;height:100%;min-width:3px;border-radius:inherit;background:var(--accent);box-shadow:0 0 16px color-mix(in srgb,var(--accent) 50%,transparent);transition:width .35s ease}.progress-center>span{color:var(--muted);font-size:10px;font-weight:700}.progress-meta{display:flex;align-items:center;justify-content:flex-end;gap:16px}.step-status{color:var(--muted);font-size:11px;font-weight:800;white-space:nowrap}.save-status{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--line));border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:800;white-space:nowrap}.save-status i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent)}.team-grid{display:grid;grid-template-columns:1fr;gap:18px}.team-card{min-width:0;border:1px solid var(--line);border-radius:21px;background:var(--surface);overflow:hidden;box-shadow:0 15px 42px color-mix(in srgb,#000 6%,transparent)}.team-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:20px;border-bottom:1px solid var(--line)}.team-identity{display:flex;align-items:center;gap:11px;min-width:0}.team-badge{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:13px;background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 26%,var(--line));color:var(--accent);font-weight:900}.away-badge{color:#5799e8;background:color-mix(in srgb,#5799e8 10%,transparent);border-color:color-mix(in srgb,#5799e8 24%,var(--line))}.team-identity span,.section-label span,.roles small{display:block;color:var(--muted);font-size:14px;font-weight:800;letter-spacing:.65px}.team-identity h2{max-width:280px;margin:4px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px;letter-spacing:-.5px}.count{display:flex;align-items:baseline;gap:3px;padding:8px 10px;border-radius:10px;background:var(--accent-soft);color:var(--accent)}.count b{font-size:17px}.count span{font-size:9px;font-weight:800}
.roles-panel{position:relative;z-index:20;padding:15px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--cp-text) 1.5%,transparent)}.section-label{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:11px}.section-label>div{display:grid;gap:3px}.section-label b{font-size:13px}.section-label em{color:var(--muted);font-size:10px;font-style:normal}.save-role{border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));border-radius:8px;padding:7px 10px;background:var(--accent);color:var(--cp-accent-contrast);font-size:13px;font-weight:800;cursor:pointer;transition:.2s}.save-role:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 18%,transparent)}.save-role:disabled{opacity:.45;cursor:not-allowed}.role-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.selection-board{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(360px,.85fr);min-height:610px;background:var(--surface)}.squad-list{min-width:0;padding:26px 28px}.xi-list{min-width:0;padding:18px;border-left:1px solid var(--line);background:color-mix(in srgb,var(--cp-text) 1.5%,transparent)}
.workspace-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:23px}.workspace-head span,.xi-top>div>span{display:block;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.65px}.workspace-head h3,.xi-top h3{margin:6px 0 5px;font-size:22px;letter-spacing:-.65px}.workspace-head p,.xi-subtitle{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.head-count{display:grid;justify-items:end;padding:3px 0}.head-count b{color:var(--accent);font-size:25px;line-height:1}.head-count span{margin-top:4px;color:var(--muted);font-size:9px;font-weight:700;letter-spacing:.4px}
.squad-table{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:color-mix(in srgb,var(--cp-text) 1%,var(--surface))}.table-labels{display:grid;grid-template-columns:minmax(0,1fr) 105px 94px;gap:12px;padding:11px 16px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--cp-text) 2.5%,transparent);color:var(--muted);font-size:10px;font-weight:800;letter-spacing:.45px}.table-labels span:last-child{text-align:center}.players-scroll,.xi-scroll{max-height:500px;overflow:auto}.squad-row{display:grid;grid-template-columns:minmax(0,1fr) 105px 94px;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line);cursor:pointer;transition:background .16s,border-color .16s}.squad-row:last-child{border-bottom:0}.squad-row:hover{background:color-mix(in srgb,var(--cp-text) 3%,transparent)}.squad-row.selected{background:linear-gradient(90deg,var(--accent-soft),transparent)}.player-main{display:flex;align-items:center;gap:10px;min-width:0}.row-number{width:20px;flex:0 0 20px;color:var(--muted);font-size:10px;font-weight:800}.avatar,.xi-avatar{display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 16%,var(--line));background:var(--raised);color:var(--accent);font-weight:900}.avatar{width:36px;height:36px;flex:0 0 36px;border-radius:10px;font-size:10px}.player-copy{min-width:0;flex:1;display:grid;gap:3px}.player-copy>b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.player-copy small{color:var(--muted);font-size:10px}.role-pill{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px}.squad-row button{justify-self:end;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:78px;height:31px;padding:0 9px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font-size:10px;font-weight:800;cursor:pointer}.squad-row button i{font-style:normal;font-size:14px;line-height:1}.squad-row button:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}.squad-row button.selected-action{border-color:color-mix(in srgb,var(--accent) 40%,var(--line));background:var(--accent-soft);color:var(--accent)}.squad-row button:disabled{opacity:.45;cursor:not-allowed}
.xi-stage{height:100%;padding:22px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(160deg,color-mix(in srgb,var(--cp-text) 2.5%,var(--surface)),var(--surface));display:flex;flex-direction:column}.xi-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.xi-top h3{font-size:21px}.xi-count{display:flex;align-items:baseline;gap:2px;padding:8px 10px;border-radius:10px;background:var(--accent-soft);color:var(--accent)}.xi-count b{font-size:20px;line-height:1}.xi-count span{font-size:10px;font-weight:800}.xi-subtitle{margin-top:4px}.xi-progress{height:5px;overflow:hidden;margin:17px 0;border-radius:999px;background:color-mix(in srgb,var(--cp-text) 7%,transparent)}.xi-progress i{display:block;height:100%;min-width:2px;border-radius:inherit;background:var(--accent);box-shadow:0 0 14px color-mix(in srgb,var(--accent) 45%,transparent);transition:width .25s ease}
.xi-scroll{flex:1;min-height:330px;padding-right:3px}.xi-row{display:flex;align-items:center;gap:10px;margin-bottom:7px;padding:8px 9px;border:1px solid var(--line);border-radius:12px;background:var(--surface);transition:.16s}.xi-row:hover{border-color:var(--strong);transform:translateX(1px)}.order{width:20px;flex:0 0 20px;text-align:center;color:var(--muted);font-size:10px;font-weight:900}.xi-avatar{width:33px;height:33px;flex:0 0 33px;border-radius:9px;font-size:9px}.tags{display:flex;align-items:center;gap:4px;min-height:14px}.tags span{padding:3px 6px;border-radius:5px;background:var(--accent-soft);color:var(--accent);font-size:8px;font-weight:800}.tags small{color:var(--muted);font-size:9px}.xi-row>button{width:27px;height:27px;flex:0 0 27px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}.xi-row>button span{font-size:19px;font-weight:300}.xi-row>button:hover:not(:disabled){background:color-mix(in srgb,#e9636b 10%,transparent);color:#e9636b}.xi-row>button:disabled{opacity:.4}
.xi-slot{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:10px;height:51px;margin-bottom:7px;padding:0 10px;border:1px dashed var(--strong);border-radius:12px;color:var(--muted)}.xi-slot>span{font-size:10px;font-weight:800;text-align:center}.xi-slot i{height:1px;background:color-mix(in srgb,var(--cp-text) 8%,transparent)}.xi-slot small{font-size:10px}.xi-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line);font-size:10px}.xi-footer>div{display:flex;align-items:center;gap:7px;color:var(--accent);font-weight:800}.xi-footer i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 9px var(--accent)}.xi-footer small{color:var(--muted);font-size:9px}
.empty,.loading{padding:35px 15px;text-align:center;color:var(--muted);font-size:14px}.access-denied{padding:38px 28px;text-align:center}.lock{width:42px;height:42px;margin:0 auto 12px;display:grid;place-items:center;border-radius:13px;background:var(--accent-soft);color:var(--accent);font-size:19px}.access-denied b{font-size:14px}.access-denied p{margin:7px auto 0;max-width:360px;color:var(--muted);font-size:14px;line-height:1.6}.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px;border-top:1px solid var(--line)}.roles div{min-width:0;padding:10px;border:1px solid var(--line);border-radius:10px;background:color-mix(in srgb,var(--cp-text) 2%,transparent);display:grid;gap:5px}.roles strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
.sticky-bar{position:sticky;z-index:15;bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:18px;padding:12px 14px 12px 17px;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--line));border-radius:15px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(18px);box-shadow:0 18px 48px color-mix(in srgb,#000 15%,transparent)}.sticky-state{display:flex;align-items:center;gap:10px}.sticky-state>i{animation:pulse 1.8s infinite}.sticky-state>div{display:grid;gap:3px}.sticky-state span{color:var(--accent);font-size:14px;font-weight:800;letter-spacing:.65px}.sticky-state b{color:var(--muted);font-size:9px;font-weight:500}.continue{display:inline-flex;align-items:center;gap:14px;height:42px;padding:0 14px;border-radius:10px;background:var(--accent);color:var(--cp-accent-contrast);font-size:13px;font-weight:800;text-decoration:none;transition:.2s}.continue:hover{transform:translateY(-2px);box-shadow:0 12px 25px color-mix(in srgb,var(--accent) 22%,transparent)}.continue.disabled{opacity:.42;pointer-events:none;filter:saturate(.35)}
.toast{position:fixed;right:22px;bottom:24px;z-index:1500;display:flex;align-items:center;gap:9px;padding:11px 14px;border:1px solid color-mix(in srgb,var(--accent) 25%,var(--line));border-radius:11px;background:var(--surface);box-shadow:0 16px 40px color-mix(in srgb,#000 18%,transparent);font-size:14px;animation:toastIn .22s ease-out}.toast i{width:19px;height:19px;display:grid;place-items:center;border-radius:50%;background:var(--accent);color:var(--cp-accent-contrast);font-style:normal;font-weight:900}
.loading-shell{padding:30px;border:1px solid var(--line);border-radius:24px;background:var(--surface);display:grid;gap:13px}.shimmer{background:linear-gradient(90deg,color-mix(in srgb,var(--cp-text) 3%,transparent),color-mix(in srgb,var(--cp-text) 8%,transparent),color-mix(in srgb,var(--cp-text) 3%,transparent));background-size:200% 100%;animation:shimmer 1.2s linear infinite}.shimmer.mini{width:140px;height:9px;border-radius:99px}.shimmer.title{width:36%;height:45px;border-radius:10px}.shimmer.sub{width:52%;height:13px;border-radius:99px}.loading-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}.shimmer.card{height:520px;border-radius:21px}
@keyframes pulse{50%{opacity:.35;box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 8%,transparent)}}@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{to{background-position:-200% 0}}
@media(max-width:980px){.selection-board{grid-template-columns:1fr;min-height:0}.xi-list{border-left:0;border-top:1px solid var(--line)}}@media(max-width:760px){.xi-page{padding:28px 17px 100px}.hero{padding:20px}.hero-main{align-items:flex-start;flex-direction:column}.fixture-mini{display:flex;align-items:center;gap:8px;justify-items:start;text-align:left}.teams-line{grid-template-columns:minmax(0,1fr) 36px minmax(0,1fr);padding:13px 11px}.teams-line>div{gap:7px}.teams-line i{width:31px;height:31px;flex-basis:31px}.teams-line strong{font-size:14px}.progress{grid-template-columns:1fr;gap:10px}.progress-meta{display:none}.role-grid{grid-template-columns:1fr}.table-labels{display:none}.squad-row{grid-template-columns:minmax(0,1fr) 72px}.role-pill{display:none}.squad-row button{min-width:72px}.selection-board{grid-template-columns:1fr}.squad-list{padding:20px}.xi-list{border-left:0;border-top:1px solid var(--line)}.sticky-bar{align-items:stretch;flex-direction:column}.continue{justify-content:center}.loading-grid{grid-template-columns:1fr}.shimmer.card{height:300px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}`]
})
export class PlayingXiV2Component {
  private http=inject(HttpClient); private route=inject(ActivatedRoute); private api='http://localhost:8080/api';
  loadingMatch=true; saving=false; match:Match|null=null; teams:TeamState[]=[]; toast=''; private toastTimer:ReturnType<typeof setTimeout>|null=null;
  constructor(){const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id);}
  showToast(message:string,duration=3000){this.toast=message;if(this.toastTimer)clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{this.toast='';this.toastTimer=null;},duration)}
  load(id:string){this.http.get<Match>(`${this.api}/matches/${id}`).subscribe({next:m=>{this.match=m;this.teams=[this.state(m.teamAId,m.teamAName||'Team A'),this.state(m.teamBId,m.teamBName||'Team B')];this.loadingMatch=false;this.teams.forEach(t=>this.loadTeam(t,id));},error:e=>{this.loadingMatch=false;this.showToast(e?.error?.message||'Unable to load match');}})}
  state(id:string,name:string):TeamState{return{id,name,members:[],selected:[],captainId:null,viceCaptainId:null,wicketKeeperId:null,loading:true,accessible:false}}
  loadTeam(t:TeamState,matchId:string){this.http.get<Member[]>(`${this.api}/matches/${matchId}/teams/${t.id}/members`).subscribe({next:members=>{t.members=members;t.accessible=true;this.loadXi(t,matchId);},error:e=>{t.loading=false;t.accessible=false;this.loadXi(t,matchId);if(e.status!==403)this.showToast(e?.error?.message||`Unable to load ${t.name} squad`);}})}
  loadXi(t:TeamState,matchId:string){this.http.get<XIPlayer[]>(`${this.api}/matches/${matchId}/playing-xi`).subscribe({next:xi=>{t.selected=xi.filter(x=>x.teamId===t.id);t.captainId=t.selected.find(x=>x.captain)?.playerId||null;t.viceCaptainId=t.selected.find(x=>x.viceCaptain)?.playerId||null;t.wicketKeeperId=t.selected.find(x=>x.wicketKeeper)?.playerId||null;this.applyTeamRoleDefaults(t);t.loading=false;},error:e=>this.showToast(e?.error?.message||'Unable to load Playing XI')})}
  applyTeamRoleDefaults(t:TeamState){if(!t.selected.length)return;const selectedIds=new Set(t.selected.map(p=>p.playerId));if(!t.captainId){const m=t.members.find(x=>selectedIds.has(x.playerId)&&this.isCaptainRole(x.role));if(m)t.captainId=m.playerId;}if(!t.viceCaptainId){const m=t.members.find(x=>selectedIds.has(x.playerId)&&this.isViceCaptainRole(x.role));if(m)t.viceCaptainId=m.playerId;}if(!t.wicketKeeperId){const m=t.members.find(x=>selectedIds.has(x.playerId)&&this.isWicketKeeperRole(x.role));if(m)t.wicketKeeperId=m.playerId;}}
  isCaptainRole(role:string){return ['Captain','TEAM_Captain'].includes((role||'').trim().toUpperCase())}
  isViceCaptainRole(role:string){return ['VICE_Captain','VICE-Captain','TEAM_VICE_Captain'].includes((role||'').trim().toUpperCase())}
  isWicketKeeperRole(role:string){return ['WICKET_Wicketkeeper','WICKET-Wicketkeeper','Wicketkeeper','WK'].includes((role||'').trim().toUpperCase())}
  get canSave(){return this.teams.filter(t=>t.accessible).every(t=>t.selected.length<=11)}
  roleOptions(t:TeamState):SelectOption[]{return t.selected.map(p=>({value:p.playerId,label:p.name}))}
  isSelected(t:TeamState,id:string){return t.selected.some(x=>x.playerId===id)}
  toggle(t:TeamState,m:Member){if(this.isSelected(t,m.playerId)){this.remove(t,m.playerId);return}if(t.selected.length>=11)return;const captain=this.isCaptainRole(m.role);const viceCaptain=this.isViceCaptainRole(m.role);const wicketKeeper=this.isWicketKeeperRole(m.role);if(captain)t.captainId=m.playerId;if(viceCaptain)t.viceCaptainId=m.playerId;if(wicketKeeper)t.wicketKeeperId=m.playerId;this.http.post(`${this.api}/matches/${this.match!.id}/playing-xi`,{teamId:t.id,playerId:m.playerId,captain,viceCaptain,wicketKeeper}).subscribe({next:()=>{this.loadXi(t,this.match!.id);this.showToast(`${m.fullName} added to Playing XI`);},error:e=>this.showToast(e?.error?.message||'Unable to select player')});}
  remove(t:TeamState,id:string){const player=t.selected.find(x=>x.playerId===id);if(t.captainId===id)t.captainId=null;if(t.viceCaptainId===id)t.viceCaptainId=null;if(t.wicketKeeperId===id)t.wicketKeeperId=null;this.http.delete(`${this.api}/matches/${this.match!.id}/playing-xi/${t.id}/${id}`).subscribe({next:()=>{this.loadXi(t,this.match!.id);this.showToast(`${player?.name||'Player'} removed from Playing XI`);},error:e=>this.showToast(e?.error?.message||'Unable to remove player')});}
  saveRoles(t:TeamState){if(!t.selected.length)return;this.saving=true;const roles=t.selected.map(p=>this.http.post(`${this.api}/matches/${this.match!.id}/playing-xi`,{teamId:t.id,playerId:p.playerId,captain:p.playerId===t.captainId,viceCaptain:p.playerId===t.viceCaptainId,wicketKeeper:p.playerId===t.wicketKeeperId}));let done=0;let failed=false;roles.forEach(r=>r.subscribe({next:()=>{done++;if(done===roles.length&&!failed){this.saving=false;this.loadXi(t,this.match!.id);this.showToast('Match roles saved');}},error:e=>{failed=true;this.saving=false;this.showToast(e?.error?.message||'Unable to save match roles');}}));}
  roleName(t:TeamState,id:string|null){return t.selected.find(x=>x.playerId===id)?.name||''}
  initials(n:string){return n.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}

  isSelectionComplete(): boolean {
    return this.teams.length === 2 && this.teams.every(team => team.selected.length === 11);
  }

}
