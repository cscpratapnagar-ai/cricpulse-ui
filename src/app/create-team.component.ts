import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-team', standalone: true, imports: [FormsModule, RouterLink],
  template: `<main class="page"><header><a class="logo" routerLink="/dashboard"><span>◉</span> CricketPulse</a><a routerLink="/dashboard" class="back">← Dashboard</a></header><section class="form-wrap"><div class="eyebrow">BUILD YOUR SQUAD</div><h1>Create your<br><em>first team.</em></h1><p class="subtitle">Give your cricket community a home. You can invite players after this.</p><form (ngSubmit)="submit()"><label>Team name<input name="name" [(ngModel)]="name" placeholder="e.g. Riverside Warriors" required /></label><label>City or region<input name="city" [(ngModel)]="city" placeholder="e.g. Mumbai, India" /></label><button [disabled]="loading">{{ loading ? 'Creating team...' : 'Create team' }} <span>→</span></button></form>@if(error){<div class="error">{{error}}</div>}</section></main>`,
  styles: [`:host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.page{min-height:100vh;padding:28px 6vw;font-family:Inter,system-ui,sans-serif}.page header{max-width:1050px;margin:auto;display:flex;justify-content:space-between}.logo,.back{color:#f3fbf6;text-decoration:none}.logo{font-size:22px;font-weight:850}.logo span{color:#b8f45c;font-size:28px}.back{color:#91aa9d;font-size:12px}.form-wrap{width:min(560px,100%);margin:125px auto}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{font-size:clamp(52px,8vw,82px);line-height:.92;letter-spacing:-5px;margin:18px 0}em{color:#91aa9d;font-style:normal}.subtitle{color:#91aa9d;line-height:1.6}form{display:grid;gap:18px;padding:25px;border:1px solid #ffffff18;border-radius:20px;background:#0c2119d9}label{display:grid;gap:8px;color:#b9ccc2;font-size:12px;font-weight:750}input{box-sizing:border-box;width:100%;padding:15px;border:1px solid #ffffff1c;border-radius:10px;background:#ffffff0b;color:#fff;font:inherit}button{padding:15px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850}button span{float:right}.error{color:#ffaaa4;margin-top:15px}@media(max-width:480px){.page{padding:20px 14px}.form-wrap{margin-top:80px}h1{letter-spacing:-3px}}`]
})
export class CreateTeamComponent {
  private readonly http = inject(HttpClient); private readonly router = inject(Router);
  name = ''; city = ''; loading = false; error = '';
  submit(): void {
    const saved = localStorage.getItem('cricketpulse_user');
    const user = saved ? JSON.parse(saved) as { userId: string } : null;
    if (!user?.userId) { void this.router.navigateByUrl('/login'); return; }
    this.loading = true;
    this.http.post('http://localhost:8080/api/teams', { name: this.name, city: this.city, ownerId: user.userId }).subscribe({ next: team => { localStorage.setItem('cricketpulse_team', JSON.stringify(team)); void this.router.navigateByUrl('/dashboard'); }, error: () => { this.loading = false; this.error = 'The team could not be created. Please try again.'; } });
  }
}
