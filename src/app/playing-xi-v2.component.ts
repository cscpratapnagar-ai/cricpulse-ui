import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Match { id:string; name:string; format:string; status:string; teamAId:string; teamBId:string; teamAName?:string; teamBName?:string; }
interface Member { teamId:string; playerId:string; userId:string; fullName:string; email:string; phone?:string; role:string; }
interface XIPlayer { teamId:string; playerId:string; name:string; captain:boolean; wicketKeeper:boolean; }
interface TeamState { id:string; name:string; members:Member[]; selected:XIPlayer[]; captainId:string|null; wicketKeeperId:string|null; loading:boolean; accessible:boolean; }

@Component({
  selector:'app-playing-xi-v2', standalone:true, imports:[CommonModule,RouterLink],
  template:`
  <section class="page">
    @if (loadingMatch) { <div class="loading">Loading match…</div> }
    @else if (match) {
      <header class="hero"><div><a [routerLink]="['/matches',match.id]">← Back to match</a><span> MATCH SETUP · PLAYING XI</span><h1>{{match.name}}</h1><p>{{match.teamAName || 'Team A'}} <b>VS</b> {{match.teamBName || 'Team B'}} · {{match.format}}</p></div><strong class="status">{{match.status}}</strong></header>
      @if (match.status !== 'SCHEDULED') { <div class="notice">Playing XI is locked because this match is no longer scheduled.</div> }
      <div class="grid">
        @for (team of teams; track team.id) {
          <section class="card">
            <header class="team-head"><div><small>TEAM {{ $index + 1 }}</small><h2>{{team.name}}</h2></div><b>{{team.selected.length}}/11</b></header>
            @if (team.loading) { <div class="loading">Loading squad…</div> }
            @else {
              @if (!team.accessible) { <div class="notice">You can view this match, but this team's squad is managed by its own team manager.</div> }
              <div class="roles"><div><small>Captain</small><strong>{{roleName(team,team.captainId) || 'Not selected'}}</strong></div><div><small>Wicket Keeper</small><strong>{{roleName(team,team.wicketKeeperId) || 'Not selected'}}</strong></div></div>
              @if (team.accessible) {
                <div class="columns"><div><h3>Squad <small>{{team.members.length}} registered</small></h3>
                  @for (m of team.members; track m.playerId) { <div class="player" [class.selected]="isSelected(team,m.playerId)"><div class="avatar">{{initials(m.fullName)}}</div><div class="name"><b>{{m.fullName}}</b><small>{{m.role}}</small></div><button [disabled]="match.status!=='SCHEDULED' || (!isSelected(team,m.playerId) && team.selected.length>=11)" (click)="toggle(team,m)">{{isSelected(team,m.playerId)?'Selected':'Select'}}</button></div> }
                  @empty { <div class="empty">No registered players in this team.</div> }
                </div><div class="xi"><h3>Playing XI</h3>@for (p of team.selected; track p.playerId; let i=$index) { <div class="xi-row"><span>{{i+1}}</span><div class="name"><b>{{p.name}}</b><small>{{p.captain?'Captain':''}}{{p.captain&&p.wicketKeeper?' · ':''}}{{p.wicketKeeper?'Wicket Keeper':''}}</small></div><button [disabled]="match.status!=='SCHEDULED'" (click)="remove(team,p.playerId)">×</button></div> } @empty {<div class="empty">Select up to 11 players.</div>}<button class="role" [disabled]="!team.selected.length || match.status!=='SCHEDULED'" (click)="openRoles(team)">Captain / Wicket Keeper</button></div></div>
              }
            }
          </section>
        }
      </div>
      <div class="bar"><span>Select 11 players for each side. Each team manager controls their own squad.</span><button [disabled]="saving || !canSave" (click)="saveAll()">{{saving?'Saving…':'Save Playing XI'}}</button></div>
      @if (roleTeam) { <div class="overlay" (click)="roleTeam=null"><div class="modal" (click)="$event.stopPropagation"><h2>{{roleTeam.name}}</h2><label>Captain</label><select [value]="roleTeam.captainId || ''" (change)="roleTeam.captainId=$any($event.target).value || null"><option value="">Select captain</option>@for(p of roleTeam.selected;track p.playerId){<option [value]="p.playerId">{{p.name}}</option>}</select><label>Wicket Keeper</label><select [value]="roleTeam.wicketKeeperId || ''" (change)="roleTeam.wicketKeeperId=$any($event.target).value || null"><option value="">Select wicket keeper</option>@for(p of roleTeam.selected;track p.playerId){<option [value]="p.playerId">{{p.name}}</option>}</select><button (click)="saveRoles(roleTeam)">Save roles</button></div></div> }
      @if(toast){<div class="toast">{{toast}}</div>}
    }
  </section>`,
  styles:[`:host{display:block}.page{max-width:1250px;padding:34px 4vw 120px;color:#edf8f2}.hero{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}.hero a{display:block;color:#91aa9d;text-decoration:none;font-size:12px;margin-bottom:15px}.hero span,.team-head small,.roles small{color:#b8f45c;font-size:9px;letter-spacing:1.7px;font-weight:800}.hero h1{font-size:clamp(38px,5vw,62px);letter-spacing:-3px;margin:8px 0}.hero p{color:#91aa9d}.hero p b{color:#b8f45c}.status{padding:9px 12px;border-radius:999px;background:#b8f45c12;color:#b8f45c;font-size:10px}.notice{padding:13px 15px;border:1px solid #ffffff15;border-radius:12px;background:#ffffff05;color:#91aa9d;font-size:11px;margin-bottom:15px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:#0c2119d9;border:1px solid #ffffff15;border-radius:20px;overflow:hidden}.team-head{display:flex;justify-content:space-between;align-items:center;padding:20px;border-bottom:1px solid #ffffff0d}.team-head h2{margin:6px 0 0;font-size:24px}.team-head>b{padding:8px 11px;border-radius:999px;background:#b8f45c12;color:#b8f45c}.roles{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px}.roles div{padding:11px;background:#ffffff05;border-radius:11px;display:grid;gap:5px}.roles strong{font-size:12px}.columns{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ffffff0d}.columns>div{padding:14px}.xi{border-left:1px solid #ffffff0d;background:#07150f66}.columns h3{font-size:12px;margin:0 0 10px}.columns h3 small{color:#789386;font-weight:400}.player,.xi-row{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #ffffff0c;border-radius:9px;margin-bottom:6px}.player.selected{border-color:#b8f45c35;background:#b8f45c08}.avatar{width:32px;height:32px;border-radius:8px;background:#173d2d;color:#b8f45c;display:grid;place-items:center;font-weight:900;font-size:10px}.name{flex:1;min-width:0;display:grid;gap:2px}.name b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.name small{font-size:9px;color:#789386}.player button,.role,.bar button,.modal button{border:0;border-radius:8px;padding:7px 9px;background:#b8f45c;color:#10251e;font-size:9px;font-weight:800;cursor:pointer}.player button:disabled,.bar button:disabled{opacity:.4}.xi-row>span{width:20px;color:#789386;font-size:9px}.xi-row button{border:0;background:transparent;color:#91aa9d;font-size:18px;cursor:pointer}.role{margin-top:8px;width:100%;background:#b8f45c0b;color:#b8f45c;border:1px solid #b8f45c25}.empty{text-align:center;padding:25px;color:#789386;font-size:10px}.bar{position:sticky;bottom:18px;margin-top:18px;padding:14px 16px;background:#07150ff2;border:1px solid #b8f45c25;border-radius:14px;display:flex;justify-content:space-between;align-items:center;gap:15px}.bar span{color:#789386;font-size:10px}.overlay{position:fixed;inset:0;background:#0009;display:grid;place-items:center;z-index:1000;padding:20px}.modal{width:min(420px,100%);padding:22px;background:#0c2119;border:1px solid #ffffff18;border-radius:18px;display:grid;gap:9px}.modal label{font-size:9px;color:#789386;text-transform:uppercase}.modal select{background:#081a14;color:#fff;border:1px solid #ffffff18;border-radius:8px;padding:10px}.toast{position:fixed;right:20px;bottom:20px;background:#173d2d;color:#fff;padding:12px 15px;border-radius:10px;z-index:1200}.loading{padding:35px;color:#789386}@media(max-width:1000px){.grid{grid-template-columns:1fr}}@media(max-width:700px){.hero,.bar{flex-direction:column;align-items:stretch}.columns{grid-template-columns:1fr}.xi{border-left:0;border-top:1px solid #ffffff0d}.roles{grid-template-columns:1fr}}`]
})
export class PlayingXiV2Component {
  private http=inject(HttpClient); private route=inject(ActivatedRoute); private api='http://localhost:8080/api';
  loadingMatch=true; saving=false; match:Match|null=null; teams:TeamState[]=[]; roleTeam:TeamState|null=null; toast='';
  constructor(){const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id);}
  load(id:string){this.http.get<Match>(`${this.api}/matches/${id}`).subscribe({next:m=>{this.match=m;this.teams=[this.state(m.teamAId,m.teamAName||'Team A'),this.state(m.teamBId,m.teamBName||'Team B')];this.loadingMatch=false;this.teams.forEach(t=>this.loadTeam(t,id));},error:e=>{this.loadingMatch=false;this.toast=e?.error?.message||'Unable to load match';}})}
  state(id:string,name:string):TeamState{return{id,name,members:[],selected:[],captainId:null,wicketKeeperId:null,loading:true,accessible:false}}
  loadTeam(t:TeamState,matchId:string){this.http.get<Member[]>(`${this.api}/matches/${matchId}/teams/${t.id}/members`).subscribe({next:members=>{t.members=members;t.accessible=true;this.loadXi(t,matchId);},error:e=>{t.loading=false;t.accessible=false;this.loadXi(t,matchId);if(e.status!==403)this.toast=e?.error?.message||`Unable to load ${t.name} squad`;}})}
  loadXi(t:TeamState,matchId:string){this.http.get<XIPlayer[]>(`${this.api}/matches/${matchId}/playing-xi`).subscribe({next:xi=>{t.selected=xi.filter(x=>x.teamId===t.id);t.captainId=t.selected.find(x=>x.captain)?.playerId||null;t.wicketKeeperId=t.selected.find(x=>x.wicketKeeper)?.playerId||null;t.loading=false;},error:()=>t.loading=false})}
  get canSave(){return this.teams.filter(t=>t.accessible).every(t=>t.selected.length<=11)}
  isSelected(t:TeamState,id:string){return t.selected.some(x=>x.playerId===id)}
  toggle(t:TeamState,m:Member){if(this.isSelected(t,m.playerId)){this.remove(t,m.playerId);return}if(t.selected.length>=11)return;this.http.post(`${this.api}/matches/${this.match!.id}/playing-xi`,{teamId:t.id,playerId:m.playerId,captain:false,wicketKeeper:false}).subscribe({next:()=>this.loadXi(t,this.match!.id),error:e=>this.toast=e?.error?.message||'Unable to select player'});}
  remove(t:TeamState,id:string){this.http.delete(`${this.api}/matches/${this.match!.id}/playing-xi/${t.id}/${id}`).subscribe({next:()=>this.loadXi(t,this.match!.id),error:e=>this.toast=e?.error?.message||'Unable to remove player'});}
  openRoles(t:TeamState){this.roleTeam=t;}
  saveRoles(t:TeamState){const calls=[];for(const p of t.selected){const captain=p.playerId===t.captainId;const keeper=p.playerId===t.wicketKeeperId;calls.push(this.http.post(`${this.api}/matches/${this.match!.id}/playing-xi`,{teamId:t.id,playerId:p.playerId,captain,wicketKeeper:keeper}));}if(!calls.length){this.roleTeam=null;return;}this.saving=true;let done=0;calls.forEach(c=>c.subscribe({next:()=>{done++;if(done===calls.length){this.saving=false;this.roleTeam=null;this.loadXi(t,this.match!.id);this.toast='Roles saved';}},error:e=>{this.saving=false;this.toast=e?.error?.message||'Unable to save roles';}}));}
  saveAll(){this.toast='Playing XI is saved automatically as you select players.';}
  roleName(t:TeamState,id:string|null){return t.selected.find(p=>p.playerId===id)?.name||''}
  initials(n:string){return n.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
}
