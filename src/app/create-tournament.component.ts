import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from './ui/date-time-field.component';
import { CpDropdownComponent, CpDropdownOption } from './shared/cp-dropdown.component';

interface TournamentResponse { id:string; name:string; format:string; overs:number; location:string|null; startDate:string|null; status:string; }

type Step = 1|2|3;

@Component({
  selector:'app-create-tournament',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,DateTimeFieldComponent,CpDropdownComponent],
  template:`
<section class="page">
  <nav class="crumb" aria-label="Breadcrumb"><a routerLink="/tournaments">Tournaments</a><span>›</span><b>Create tournament</b></nav>

  <header class="hero">
    <div>
      <div class="eyebrow-row"><i></i><span class="eyebrow">COMPETITION SETUP</span><span class="draft-badge">DRAFT</span></div>
      <h1>Create a tournament<span>.</span></h1>
      <p>Build the competition foundation with a guided setup. You can manage teams, fixtures and live operations after creation.</p>
    </div>
    <div class="hero-actions">
      <button class="ghost" type="button" (click)="reset()" [disabled]="saving">Reset</button>
      <a class="ghost link-button" routerLink="/tournaments">Cancel</a>
    </div>
  </header>

  <section class="stepper card" aria-label="Tournament setup progress">
    @for(item of steps;track item.id){
      <button type="button" [class.active]="step===item.id" [class.done]="step>item.id" (click)="goTo(item.id)" [disabled]="saving">
        <span class="step-index">@if(step>item.id){✓}@else{0{{item.id}}}</span>
        <span><b>{{item.title}}</b><small>{{item.copy}}</small></span>
      </button>
      @if(item.id<3){<i class="step-line" [class.done]="step>item.id"></i>}
    }
  </section>

  <div class="layout">
    <section class="card setup-panel">
      @if(step===1){
        <div class="section-head"><div><span class="eyebrow">STEP 01 · IDENTITY</span><h2>Competition basics</h2><p>Give the tournament a clear identity and match format.</p></div><span class="step-count">01 / 03</span></div>
        <div class="form basics">
          <label class="field wide"><span>Tournament name <b>*</b></span><input #nameInput [(ngModel)]="draft.name" name="name" maxlength="90" placeholder="e.g. Pratapnagar Premier League" (ngModelChange)="clearFieldError('name')"><small>{{draft.name.length}} / 90 characters</small></label>
          <cp-dropdown label="Match format" name="format" [options]="formatOptions" [value]="draft.format" (valueChange)="draft.format=$event || 'T20'"></cp-dropdown>
          <label class="field"><span>Overs <b>*</b></span><input type="number" min="1" max="100" [(ngModel)]="draft.overs" name="overs" (ngModelChange)="clearFieldError('overs')"><small>1–100 overs</small></label>
        </div>
      } @else if(step===2){
        <div class="section-head"><div><span class="eyebrow">STEP 02 · SCHEDULE</span><h2>When and where</h2><p>Add operational details now, or complete them later from the tournament command center.</p></div><span class="step-count">02 / 03</span></div>
        <div class="form schedule">
          <app-date-time-field label="Start date" name="startDate" [includeTime]="false" [(value)]="draft.startDate"></app-date-time-field>
          <label class="field"><span>Location</span><input [(ngModel)]="draft.location" name="location" maxlength="100" placeholder="Venue or city"><small>Optional · can be updated later</small></label>
          <div class="info-card"><i>⌁</i><div><b>Flexible setup</b><p>Teams and fixtures are intentionally configured after the tournament shell is created.</p></div></div>
        </div>
      } @else {
        <div class="section-head"><div><span class="eyebrow">STEP 03 · REVIEW</span><h2>Ready to launch</h2><p>Review the competition foundation before creating the tournament.</p></div><span class="step-count">03 / 03</span></div>
        <div class="review">
          <div class="review-main"><span>TOURNAMENT</span><h3>{{draft.name || 'Untitled tournament'}}</h3><p>{{draft.format}} <i>·</i> {{draft.overs || 0}} overs</p></div>
          <div class="review-grid">
            <div><span>START DATE</span><b>{{draft.startDate || 'To be scheduled'}}</b></div>
            <div><span>LOCATION</span><b>{{draft.location || 'Not assigned'}}</b></div>
            <div><span>INITIAL STATUS</span><b class="ready">Upcoming</b></div>
            <div><span>NEXT STEP</span><b>Add teams</b></div>
          </div>
          <div class="launch-note"><i></i><span>Creating the tournament does not publish fixtures or start live scoring. Those remain controlled in the next setup stages.</span></div>
        </div>
      }

      @if(error){<div class="notice" role="alert"><b>Setup needs attention</b><span>{{error}}</span></div>}

      <footer class="panel-footer">
        <div class="autosave"><i></i><span>Draft stays in this setup until you create or reset it.</span></div>
        <div class="actions">
          @if(step>1){<button class="text" type="button" (click)="previous()" [disabled]="saving">Back</button>}
          @if(step<3){<button class="primary" type="button" (click)="next()">Continue <b>→</b></button>}
          @if(step===3){<button class="primary launch" type="button" (click)="create()" [disabled]="saving">{{saving?'Creating tournament…':'Create tournament'}} <b>→</b></button>}
        </div>
      </footer>
    </section>

    <aside class="sidebar">
      <section class="card preview">
        <div class="preview-head"><span class="eyebrow">LIVE PREVIEW</span><span class="pulse"><i></i> READY</span></div>
        <div class="preview-icon">{{formatIcon}}</div>
        <h3>{{draft.name || 'Tournament name'}}</h3>
        <p>{{draft.format}} <i>·</i> {{draft.overs || 0}} overs</p>
        <div class="preview-meta"><div><span>START</span><b>{{draft.startDate || 'TBD'}}</b></div><div><span>VENUE</span><b>{{draft.location || 'Not assigned'}}</b></div></div>
      </section>
      <section class="card checklist">
        <span class="eyebrow">SETUP CHECKLIST</span>
        <div [class.complete]="!!draft.name"><i>{{draft.name?'✓':'1'}}</i><span>Name the competition</span></div>
        <div [class.complete]="!!draft.format && draft.overs>0"><i>{{draft.format && draft.overs>0?'✓':'2'}}</i><span>Choose format and overs</span></div>
        <div [class.complete]="step===3"><i>{{step===3?'✓':'3'}}</i><span>Review and create</span></div>
      </section>
    </aside>
  </div>
</section>
`,
styles:[`
:host{display:block}*{box-sizing:border-box}.page{max-width:1180px;margin:auto;padding:30px 4vw 90px;color:var(--cp-text);animation:page-in .42s cubic-bezier(.2,.8,.2,1)}.crumb{display:flex;align-items:center;gap:9px;margin-bottom:22px;color:var(--cp-text-muted);font-size:9px;font-weight:800}.crumb a{color:var(--cp-text-muted);text-decoration:none}.crumb a:hover{color:var(--cp-accent)}.crumb span{opacity:.5}.crumb b{color:var(--cp-text)}.hero{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:24px}.eyebrow-row{display:flex;align-items:center;gap:8px}.eyebrow-row>i,.autosave>i,.pulse i{width:6px;height:6px;border-radius:50%;background:var(--cp-accent);box-shadow:0 0 12px color-mix(in srgb,var(--cp-accent) 65%,transparent);animation:pulse 1.8s infinite}.eyebrow{color:var(--cp-text-muted);font-size:8px;font-weight:900;letter-spacing:1.5px}.draft-badge{padding:3px 7px;border:1px solid color-mix(in srgb,var(--cp-accent) 25%,var(--cp-border));border-radius:99px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:7px;font-weight:900;letter-spacing:.8px}.hero h1{margin:10px 0 8px;font-size:clamp(36px,5vw,58px);line-height:.96;letter-spacing:-2.7px}.hero h1 span{color:var(--cp-accent)}.hero p{max-width:650px;margin:0;color:var(--cp-text-muted);font-size:11px;line-height:1.6}.hero-actions,.actions{display:flex;gap:9px;align-items:center}.ghost,.primary,.text{min-height:42px;padding:0 15px;border-radius:11px;font:900 9px inherit;cursor:pointer;transition:transform .16s,box-shadow .16s,border-color .16s}.ghost{border:1px solid var(--cp-border);background:var(--cp-surface);color:var(--cp-text)}.link-button{display:inline-flex;align-items:center;text-decoration:none}.primary{border:1px solid color-mix(in srgb,var(--cp-accent) 45%,transparent);background:var(--cp-accent);color:var(--cp-accent-contrast);box-shadow:0 9px 24px color-mix(in srgb,var(--cp-accent) 20%,transparent)}.text{border:0;background:transparent;color:var(--cp-text-muted)}.ghost:hover,.text:hover{transform:translateY(-2px);color:var(--cp-text)}.primary:hover{transform:translateY(-2px);box-shadow:0 14px 30px color-mix(in srgb,var(--cp-accent) 28%,transparent)}button:disabled{opacity:.55;cursor:not-allowed;transform:none!important}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--cp-focus-ring);outline-offset:3px}.card{border:1px solid var(--cp-card-border);border-radius:20px;background:var(--cp-card-bg);box-shadow:var(--cp-shadow-sm)}.stepper{display:flex;align-items:center;padding:13px 18px;margin-bottom:18px;overflow:auto}.stepper button{display:flex;align-items:center;gap:10px;min-width:190px;padding:8px;border:0;background:transparent;color:var(--cp-text-muted);text-align:left;cursor:pointer}.step-index{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--cp-border);border-radius:9px;font-size:8px;font-weight:900}.stepper b{display:block;font-size:9px}.stepper small{display:block;margin-top:3px;font-size:7px}.stepper button.active,.stepper button.done{color:var(--cp-text)}.stepper button.active .step-index{border-color:var(--cp-accent);background:var(--cp-accent-soft);color:var(--cp-accent);box-shadow:0 0 0 3px var(--cp-accent-soft)}.stepper button.done .step-index{border-color:var(--cp-accent);background:var(--cp-accent);color:var(--cp-accent-contrast)}.step-line{height:1px;flex:1;min-width:20px;background:var(--cp-border)}.step-line.done{background:var(--cp-accent)}.layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:18px}.setup-panel{padding:25px;animation:panel-in .3s ease both}.section-head{display:flex;justify-content:space-between;gap:20px}.section-head h2{margin:7px 0 6px;font-size:22px;letter-spacing:-.7px}.section-head p{margin:0;color:var(--cp-text-muted);font-size:10px;line-height:1.55}.step-count{padding:7px 9px;border:1px solid var(--cp-border);border-radius:99px;color:var(--cp-text-muted);font-size:7px;font-weight:900;letter-spacing:.8px}.form{display:grid;gap:14px;margin-top:24px}.basics{grid-template-columns:1.5fr 1fr}.schedule{grid-template-columns:1fr 1fr}.wide{grid-column:1/-1}.field{display:grid;gap:7px}.field>span{color:var(--cp-text-muted);font-size:8px;font-weight:850;letter-spacing:.7px}.field>span b{color:var(--cp-accent)}.field input{width:100%;height:46px;padding:0 13px;border:1px solid var(--cp-border);border-radius:11px;background:var(--cp-surface-raised);color:var(--cp-text);font:600 10px inherit}.field input:focus{border-color:color-mix(in srgb,var(--cp-accent) 55%,var(--cp-border));box-shadow:0 0 0 3px var(--cp-accent-soft);outline:0}.field small{color:var(--cp-text-muted);font-size:7px}.info-card{grid-column:1/-1;display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid var(--cp-border);border-radius:13px;background:var(--cp-surface)}.info-card>i{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--cp-accent-soft);color:var(--cp-accent);font-style:normal;font-size:16px}.info-card b{font-size:9px}.info-card p{margin:4px 0 0;color:var(--cp-text-muted);font-size:8px;line-height:1.5}.review{margin-top:24px;border:1px solid var(--cp-border);border-radius:16px;overflow:hidden;background:var(--cp-surface)}.review-main{padding:22px;background:linear-gradient(135deg,var(--cp-accent-soft),transparent)}.review-main>span,.review-grid span{display:block;color:var(--cp-text-muted);font-size:7px;font-weight:900;letter-spacing:1px}.review-main h3{margin:9px 0 5px;font-size:24px;letter-spacing:-.8px}.review-main p{margin:0;color:var(--cp-text-muted);font-size:9px}.review-main p i{padding:0 5px;color:var(--cp-accent);font-style:normal}.review-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--cp-border)}.review-grid>div{padding:14px;border-right:1px solid var(--cp-border);border-bottom:1px solid var(--cp-border)}.review-grid b{display:block;margin-top:6px;font-size:9px}.ready{color:var(--cp-accent)}.launch-note{display:flex;gap:8px;padding:12px 14px;color:var(--cp-text-muted);font-size:8px;line-height:1.5}.launch-note i{width:5px;height:5px;flex:0 0 5px;margin-top:4px;border-radius:50%;background:var(--cp-accent)}.notice{display:grid;gap:4px;margin-top:16px;padding:12px 14px;border:1px solid var(--cp-danger);border-radius:12px;background:var(--cp-danger-soft);color:var(--cp-danger);font-size:9px}.notice b{font-size:9px}.panel-footer{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:26px;padding-top:17px;border-top:1px solid var(--cp-border)}.autosave{display:flex;align-items:center;gap:7px;color:var(--cp-text-muted);font-size:8px}.autosave>i{width:5px;height:5px}.launch{min-width:175px}.sidebar{display:grid;align-content:start;gap:14px}.preview{padding:19px;overflow:hidden}.preview-head{display:flex;justify-content:space-between;align-items:center}.pulse{display:inline-flex;align-items:center;gap:5px;color:var(--cp-accent);font-size:7px;font-weight:900}.pulse i{width:5px;height:5px}.preview-icon{display:grid;place-items:center;width:50px;height:50px;margin:20px 0 14px;border:1px solid color-mix(in srgb,var(--cp-accent) 25%,var(--cp-border));border-radius:16px;background:var(--cp-accent-soft);font-size:23px}.preview h3{margin:0;font-size:18px;line-height:1.2;overflow-wrap:anywhere}.preview p{margin:7px 0 18px;color:var(--cp-text-muted);font-size:9px}.preview p i{padding:0 4px;color:var(--cp-accent);font-style:normal}.preview-meta{display:grid;gap:11px;padding-top:14px;border-top:1px solid var(--cp-border)}.preview-meta span{display:block;color:var(--cp-text-muted);font-size:7px;font-weight:900;letter-spacing:.8px}.preview-meta b{display:block;margin-top:4px;font-size:8px;overflow-wrap:anywhere}.checklist{padding:18px}.checklist>.eyebrow{margin-bottom:12px}.checklist>div{display:flex;align-items:center;gap:9px;padding:9px 0;border-top:1px solid var(--cp-border);color:var(--cp-text-muted);font-size:8px;font-weight:700}.checklist i{display:grid;place-items:center;width:20px;height:20px;border:1px solid var(--cp-border);border-radius:7px;font-style:normal;font-size:7px}.checklist .complete{color:var(--cp-text)}.checklist .complete i{border-color:var(--cp-accent);background:var(--cp-accent-soft);color:var(--cp-accent)}@keyframes page-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes panel-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{grid-template-columns:1fr 1fr}.preview,.checklist{height:100%}}@media(max-width:680px){.page{padding:22px 16px 70px}.hero{flex-direction:column}.hero-actions{width:100%}.hero-actions>*{flex:1;text-align:center;justify-content:center}.stepper{padding:10px}.stepper button{min-width:150px}.step-line{display:none}.basics,.schedule{grid-template-columns:1fr}.sidebar{grid-template-columns:1fr}.panel-footer{align-items:flex-start;flex-direction:column}.panel-footer .actions{width:100%}.panel-footer .actions>*{flex:1}.review-grid{grid-template-columns:1fr}.review-grid>div{border-right:0}}@media(prefers-reduced-motion:reduce){.page,.setup-panel,.eyebrow-row>i,.autosave>i,.pulse i,.ghost,.primary,.text{animation:none!important;transition:none!important}}`]
})
export class CreateTournamentComponent {
  private readonly http=inject(HttpClient);
  private readonly router=inject(Router);
  readonly api='http://localhost:8080/api';
  step:Step=1;
  saving=false;
  error='';
  draft={name:'',format:'T20',overs:20,startDate:'',location:''};
  readonly steps=[{id:1 as Step,title:'Basics',copy:'Identity and format'},{id:2 as Step,title:'Schedule',copy:'Date and location'},{id:3 as Step,title:'Review',copy:'Confirm and launch'}];
  readonly formatOptions:CpDropdownOption[]=[{value:'T10',label:'T10'},{value:'T20',label:'T20'},{value:'ODI',label:'ODI'},{value:'TEST',label:'Test'}];

