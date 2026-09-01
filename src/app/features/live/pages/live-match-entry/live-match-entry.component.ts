import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
interface ExistingInnings { id?:string; inningsId?:string; matchId:string; inningsNumber:number; battingTeamId:string; bowlingTeamId?:string; runs:number; wickets:number; legalBalls:number; status:string; }
interface MatchState { id:string; status:string; }
@Component({selector:'app-live-match-entry',standalone:true,imports:[CommonModule],templateUrl: './live-match-entry.component.html',styleUrl: './live-match-entry.component.scss']})
export class LiveMatchEntryComponent{
 private readonly http=inject(HttpClient); private readonly route=inject(ActivatedRoute); private readonly router=inject(Router); private readonly api='http://localhost:8080/api'; readonly matchId=this.route.snapshot.paramMap.get('id')||''; loading=true; error=''; innings:ExistingInnings|null=null; completed=false;
 constructor(){this.check()}
 check():void{if(!this.matchId){this.loading=false;this.error='Match id is missing.';return;}this.http.get<MatchState>(`${this.api}/matches/${this.matchId}`).subscribe({next:match=>{if(match.status==='COMPLETED'){this.completed=true;this.loading=false;return;}this.checkInnings();},error:e=>{this.loading=false;this.error=e?.error?.message||'Unable to load match.';}})}
 checkInnings():void{this.http.get<ExistingInnings>(this.api+'/matches/'+this.matchId+'/current-innings').subscribe({next:innings=>{this.innings=innings;this.loading=false;},error:e=>{if(e?.status===404){void this.router.navigateByUrl('/matches/'+this.matchId+'/opening-players');return;}this.loading=false;this.error=e?.error?.message||'Unable to check current innings.';}})}
 resume():void{if(!this.innings)return;const id=this.innings.id||this.innings.inningsId;if(!id){this.error='Existing innings id is missing from the server response.';return;}void this.router.navigateByUrl('/matches/'+this.matchId+'/live-scoring?inningsId='+encodeURIComponent(id));}
 openResult():void{void this.router.navigateByUrl('/matches/'+this.matchId+'/result');}
 retry():void{this.loading=true;this.error='';this.innings=null;this.completed=false;this.check()}
 overs(balls:number):string{return Math.floor(balls/6)+'.'+(balls%6)}
}
