import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SelectFieldComponent, SelectOption } from '../../../../ui/select-field.component';

interface Match { id:string; name:string; format:string; status:string; teamAId:string; teamBId:string; teamAName?:string; teamBName?:string; }
interface Member { teamId:string; playerId:string; userId:string; fullName:string; email:string; phone?:string; role:string; }
interface XIPlayer { teamId:string; playerId:string; name:string; captain:boolean; viceCaptain:boolean; wicketKeeper:boolean; }
interface TeamState { id:string; name:string; members:Member[]; selected:XIPlayer[]; captainId:string|null; viceCaptainId:string|null; wicketKeeperId:string|null; loading:boolean; accessible:boolean; }

@Component({
  selector:'app-playing-xi-v2', standalone:true, imports:[CommonModule,RouterLink,SelectFieldComponent],
  templateUrl: './playing-xi.component.html',
  styleUrl: './playing-xi.component.scss']
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

  statusLabel(status: string) {
    return status.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

}
