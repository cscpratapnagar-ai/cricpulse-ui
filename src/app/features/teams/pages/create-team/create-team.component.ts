import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface CreatedTeam { id:string; name:string; city:string|null; ownerId:string; }

@Component({
  selector:'app-create-team',
  standalone:true,
  imports:[FormsModule,RouterLink],
  template:`
  <main class="create-page">
    <section class="shell">
      <header class="page-head">
        <div>
          <a class="back-link" routerLink="/teams"><span>←</span> Teams</a>
          <div class="eyebrow"><i></i> TEAM WORKSPACE</div>
          <h1>Create a <em>team.</em></h1>
          <p>Set up your team identity now. Add your squad, assign roles and manage everything from one place.</p>
        </div>
        <div class="step-chip" aria-label="Step 1 of 2"><span>01</span><i></i><b>02</b><small>Team setup</small></div>
      </header>

      <div class="layout">
        <form class="create-card" (ngSubmit)="submit()" #teamForm="ngForm" novalidate>
          <div class="card-head">
            <div class="icon-box">✦</div>
            <div><h2>Team identity</h2><p>Start with the essentials. You can refine details later.</p></div>
          </div>

          <div class="field">
            <label for="team-name">Team name <b>Required</b></label>
            <div class="input-wrap" [class.invalid]="nameTouched && name.trim().length===0" [class.valid]="name.trim().length>=3">
              <input id="team-name" name="name" [(ngModel)]="name" (blur)="nameTouched=true" (input)="error=''" maxlength="60" autocomplete="organization" placeholder="e.g. Riverside Warriors" required>
              @if(name.trim().length>=3){<span class="field-status">✓</span>}
            </div>
            <div class="field-meta"><span>@if(nameTouched && name.trim().length===0){Team name is required.}@else if(name.trim().length>0 && name.trim().length<3){Use at least 3 characters.}@else{Choose a name your squad will recognise.}</span><b>{{name.trim().length}}/60</b></div>
          </div>

          <div class="field">
            <label for="team-city">City or region <span>Optional</span></label>
            <div class="input-wrap">
              <span class="input-icon">⌖</span>
              <input id="team-city" name="city" [(ngModel)]="city" (input)="error=''" maxlength="80" autocomplete="address-level2" placeholder="e.g. Mumbai, Maharashtra">
            </div>
            <div class="field-meta"><span>This helps identify your team in your workspace.</span><b>{{city.trim().length}}/80</b></div>
          </div>

          @if(error){<div class="alert error-alert" role="alert"><span>!</span><div><strong>Unable to create team</strong><p>{{error}}</p></div></div>}

          <div class="form-actions">
            <a routerLink="/teams" class="cancel">Cancel</a>
            <button type="submit" class="primary" [disabled]="loading || !canSubmit">
              @if(loading){<span class="spinner"></span> Creating team...}
              @else{Create team <span>→</span>}
            </button>
          </div>
          <p class="security-note">✦ You will automatically become this team's owner. Ownership is verified securely by the server.</p>
        </form>

        <aside class="preview-card">
          <div class="preview-top"><span>LIVE PREVIEW</span><i></i><small>Updates as you type</small></div>
          <div class="team-preview">
            <div class="team-mark">{{initials}}</div>
            <div class="team-copy">
              <h3>{{displayName}}</h3>
              <p><span>⌖</span> {{displayCity}}</p>
            </div>
          </div>
          <div class="preview-divider"></div>
          <div class="next-section">
            <span>WHAT'S NEXT</span>
            <div><b>01</b><p><strong>Create your team</strong><small>Set your team identity</small></p><i>✓</i></div>
            <div><b>02</b><p><strong>Build your squad</strong><small>Invite or add players</small></p></div>
            <div><b>03</b><p><strong>Start playing</strong><small>Create matches and score live</small></p></div>
          </div>
          <div class="preview-footer">You can change team details later from Team Management.</div>
        </aside>
      </div>
    </section>
  </main>`,
  styles:[`
:host{display:block}.create-page{min-height:100%;padding:32px 34px 56px;background:var(--cp-bg);color:var(--cp-text)}.shell{max-width:1160px;margin:auto}.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin:6px 0 32px}.back-link{display:inline-flex;gap:8px;align-items:center;color:var(--cp-muted);font-size:12px;font-weight:750;text-decoration:none;margin-bottom:26px;transition:color .2s,transform .2s}.back-link:hover{color:var(--cp-text);transform:translateX(-2px)}.eyebrow{display:flex;align-items:center;gap:8px;color:var(--cp-accent);font-size:10px;font-weight:850;letter-spacing:1.6px}.eyebrow i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}h1{margin:10px 0 10px;font-size:clamp(36px,4vw,54px);line-height:1;letter-spacing:-2.2px;font-weight:850}h1 em{font-style:normal;color:var(--cp-muted)}.page-head>div:first-child>p{max-width:620px;margin:0;color:var(--cp-muted);font-size:13px;line-height:1.65}.step-chip{display:grid;grid-template-columns:auto 32px auto;align-items:center;gap:8px;min-width:170px;padding:14px 16px;border:1px solid var(--cp-border);border-radius:15px;background:var(--cp-surface);box-shadow:var(--cp-shadow-sm)}.step-chip span,.step-chip b{font-size:12px}.step-chip span{color:var(--cp-accent)}.step-chip i{height:1px;background:var(--cp-border)}.step-chip b{color:var(--cp-muted)}.step-chip small{grid-column:1/-1;color:var(--cp-muted);font-size:9px;font-weight:750;letter-spacing:.7px;text-transform:uppercase}.layout{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(300px,.82fr);gap:22px;align-items:start}.create-card,.preview-card{border:1px solid var(--cp-border);border-radius:20px;background:var(--cp-surface);box-shadow:var(--cp-shadow-sm)}.create-card{padding:28px;animation:cardIn .45s cubic-bezier(.22,1,.36,1)}.card-head{display:flex;align-items:center;gap:13px;padding-bottom:23px;border-bottom:1px solid var(--cp-border);margin-bottom:24px}.icon-box{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:17px}.card-head h2{margin:0;font-size:16px;letter-spacing:-.3px}.card-head p{margin:4px 0 0;color:var(--cp-muted);font-size:11px}.field{margin-top:20px}.field label{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:11px;font-weight:800}.field label b{padding:3px 6px;border-radius:5px;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:8px;letter-spacing:.4px;text-transform:uppercase}.field label span{color:var(--cp-muted);font-weight:650}.input-wrap{position:relative;display:flex;align-items:center;height:46px;border:1px solid var(--cp-border);border-radius:12px;background:var(--cp-surface-2);transition:border-color .2s,box-shadow .2s,background .2s}.input-wrap:focus-within{border-color:var(--cp-accent);box-shadow:0 0 0 3px var(--cp-accent-soft);background:var(--cp-surface)}.input-wrap.valid{border-color:color-mix(in srgb,var(--cp-accent) 55%,var(--cp-border))}.input-wrap.invalid{border-color:#e77979}.input-wrap input{width:100%;height:100%;padding:0 42px 0 13px;border:0;outline:0;background:transparent;color:var(--cp-text);font:650 12px inherit}.input-wrap input::placeholder{color:var(--cp-muted);opacity:.72}.input-icon{padding-left:13px;color:var(--cp-muted);font-size:16px}.input-icon+input{padding-left:9px}.field-status{position:absolute;right:14px;color:var(--cp-accent);font-weight:900}.field-meta{display:flex;justify-content:space-between;gap:14px;margin-top:7px;color:var(--cp-muted);font-size:9px;line-height:1.4}.field-meta b{font-weight:700;white-space:nowrap}.alert{display:flex;gap:10px;margin-top:20px;padding:12px;border-radius:11px;font-size:11px}.error-alert{border:1px solid color-mix(in srgb,#e77979 32%,var(--cp-border));background:color-mix(in srgb,#e77979 8%,var(--cp-surface));color:#dc7b7b}.alert>span{display:grid;place-items:center;width:18px;height:18px;flex:0 0 18px;border-radius:50%;background:currentColor;color:var(--cp-surface);font-weight:900}.alert strong{font-size:11px}.alert p{margin:3px 0 0;line-height:1.45}.form-actions{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:28px}.cancel{padding:12px 8px;color:var(--cp-muted);font-size:11px;font-weight:750;text-decoration:none}.primary{min-width:175px;height:44px;display:inline-flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:11px;background:var(--cp-accent);color:var(--cp-accent-ink,#10251e);font:850 12px inherit;cursor:pointer;box-shadow:0 10px 22px color-mix(in srgb,var(--cp-accent) 20%,transparent);transition:transform .2s,box-shadow .2s,opacity .2s}.primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 28px color-mix(in srgb,var(--cp-accent) 28%,transparent)}.primary:active:not(:disabled){transform:translateY(0)}.primary:disabled{opacity:.48;cursor:not-allowed;box-shadow:none}.spinner{width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .65s linear infinite}.security-note{margin:19px 0 0;padding-top:16px;border-top:1px solid var(--cp-border);color:var(--cp-muted);font-size:9px;line-height:1.5}.preview-card{position:sticky;top:24px;overflow:hidden;animation:cardIn .55s .06s both cubic-bezier(.22,1,.36,1)}.preview-top{display:flex;align-items:center;gap:8px;padding:15px 18px;border-bottom:1px solid var(--cp-border);font-size:9px;font-weight:850;letter-spacing:1px;color:var(--cp-muted)}.preview-top i{width:5px;height:5px;border-radius:50%;background:var(--cp-accent);box-shadow:0 0 8px var(--cp-accent)}.preview-top small{margin-left:auto;font-size:8px;font-weight:650;letter-spacing:0}.team-preview{display:flex;align-items:center;gap:15px;padding:24px 20px}.team-mark{width:58px;height:58px;display:grid;place-items:center;flex:0 0 58px;border-radius:18px;background:linear-gradient(135deg,var(--cp-accent-soft),color-mix(in srgb,var(--cp-accent) 22%,var(--cp-surface)));border:1px solid color-mix(in srgb,var(--cp-accent) 26%,var(--cp-border));color:var(--cp-accent);font-size:17px;font-weight:900;letter-spacing:-1px;transition:transform .25s}.preview-card:hover .team-mark{transform:rotate(-3deg) scale(1.04)}.team-copy{min-width:0}.team-copy h3{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:17px;letter-spacing:-.5px}.team-copy p{display:flex;align-items:center;gap:5px;margin:7px 0 0;color:var(--cp-muted);font-size:10px}.preview-divider{height:1px;margin:0 20px;background:var(--cp-border)}.next-section{padding:20px}.next-section>span{display:block;margin-bottom:14px;color:var(--cp-muted);font-size:9px;font-weight:850;letter-spacing:1px}.next-section>div{display:flex;align-items:center;gap:11px;padding:9px 0}.next-section b{display:grid;place-items:center;width:23px;height:23px;flex:0 0 23px;border-radius:8px;background:var(--cp-surface-2);color:var(--cp-muted);font-size:9px}.next-section p{display:grid;gap:2px;margin:0}.next-section strong{font-size:10px}.next-section small{color:var(--cp-muted);font-size:9px}.next-section i{margin-left:auto;color:var(--cp-accent);font-style:normal;font-size:12px}.preview-footer{padding:13px 20px;background:var(--cp-surface-2);color:var(--cp-muted);font-size:9px;line-height:1.5}@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:800px){.create-page{padding:22px 18px 42px}.page-head{align-items:flex-start}.step-chip{display:none}.layout{grid-template-columns:1fr}.preview-card{position:relative;top:auto}.create-card{padding:22px}}@media(max-width:480px){.create-page{padding:16px 12px 32px}.page-head{margin-bottom:22px}.back-link{margin-bottom:20px}h1{font-size:38px}.create-card{padding:18px;border-radius:16px}.form-actions{align-items:stretch}.primary{min-width:0;flex:1}.preview-top small{display:none}}`]
})
export class CreateTeamComponent{
  private readonly http=inject(HttpClient);
  private readonly router=inject(Router);
  name=''; city=''; loading=false; error=''; nameTouched=false;
  get canSubmit(){return this.name.trim().length>=3 && this.name.trim().length<=60;}
  get displayName(){return this.name.trim()||'Your Team';}
  get displayCity(){return this.city.trim()||'Location not set';}
  get initials(){const words=this.displayName.split(/\s+/).filter(Boolean);return words.slice(0,2).map(x=>x[0]).join('').toUpperCase()||'YT';}
  submit():void{
    this.nameTouched=true;
    const name=this.name.trim();
    if(!this.canSubmit){this.error=name?'Team name must contain at least 3 characters.':'Please enter a team name.';return;}
    this.loading=true;this.error='';
    this.http.post<CreatedTeam>('http://localhost:8080/api/teams',{name,city:this.city.trim()||null}).subscribe({
      next:team=>{localStorage.setItem('cricketpulse_team',JSON.stringify(team));void this.router.navigateByUrl('/teams/'+team.id);},
      error:error=>{this.loading=false;this.error=error?.error?.message||'The team could not be created. Please try again.';}
    });
  }
}