  get formatIcon(){const key=this.draft.format.toUpperCase();return key==='TEST'?'♜':key==='ODI'?'◉':key==='T10'?'⚡':'🏆';}
  clearFieldError(_:string){this.error='';}
  goTo(target:Step){if(target<this.step){this.step=target;this.error='';return;}while(this.step<target){if(!this.validateStep())return;this.step=(this.step+1) as Step;}}
  next(){if(this.validateStep())this.step=(this.step+1) as Step;}
  previous(){this.step=(this.step-1) as Step;this.error='';}
  reset(){this.step=1;this.error='';this.draft={name:'',format:'T20',overs:20,startDate:'',location:''};}
  private validateStep(){this.error='';if(this.step===1){if(!this.draft.name.trim()){this.error='Tournament name is required before continuing.';return false;}if(!this.draft.overs||this.draft.overs<1||this.draft.overs>100){this.error='Overs must be between 1 and 100.';return false;}}return true;}
  create(){if(!this.validateStep())return;this.saving=true;this.error='';const payload={name:this.draft.name.trim(),format:this.draft.format,overs:Number(this.draft.overs),startDate:this.draft.startDate||null,location:this.draft.location.trim()||null};this.http.post<TournamentResponse>(`${this.api}/tournaments`,payload).subscribe({next:t=>{this.saving=false;this.router.navigate(['/tournaments',t.id]);},error:e=>{this.saving=false;this.error=e?.error?.message||'Unable to create tournament. Please try again.';}});}
}