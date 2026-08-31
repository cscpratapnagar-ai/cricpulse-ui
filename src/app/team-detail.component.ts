import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { StateViewComponent } from './state-view.component';

interface Team { id:string; name:string; city?:string; ownerId:string; }
interface Member { teamId:string; playerId:string; userId:string; fullName:string; email:string; phone?:string; role:string; }
interface TeamAccess { teamId:string; role:string; canManage:boolean; }
type Tab='overview'|'squad'|'management';

@Component({
  selector:'app-team-detail', standalone:true,
  imports:[RouterLink,FormsModule,StateViewComponent],
  template:`
<section class="team-page">
  @if(loading){
    <app-state-view state="loading" loadingLabel="Loading team command center..."></app-state-view>
  } @else if(loadError){
    <app-state-view state="error" title="Unable to load this team" message="The team workspace could not be retrieved. Please try again." (retry)="reload()"></app-state-view>
  } @else if(team){
    <header class="hero">
      <button class="back-btn" type="button" (click)="history.back()" aria-label="Go back">←</button>
      <div class="team-mark">{{team.name.charAt(0).toUpperCase()}}</div>
      <div class="hero-copy">
        <div class="eyebrow"><span></span> TEAM COMMAND CENTER</div>
        <h1>{{team.name}}</h1>
        <p>{{team.city || 'Location not set'}} <b>·</b> {{access?.role || 'MEMBER'}} ACCESS</p>
      </div>
      <div class="hero-actions">
        @if(access?.canManage){<a class="secondary" [routerLink]="['/teams',team.id,'players','bulk']">Bulk add players</a>}
        <button class="primary" type="button" (click)="setTab('squad');showAdd=true" [disabled]="!access?.canManage">Add player <span>+</span></button>
      </div>
    </header>

    <section class="metrics" aria-label="Team summary">
      <article><span class="metric-icon">♟</span><div><strong>{{members.length}}</strong><small>Total squad</small></div></article>
      <article><span class="metric-icon">★</span><div><strong>{{count('CAPTAIN') + count('VICE_CAPTAIN')}}</strong><small>Leadership</small></div></article>
      <article><span class="metric-icon">◈</span><div><strong>{{count('MANAGER')}}</strong><small>Management</small></div></article>
      <article><span class="metric-icon">✓</span><div><strong>{{activePlayers}}</strong><small>Playing members</small></div></article>
    </section>

    <nav class="tabs" role="tablist" aria-label="Team sections">
      <button [class.active]="tab==='overview'" (click)="setTab('overview')" role="tab" [attr.aria-selected]="tab==='overview'">Overview</button>
      <button [class.active]="tab==='squad'" (click)="setTab('squad')" role="tab" [attr.aria-selected]="tab==='squad'">Squad <span>{{members.length}}</span></button>
      @if(access?.canManage){<button [class.active]="tab==='management'" (click)="setTab('management')" role="tab" [attr.aria-selected]="tab==='management'">Management</button>}
    </nav>

    @if(tab==='overview'){
      <section class="overview-grid">
        <article class="panel squad-health">
          <div class="panel-head"><div><div class="eyebrow"><span></span> SQUAD HEALTH</div><h2>Team composition</h2></div><span class="live-dot">READY</span></div>
          <div class="composition">
            <div class="ring" [style.--health]="squadHealth + '%'"><strong>{{squadHealth}}%</strong><small>READY</small></div>
            <div class="roles">
              @for(item of roleSummary;track item.label){<div><span><i [style.width.%]="item.percent"></i></span><b>{{item.count}}</b><small>{{item.label}}</small></div>}
            </div>
          </div>
        </article>
        <article class="panel identity-panel">
          <div class="panel-head"><div><div class="eyebrow"><span></span> TEAM PROFILE</div><h2>Workspace details</h2></div></div>
          <div class="detail-list"><div><span>Team ID</span><strong>{{team.id}}</strong></div><div><span>Location</span><strong>{{team.city || 'Not set'}}</strong></div><div><span>Your access</span><strong class="role-badge">{{access?.role || 'MEMBER'}}</strong></div></div>
        </article>
      </section>
      <section class="panel roster-preview">
        <div class="panel-head"><div><div class="eyebrow"><span></span> ROSTER</div><h2>Squad preview</h2></div><button type="button" class="text-btn" (click)="setTab('squad')">View full squad →</button></div>
        <div class="preview-grid">
          @for(m of members.slice(0,6);track m.playerId){<article><div class="avatar">{{m.fullName.charAt(0).toUpperCase()}}</div><strong>{{m.fullName}}</strong><small>{{m.role.replace('_',' ')}}</small></article>}
          @if(!members.length){<div class="inline-empty">Your roster is ready for its first player.</div>}
        </div>
      </section>
    }

    @if(tab==='squad'){
      <section class="panel squad-panel">
        <div class="panel-head squad-toolbar">
          <div><div class="eyebrow"><span></span> ROSTER DIRECTORY</div><h2>Team members</h2></div>
          <div class="toolbar-controls"><input [(ngModel)]="query" placeholder="Search squad..." aria-label="Search squad"><select [(ngModel)]="roleFilter" aria-label="Filter by role"><option value="ALL">All roles</option><option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="CAPTAIN">Captain</option><option value="VICE_CAPTAIN">Vice captain</option><option value="PLAYER">Player</option></select></div>
        </div>
        @if(showAdd && access?.canManage){
          <div class="add-drawer">
            <div><div class="eyebrow"><span></span> ADD MEMBER</div><strong>Add an existing player</strong></div>
            <input [(ngModel)]="email" placeholder="Registered player email" type="email">
            <select [(ngModel)]="role"><option value="PLAYER">Player</option><option value="CAPTAIN">Captain</option><option value="VICE_CAPTAIN">Vice captain</option><option value="MANAGER">Manager</option></select>
            <button type="button" class="primary" (click)="addMember()" [disabled]="saving || !email.trim()">{{saving ? 'Adding…' : 'Add player'}}</button>
            <button type="button" class="icon-btn" (click)="showAdd=false" aria-label="Close add player panel">×</button>
          </div>
        }
        <div class="member-list">
          @for(m of filteredMembers;track m.playerId){
            <article class="member-row">
              <div class="avatar">{{m.fullName.charAt(0).toUpperCase()}}</div>
              <div class="identity"><strong>{{m.fullName}}</strong><small>{{m.email}}</small></div>
              <span class="member-role" [class.lead]="m.role==='CAPTAIN'||m.role==='VICE_CAPTAIN'">{{m.role.replace('_',' ')}}</span>
              @if(access?.canManage){
                <div class="member-actions">
                  <select [ngModel]="m.role" [disabled]="m.role==='OWNER'||saving" (ngModelChange)="changeRole(m,$event)"><option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="CAPTAIN">Captain</option><option value="VICE_CAPTAIN">Vice captain</option><option value="PLAYER">Player</option></select>
                  <button type="button" class="remove" [disabled]="m.role==='OWNER'||saving" (click)="requestRemove(m)">Remove</button>
                </div>
              }
            </article>
          } @empty {
            <app-state-view state="empty" title="No squad members found" message="Try another search or add a player to build your roster." [actionLabel]="access?.canManage ? 'Add player' : undefined" (action)="showAdd=true"></app-state-view>
          }
        </div>
      </section>
    }

    @if(tab==='management' && access?.canManage){
      <section class="management-grid">
        <article class="panel"><div class="panel-head"><div><div class="eyebrow"><span></span> ACCESS CONTROL</div><h2>Role governance</h2></div></div><p class="muted">Owners retain protected access. Managers can maintain the roster. Leadership roles can be assigned directly from the squad directory.</p><div class="governance"><div><b>OWNER</b><span>Protected team authority</span></div><div><b>MANAGER</b><span>Squad administration</span></div><div><b>CAPTAIN</b><span>On-field leadership</span></div></div></article>
        <article class="panel danger-zone"><div class="eyebrow"><span></span> SAFETY</div><h2>Roster changes are live</h2><p>Role updates and removals immediately update the team workspace.</p><button type="button" class="text-btn" (click)="setTab('squad')">Manage squad →</button></article>
      </section>
    }

    @if(confirmMember){
      <div class="modal-backdrop" (click)="confirmMember=null">
        <section class="confirm-card" (click)="$event.stopPropagation()"><div class="confirm-icon">!</div><div><div class="eyebrow"><span></span> CONFIRM CHANGE</div><h2>Remove {{confirmMember.fullName}}?</h2><p>This player will lose access to this team roster. You can add them again later.</p></div><div class="confirm-actions"><button type="button" class="ghost" (click)="confirmMember=null">Cancel</button><button type="button" class="danger" [disabled]="saving" (click)="removeConfirmed()">{{saving ? 'Removing…' : 'Remove player'}}</button></div></section>
      </div>
    }
    @if(toast){<div class="toast" [class.error]="toastType==='error'"><span>{{toastType==='error'?'!':'✓'}}</span>{{toast}}</div>}
  }
</section>`,
  styles:[`
:host{display:block}.team-page{--cp-muted:var(--cp-text-muted);--cp-surface-2:var(--cp-surface-raised);--cp-accent-ink:var(--cp-accent-contrast);--cp-shadow-md:0 16px 40px rgba(0,0,0,.18);--cp-shadow-lg:0 24px 70px rgba(0,0,0,.28);max-width:1320px;margin:0 auto;padding:38px 32px 100px;color:var(--cp-text);animation:pageIn .5s cubic-bezier(.22,1,.36,1) both}.hero{min-width:0;position:relative;display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:28px 0 30px;border-bottom:1px solid var(--cp-border);animation:panelIn .55s .05s cubic-bezier(.22,1,.36,1) both}.hero:after{content:'';position:absolute;left:0;bottom:-1px;width:96px;height:2px;background:var(--cp-accent);box-shadow:0 0 18px var(--cp-accent-soft)}.back-btn,.icon-btn{width:42px;height:42px;border-radius:13px;border:1px solid var(--cp-border);background:var(--cp-surface);color:var(--cp-text);cursor:pointer;font-size:20px;transition:.2s}.back-btn:hover,.icon-btn:hover{transform:translateY(-2px);border-color:var(--cp-accent)}.team-mark,.avatar{display:grid;place-items:center;background:linear-gradient(145deg,var(--cp-accent-soft),var(--cp-surface));border:1px solid color-mix(in srgb,var(--cp-accent) 35%,var(--cp-border));color:var(--cp-accent);font-weight:900}.team-mark{width:68px;height:68px;border-radius:22px;font-size:27px;box-shadow:0 14px 30px var(--cp-accent-soft)}.hero-copy{min-width:0}.eyebrow{display:flex;align-items:center;gap:7px;color:var(--cp-muted);font-size:10px;font-weight:850;letter-spacing:1.8px}.eyebrow span{width:6px;height:6px;border-radius:50%;background:var(--cp-accent);box-shadow:0 0 10px var(--cp-accent)}h1{margin:6px 0;max-width:100%;overflow-wrap:anywhere;font-size:clamp(30px,4vw,48px);line-height:1.08;letter-spacing:-.045em}h2{margin:7px 0 0;font-size:23px;letter-spacing:-.03em}.hero p,.muted,.identity small,.detail-list span,.preview-grid small{color:var(--cp-muted)}.hero p{margin:0;overflow-wrap:anywhere;font-size:13px}.hero p b{margin:0 7px;color:var(--cp-border-strong)}.hero-actions,.actions,.toolbar-controls,.member-actions,.confirm-actions{display:flex;align-items:center;gap:9px}.hero-actions{justify-self:end;flex-wrap:nowrap}.primary,.secondary,.ghost,.danger,.remove,.text-btn{appearance:none;box-sizing:border-box;border-radius:12px;padding:11px 15px;font:inherit;font-size:12px;font-weight:800;line-height:18px;text-decoration:none!important;white-space:nowrap;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s}.hero-actions .primary,.hero-actions .secondary{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:7px}.hero-actions .secondary{text-decoration:none!important;max-width:100%;overflow:hidden;text-overflow:ellipsis}.primary{border:1px solid var(--cp-accent);background:var(--cp-accent);color:var(--cp-accent-ink);box-shadow:0 8px 22px var(--cp-accent-soft)}.primary:focus-visible,.secondary:focus-visible,.ghost:focus-visible,.danger:focus-visible,.remove:focus-visible,.text-btn:focus-visible,.back-btn:focus-visible,.icon-btn:focus-visible,.tabs button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--cp-accent);outline-offset:3px}.primary:hover:not(:disabled),.secondary:hover,.danger:hover{transform:translateY(-2px);box-shadow:0 12px 26px var(--cp-accent-soft)}.primary span{font-size:17px;margin:0;line-height:1}.primary:disabled,.secondary[aria-disabled='true'],.danger:disabled,.remove:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;transform:none}.secondary,.ghost,.remove{border:1px solid var(--cp-border);background:var(--cp-surface);color:var(--cp-text)}.danger{border:1px solid color-mix(in srgb,#ef5b5b 55%,var(--cp-border));background:#ef5b5b;color:#fff}.text-btn{border:0;background:transparent;color:var(--cp-accent);padding:8px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0;animation:panelIn .55s .12s cubic-bezier(.22,1,.36,1) both}.metrics article,.panel{border:1px solid var(--cp-border);background:var(--cp-surface);border-radius:20px;box-shadow:var(--cp-shadow-sm)}.metrics article{min-height:108px;padding:18px;display:flex;gap:13px;align-items:center;transition:transform .22s,border-color .22s,box-shadow .22s}.metrics article:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--cp-accent) 45%,var(--cp-border));box-shadow:var(--cp-shadow-md)}.metric-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:var(--cp-accent-soft);color:var(--cp-accent)}.metrics strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;font-size:25px;letter-spacing:-.04em}.metrics small{color:var(--cp-muted);font-size:11px}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--cp-border);margin-bottom:22px}.tabs button{position:relative;border:0;background:transparent;color:var(--cp-muted);padding:13px 16px;font:inherit;font-size:13px;font-weight:750;cursor:pointer}.tabs button:after{content:'';position:absolute;left:16px;right:16px;bottom:-1px;height:2px;background:transparent;border-radius:2px;transition:.22s}.tabs button.active{color:var(--cp-text)}.tabs button.active:after{background:var(--cp-accent);box-shadow:0 0 12px var(--cp-accent-soft)}.tabs button span{margin-left:5px;padding:2px 6px;border-radius:999px;background:var(--cp-surface-2);font-size:10px}.overview-grid,.management-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;animation:panelIn .55s .16s cubic-bezier(.22,1,.36,1) both}.panel{padding:22px}.panel-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.live-dot{font-size:9px;font-weight:850;letter-spacing:1px;color:var(--cp-accent);padding:7px 9px;border-radius:999px;background:var(--cp-accent-soft)}.composition{display:grid;grid-template-columns:145px 1fr;gap:26px;align-items:center;padding-top:26px}.ring{--health:0%;width:126px;height:126px;border-radius:50%;display:grid;place-content:center;text-align:center;background:radial-gradient(circle,var(--cp-surface) 58%,transparent 59%),conic-gradient(var(--cp-accent) var(--health),var(--cp-surface-2) 0);border:1px solid var(--cp-border)}.ring strong{font-size:26px}.ring small{font-size:9px;color:var(--cp-muted);letter-spacing:1px}.roles{display:grid;gap:12px}.roles div{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}.roles span{height:6px;overflow:hidden;border-radius:999px;background:var(--cp-surface-2)}.roles span i{display:block;height:100%;border-radius:inherit;background:var(--cp-accent);transition:width .5s cubic-bezier(.22,1,.36,1)}.roles b{font-size:12px}.roles small{grid-column:1/-1;color:var(--cp-muted);font-size:10px}.detail-list{display:grid;gap:12px;margin-top:24px}.detail-list div{display:flex;justify-content:space-between;gap:20px;padding-bottom:12px;border-bottom:1px solid var(--cp-border)}.detail-list strong{font-size:12px;max-width:65%;text-align:right;overflow:hidden;text-overflow:ellipsis}.role-badge,.member-role{color:var(--cp-accent);text-transform:uppercase;letter-spacing:.06em;font-size:10px}.roster-preview{margin-top:16px;animation:panelIn .55s .22s cubic-bezier(.22,1,.36,1) both}.preview-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:20px}.preview-grid article{padding:14px;border:1px solid var(--cp-border);border-radius:15px;display:grid;gap:8px;transition:transform .2s,border-color .2s}.preview-grid article:hover{transform:translateY(-3px);border-color:var(--cp-accent)}.preview-grid .avatar{width:38px;height:38px;border-radius:11px}.preview-grid strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-grid small{font-size:9px;text-transform:uppercase}.inline-empty{grid-column:1/-1;padding:30px;text-align:center;color:var(--cp-muted)}.squad-panel{animation:panelIn .55s .1s cubic-bezier(.22,1,.36,1) both}.squad-toolbar{align-items:center}.toolbar-controls input,.toolbar-controls select,.add-drawer input,.add-drawer select,.member-actions select{height:40px;padding:0 11px;border:1px solid var(--cp-border);border-radius:11px;background:var(--cp-surface-2);color:var(--cp-text);font:inherit;font-size:12px;outline:none}.toolbar-controls input:focus,.toolbar-controls select:focus,.add-drawer input:focus,.add-drawer select:focus,.member-actions select:focus{border-color:var(--cp-accent);box-shadow:0 0 0 3px var(--cp-accent-soft)}.toolbar-controls input{min-width:190px}.add-drawer{display:grid;grid-template-columns:1.2fr 1fr 1fr auto auto;gap:10px;align-items:end;margin:20px 0;padding:16px;border:1px solid color-mix(in srgb,var(--cp-accent) 30%,var(--cp-border));border-radius:16px;background:linear-gradient(135deg,var(--cp-accent-soft),transparent)}.add-drawer>div{display:grid;gap:4px}.add-drawer>div strong{font-size:12px}.member-list{display:grid;gap:8px}.member-row{min-width:0;display:grid;grid-template-columns:44px minmax(0,1fr) 140px auto;align-items:center;gap:13px;padding:12px;border:1px solid var(--cp-border);border-radius:15px;transition:transform .2s,background .2s,border-color .2s}.member-row:hover{transform:translateX(3px);background:var(--cp-surface-2);border-color:color-mix(in srgb,var(--cp-accent) 35%,var(--cp-border))}.avatar{width:44px;height:44px;border-radius:14px}.identity{min-width:0;display:grid;gap:4px}.identity strong{font-size:13px}.identity small{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.member-role{justify-self:start;padding:6px 9px;border-radius:999px;background:var(--cp-surface-2)}.member-role.lead{background:var(--cp-accent-soft)}.remove{font-size:11px}.management-grid{margin-top:0}.management-grid .panel{min-height:220px}.management-grid p{font-size:13px;line-height:1.7;margin:20px 0}.governance{display:grid;gap:8px}.governance div{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid var(--cp-border);font-size:11px}.governance b{color:var(--cp-accent);letter-spacing:.06em}.governance span{color:var(--cp-muted)}.danger-zone{background:linear-gradient(145deg,var(--cp-surface),color-mix(in srgb,#ef5b5b 5%,var(--cp-surface)))}.modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.58);backdrop-filter:blur(10px);animation:fadeIn .2s}.confirm-card{width:min(480px,100%);padding:24px;border:1px solid var(--cp-border-strong);border-radius:22px;background:var(--cp-surface);box-shadow:0 30px 90px rgba(0,0,0,.35);animation:modalIn .25s cubic-bezier(.22,1,.36,1)}.confirm-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:#ef5b5b22;color:#ef5b5b;font-weight:900;margin-bottom:15px}.confirm-card p{color:var(--cp-muted);font-size:13px;line-height:1.6}.confirm-actions{justify-content:flex-end;margin-top:22px}.toast{max-width:min(420px,calc(100vw - 36px));overflow-wrap:anywhere;position:fixed;right:24px;bottom:24px;z-index:1100;display:flex;align-items:center;gap:9px;padding:13px 16px;border-radius:13px;background:var(--cp-surface);border:1px solid var(--cp-accent);box-shadow:var(--cp-shadow-lg);animation:toastIn .3s cubic-bezier(.22,1,.36,1)}.toast span{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:var(--cp-accent);color:var(--cp-accent-ink);font-size:12px}.toast.error{border-color:#ef5b5b}.toast.error span{background:#ef5b5b;color:#fff}@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes panelIn{from{opacity:0;transform:translateY(16px) scale(.99)}to{opacity:1;transform:none}}@keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}@media(prefers-contrast:more){.metrics article,.panel,.member-row,.tabs{border-color:var(--cp-border-strong)}}@media(prefers-reduced-motion:reduce){.team-page,.hero,.metrics,.overview-grid,.roster-preview,.squad-panel,.modal-backdrop,.confirm-card,.toast{animation:none}.metrics article,.preview-grid article,.member-row,.primary,.secondary,.ghost,.danger,.remove,.back-btn,.icon-btn{transition:none}}@media(max-width:900px){.team-page{padding:28px 18px 80px}.hero{grid-template-columns:auto auto 1fr}.hero-actions{grid-column:1/-1;justify-self:start}.metrics{grid-template-columns:repeat(2,1fr)}.overview-grid,.management-grid{grid-template-columns:1fr}.preview-grid{grid-template-columns:repeat(3,1fr)}.squad-toolbar{align-items:stretch;flex-direction:column}.toolbar-controls{width:100%}.toolbar-controls>*{flex:1}.add-drawer{grid-template-columns:1fr 1fr}.add-drawer>div{grid-column:1/-1}.member-row{grid-template-columns:44px minmax(0,1fr) auto}.member-actions{min-width:0;grid-column:1/-1;grid-column-start:2}.member-role{justify-self:end}}@media(max-width:580px){.hero{grid-template-columns:auto 1fr}.team-mark{display:none}.hero-actions{display:grid;grid-template-columns:1fr}.hero-actions>*{text-align:center}.metrics{grid-template-columns:1fr 1fr}.tabs{overflow:auto}.tabs button{white-space:nowrap}.composition{grid-template-columns:1fr}.ring{margin:auto}.preview-grid{grid-template-columns:repeat(2,1fr)}.toolbar-controls,.member-actions{flex-direction:column;align-items:stretch}.toolbar-controls input{min-width:0}.add-drawer{grid-template-columns:1fr}.member-row{grid-template-columns:44px minmax(0,1fr)}.member-role{grid-column:2;justify-self:start}.member-actions{grid-column:1/-1}.confirm-actions{flex-direction:column-reverse;align-items:stretch}.confirm-actions button{width:100%}.toast{left:18px;right:18px;bottom:18px}}`]
})
export class TeamDetailComponent {
  private http=inject(HttpClient); private route=inject(ActivatedRoute); history=window.history;
  team:Team|null=null; members:Member[]=[]; access:TeamAccess|null=null;
  loading=true; loadError=false; tab:Tab='overview'; query=''; roleFilter='ALL'; email=''; role='PLAYER'; showAdd=false; saving=false;
  toast=''; toastType:'success'|'error'='success'; confirmMember:Member|null=null;

