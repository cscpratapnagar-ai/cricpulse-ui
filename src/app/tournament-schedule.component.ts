import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from './ui/date-time-field.component';

interface Tournament { id:string; name:string; format:string; overs:number; }
interface Fixture { matchId:string; fixtureNumber:number|null; stage:string; matchName:string; teamAName:string; teamBName:string; status:string; scheduledAt:string|null; }

@Component({
 selector:'app-tournament-schedule',
 standalone:true,
 imports:[CommonModule,RouterLink,DateTimeFieldComponent],
 template: `
<section class="page">
  <a class="back" [routerLink]="['/tournaments',id]">← Tournament</a>
  @if (loading) {
    <section class="card state">Loading schedule…</section>
  } @else if (t) {
    <header class="hero card">
      <div><span class="eyebrow">CRICPULSE · FIXTURE PLANNER</span><h1>{{t.name}}</h1><p>{{t.format}} · {{t.overs}} overs · {{fixtures.length}} fixtures</p></div>
      <span class="badge">SCHEDULE</span>
    </header>
    @if (message) { <div class="notice">{{message}}</div> }
    @if (error) { <div class="error">{{error}}</div> }
    <section class="card panel">
      <div class="head"><div><span class="eyebrow">MATCH CALENDAR</span><h2>Schedule fixtures</h2></div><span class="hint">Times use your selected local time</span></div>
      @if (fixtures.length) {
        <div class="fixtures">
          @for (f of fixtures; track f.matchId) {
            <article class="fixture">
              <div class="number">#{{f.fixtureNumber || '—'}}</div>
              <div class="match"><span>{{f.stage}}</span><strong>{{f.teamAName}} <b>vs</b> {{f.teamBName}}</strong><small>{{f.matchName}} · {{f.status}}</small></div>
              <div class="schedule">
                <app-date-time-field label="Match date & time" [includeTime]="true" [value]="draft[f.matchId] || ''" (valueChange)="draft[f.matchId]=$event"></app-date-time-field>
                <button class="primary" [disabled]="busy===f.matchId || !draft[f.matchId]" (click)="save(f)">
                  {{busy===f.matchId ? 'Saving…' : f.scheduledAt ? 'Reschedule' : 'Schedule'}}
                </button>
                <small class="current">{{f.scheduledAt ? 'Current: '+format(f.scheduledAt) : 'Not scheduled'}}</small>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="empty">No fixtures available. Generate league fixtures first.</div>
      }
    </section>
  } @else {
    <section class="card state">
      <h2>Tournament not found</h2>
      <a routerLink="/tournaments">Back to tournaments →</a>
    </section>
  }
</section>`,
 styles:[':host{display:block}.page{max-width:1180px;margin:auto;padding:34px 4vw 100px;color:#edf8f2}.card{border:1px solid #ffffff16;border-radius:22px;background:linear-gradient(180deg,#0f271ee8,#091712f7);box-shadow:0 18px 50px #0006}.back{display:inline-block;margin-bottom:18px;color:#91aa9d;text-decoration:none;font-size:12px}.back:hover{color:#b8f45c}.eyebrow{display:block;color:#789386;font-size:9px;font-weight:900;letter-spacing:2px}.hero{display:flex;justify-content:space-between;align-items:center;padding:30px}.hero h1{margin:8px 0 5px;font-size:clamp(34px,6vw,60px);letter-spacing:-3px}.hero p{margin:0;color:#91aa9d;font-size:11px}.badge{padding:8px 11px;border-radius:99px;background:#b8f45c15;color:#b8f45c;font-size:8px;font-weight:900;letter-spacing:1px}.notice,.error{margin:16px 0;padding:13px 15px;border-radius:12px;font-size:10px}.notice{background:#b8f45c12;color:#b8f45c;border:1px solid #b8f45c20}.error{background:#ff766d12;color:#ff9a94;border:1px solid #ff766d20}.panel{padding:22px;margin-top:18px}.head{display:flex;justify-content:space-between;align-items:start;margin-bottom:18px}.head h2{margin:6px 0 0;font-size:19px}.hint{color:#789386;font-size:8px}.fixtures{display:grid;gap:12px}.fixture{display:grid;grid-template-columns:42px 1fr 340px;gap:16px;align-items:center;padding:16px;border:1px solid #ffffff10;border-radius:15px;background:#ffffff03}.number{width:34px;height:34px;border-radius:10px;background:#b8f45c12;color:#b8f45c;display:grid;place-items:center;font-size:9px;font-weight:950}.match span{display:block;color:#789386;font-size:7px;font-weight:900;letter-spacing:1.2px}.match strong{display:block;margin-top:7px;font-size:14px}.match strong b{color:#b8f45c;padding:0 6px}.match small{display:block;margin-top:6px;color:#789386;font-size:8px}.schedule{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.primary{height:50px;border:0;border-radius:10px;padding:0 15px;background:#b8f45c;color:#10251e;font-size:9px;font-weight:950;cursor:pointer}.primary:disabled{opacity:.4;cursor:not-allowed}.current{grid-column:1/-1;color:#789386;font-size:8px}.empty,.state{padding:50px}.state h2{margin-bottom:20px}.state a{padding:12px 16px;background:#b8f45c;color:#10251e;border-radius:10px;text-decoration:none;font-size:10px;font-weight:900}@media(max-width:900px){.fixture{grid-template-columns:42px 1fr}.schedule{grid-column:1/-1;grid-template-columns:1fr auto}}@media(max-width:560px){.page{padding:24px 16px 70px}.hero{flex-direction:column;align-items:flex-start;gap:15px}.fixture{grid-template-columns:1fr}.number{margin-bottom:-4px}.schedule{grid-template-columns:1fr}.primary{width:100%}.head{flex-direction:column;gap:8px}}']
})
export class TournamentScheduleComponent {
 private readonly http=inject(HttpClient); private readonly route=inject(ActivatedRoute); readonly api='http://localhost:8080/api';
 id=this.route.snapshot.paramMap.get('id')||''; loading=true; busy=''; message=''; error=''; t:Tournament|null=null; fixtures:Fixture[]=[]; draft:Record<string,string>={};
 constructor(){if(this.id)this.load();else this.loading=false;}
 load(){this.http.get<Tournament>(this.api+'/tournaments/'+this.id).subscribe({next:t=>{this.t=t;this.http.get<Fixture[]>(this.api+'/tournaments/'+this.id+'/fixtures').subscribe({next:fs=>{this.fixtures=fs||[];for(const f of this.fixtures)if(f.scheduledAt&&!this.draft[f.matchId])this.draft[f.matchId]=this.toInput(f.scheduledAt);this.loading=false;},error:e=>{this.error=e?.error?.message||'Unable to load fixtures.';this.loading=false;}});},error:e=>{this.error=e?.error?.message||'Tournament could not be loaded.';this.loading=false;}});}
 save(f:Fixture){this.busy=f.matchId;this.message='';this.error='';this.http.post<Fixture>(this.api+'/tournaments/'+this.id+'/fixtures/'+f.matchId+'/schedule',{scheduledAt:this.toOffset(this.draft[f.matchId])}).subscribe({next:r=>{f.scheduledAt=r.scheduledAt;this.busy='';this.message='Fixture #'+(f.fixtureNumber||'—')+' scheduled successfully.';},error:e=>{this.busy='';this.error=e?.error?.message||'Unable to schedule fixture.';}});}
 private toInput(v:string){const d=new Date(v);if(Number.isNaN(d.getTime()))return '';const p=(n:number)=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());}
 private toOffset(v:string){const d=new Date(v);return d.toISOString();}
 format(v:string){return new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}
}
