import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home', standalone: true, imports: [RouterLink],
  template: `<section class="home-content"><div class="eyebrow">YOUR CRICKET WORLD</div><h1>Welcome<span>,</span><br><em>{{name}}.</em></h1><p>{{team ? 'Your cricket world is ready.' : 'Your account is ready. Let’s set up your cricket world.'}}</p>@if(!team){<button class="primary" routerLink="/teams/new">Create your first team <b>→</b></button>}@else{<div class="team-banner"><b>{{team.name}}</b><small>ACTIVE WORKSPACE</small></div>}<div class="quick-grid"><a routerLink="/matches"><b>◉ Matches</b><small>Manage matchdays and fixtures.</small></a><a routerLink="/players"><b>♙ Players</b><small>Build your roster.</small></a><a routerLink="/tournaments"><b>♜ Tournaments</b><small>Run competitions.</small></a></div></section>`,
  styles: [`:host{display:block}.home-content{max-width:1000px;padding:78px 4vw}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{margin:18px 0;font-size:clamp(48px,7vw,80px);line-height:.94;letter-spacing:-5px}h1 span{color:#b8f45c}em{color:#91aa9d;font-style:normal}.home-content>p{color:#91aa9d}.primary{margin-top:25px;padding:14px 18px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}.primary b{margin-left:18px;font-size:18px}.team-banner{display:grid;gap:5px;width:max-content;margin-top:25px;padding:16px 20px;border:1px solid #b8f45c35;border-radius:12px;background:#0c2119d9}.team-banner small{color:#b8f45c;font-size:9px;letter-spacing:1.2px}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:55px;max-width:780px}.quick-grid a{display:grid;gap:10px;padding:20px;border:1px solid #ffffff18;border-radius:16px;background:#0c2119d9;color:#edf8f2;text-decoration:none}.quick-grid a:hover{border-color:#b8f45c55;transform:translateY(-2px)}.quick-grid small{color:#789386}@media(max-width:800px){.home-content{padding:55px 20px 90px}.quick-grid{grid-template-columns:1fr;margin-top:35px}h1{letter-spacing:-3px}}`]
})
export class HomeComponent {
  name = JSON.parse(localStorage.getItem('cricketpulse_user') || '{"fullName":"Cricket player"}').fullName as string;
  team = JSON.parse(localStorage.getItem('cricketpulse_team') || 'null') as {name:string} | null;
}