  constructor(){this.reload();}
  reload(){const id=this.route.snapshot.paramMap.get('id');if(!id){this.loading=false;this.loadError=true;return;}this.loading=true;this.loadError=false;this.http.get<Team>(`http://localhost:8080/api/teams/${id}`).subscribe({next:t=>{this.team=t;this.loadAccess(id);this.loadMembers(id)},error:e=>{this.loading=false;this.loadError=true;this.showToast(e?.error?.message||'Unable to load team','error')}});}
  loadAccess(id:string){this.http.get<TeamAccess>(`http://localhost:8080/api/teams/${id}/access`).subscribe({next:x=>this.access=x,error:e=>this.showToast(e?.error?.message||'Unable to load team access','error')});}
  loadMembers(id:string){this.http.get<Member[]>(`http://localhost:8080/api/teams/${id}/members`).subscribe({next:x=>{this.members=x||[];this.loading=false;},error:e=>{this.members=[];this.loading=false;this.showToast(e?.error?.message||'Unable to load squad','error')}});}
  setTab(tab:Tab){this.tab=tab;}
  get activePlayers(){return this.members.filter(x=>x.role==='PLAYER'||x.role==='CAPTAIN'||x.role==='VICE_CAPTAIN').length;}
  count(role:string){return this.members.filter(x=>x.role===role).length;}
  get squadHealth(){if(!this.members.length)return 0;return Math.min(100,Math.round((this.activePlayers/Math.max(11,this.members.length))*100));}
  get roleSummary(){const total=Math.max(1,this.members.length);return [{label:'Players',count:this.count('PLAYER'),percent:this.count('PLAYER')/total*100},{label:'Leadership',count:this.count('CAPTAIN')+this.count('VICE_CAPTAIN'),percent:(this.count('CAPTAIN')+this.count('VICE_CAPTAIN'))/total*100},{label:'Management',count:this.count('MANAGER'),percent:this.count('MANAGER')/total*100}];}
  get filteredMembers(){const q=this.query.trim().toLowerCase();return this.members.filter(m=>(!q||m.fullName.toLowerCase().includes(q)||m.email.toLowerCase().includes(q))&&(this.roleFilter==='ALL'||m.role===this.roleFilter));}
  addMember(){if(!this.team||!this.email.trim()||!this.access?.canManage||this.saving)return;this.saving=true;this.http.post<Member>(`http://localhost:8080/api/teams/${this.team.id}/members`,{email:this.email.trim(),role:this.role}).subscribe({next:m=>{this.members=[...this.members.filter(x=>x.playerId!==m.playerId),m];this.email='';this.role='PLAYER';this.showAdd=false;this.saving=false;this.showToast(`${m.fullName} added to ${this.team!.name}`,'success')},error:e=>{this.saving=false;this.showToast(e?.error?.message||'Unable to add player','error')}});}
  changeRole(m:Member,role:string){if(!this.team||!this.access?.canManage||m.role==='OWNER'||this.saving)return;this.saving=true;this.http.patch<Member>(`http://localhost:8080/api/teams/${this.team.id}/members/${m.playerId}`,{role}).subscribe({next:x=>{m.role=x.role;this.saving=false;this.showToast(`${m.fullName} is now ${x.role.replace('_',' ')}`,'success')},error:e=>{this.saving=false;this.showToast(e?.error?.message||'Unable to change role','error')}});}
  requestRemove(m:Member){if(m.role!=='OWNER')this.confirmMember=m;}
  removeConfirmed(){const m=this.confirmMember;if(!this.team||!m||!this.access?.canManage||this.saving)return;this.saving=true;this.http.delete(`http://localhost:8080/api/teams/${this.team.id}/members/${m.playerId}`).subscribe({next:()=>{this.members=this.members.filter(x=>x.playerId!==m.playerId);this.confirmMember=null;this.saving=false;this.showToast(`${m.fullName} removed from the team`,'success')},error:e=>{this.saving=false;this.showToast(e?.error?.message||'Unable to remove player','error')}});}
  showToast(message:string,type:'success'|'error'){this.toast=message;this.toastType=type;window.setTimeout(()=>this.toast='',3500);}
}