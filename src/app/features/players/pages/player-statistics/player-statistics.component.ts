import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PlayerStatistics { playerId:string; playerName:string; matches:number; battingInnings:number; runs:number; highestScore:number; dismissals:number; fours:number; sixes:number; battingBalls:number; battingAverage:number; strikeRate:number; bowlingBalls:number; runsConceded:number; wickets:number; bestWickets:number; economy:number; }
@Component({selector:'app-player-statistics',standalone:true,imports:[CommonModule,RouterLink],templateUrl: './player-statistics.component.html',styleUrl: './player-statistics.component.scss'})
export class PlayerStatisticsComponent { private readonly http=inject(HttpClient); readonly api='http://localhost:8080/api'; players:PlayerStatistics[]=[]; loading=true; constructor(){this.http.get<PlayerStatistics[]>(`${this.api}/players/statistics`).subscribe({next:r=>{this.players=r||[];this.loading=false;},error:()=>{this.players=[];this.loading=false;}});} get totalRuns(){return this.players.reduce((s,p)=>s+p.runs,0);} get totalWickets(){return this.players.reduce((s,p)=>s+p.wickets,0);} get totalSixes(){return this.players.reduce((s,p)=>s+p.sixes,0);} format(v:number){return (v||0).toFixed(2);} }
