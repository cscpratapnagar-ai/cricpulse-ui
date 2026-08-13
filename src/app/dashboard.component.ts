import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, inject, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ElementRef, ViewChild } from '@angular/core';
import { clearSession } from './auth';

interface CurrentUser { userId: string; fullName: string; role: string; }

@Component({
  selector: 'app-dashboard', standalone: true, imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <main class="app-shell" [class.sidebar-active]="sidebarOpen">
      @if(sidebarOpen){<button class="sidebar-backdrop" aria-label="Close navigation" (click)="closeSidebar()"></button>}
      <aside #sidebar class="sidebar" [class.open]="sidebarOpen">
        <div class="sidebar-head"><a class="logo" routerLink="/dashboard" (click)="closeSidebar()"><span>◉</span><b>CricketPulse</b></a><button class="close-sidebar" aria-label="Close navigation" (click)="closeSidebar()">×</button></div>
        <div class="workspace"><span class="team-mark">{{ teamInitial }}</span><div><small>ACTIVE WORKSPACE</small><strong>{{ team?.name || 'Personal workspace' }}</strong></div></div>
        <nav>
          <div class="nav-label">OVERVIEW</div>
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="closeSidebar()"><i>⌂</i> Home</a>
          <a routerLink="/matches" routerLinkActive="active" (click)="closeSidebar()"><i>◉</i> Matches</a>
          <a routerLink="/live" routerLinkActive="active" (click)="closeSidebar()"><i>●</i> Live center <em>LIVE</em></a>
          <div class="nav-label">MANAGE</div>
          <a routerLink="/teams" routerLinkActive="active" (click)="closeSidebar()"><i>◈</i> Teams</a>
          <a routerLink="/players" routerLinkActive="active" (click)="closeSidebar()"><i>♙</i> Players</a>
          <a routerLink="/tournaments" routerLinkActive="active" (click)="closeSidebar()"><i>♜</i> Tournaments</a>
          <div class="nav-label">INSIGHTS</div>
          <a routerLink="/analytics" routerLinkActive="active" (click)="closeSidebar()"><i>✦</i> Analytics</a>
          <a routerLink="/leaderboards" routerLinkActive="active" (click)="closeSidebar()"><i>↗</i> Leaderboards</a>
        </nav>
        <div class="sidebar-bottom"><a routerLink="/settings" (click)="closeSidebar()"><i>⚙</i> Settings</a><button (click)="logout()"><i>↪</i> Sign out</button></div>
      </aside>
        <section class="content">
        <header class="topbar"><button class="menu" (click)="toggleSidebar()">☰</button><div class="crumb">Home</div><div class="top-actions"><button class="icon-btn">⌕</button><button class="icon-btn">♢</button><div class="profile"><span>{{ initials }}</span><div><b>{{ user?.fullName || 'Player' }}</b><small>{{ user?.role || 'PLAYER' }}</small></div></div></div></header>
        <div class="page-content"><router-outlet></router-outlet></div>
      </section>
      <nav class="mobile-nav"><a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">⌂<small>Home</small></a><a routerLink="/matches" routerLinkActive="active">◉<small>Matches</small></a><a routerLink="/live" routerLinkActive="active">●<small>Live</small></a><a routerLink="/teams" routerLinkActive="active">◈<small>Teams</small></a><a routerLink="/players" routerLinkActive="active">♙<small>Players</small></a></nav>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#07130f;color:#edf8f2}.app-shell{display:flex;min-height:100vh;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 80% 0,#123d2d 0,transparent 28%)}.sidebar{box-sizing:border-box;display:flex;flex-direction:column;width:250px;min-width:250px;height:100vh;overflow-y:auto;padding:27px 16px;border-right:1px solid #ffffff12;background:#091a14e8}.sidebar-head{display:flex;align-items:center;justify-content:space-between}.logo{display:flex;gap:8px;align-items:center;padding:0 12px;color:#f3fbf6;text-decoration:none;font-size:20px}.logo span{color:#b8f45c;font-size:27px}.close-sidebar{display:none}.sidebar-backdrop{display:none}.workspace{display:flex;align-items:center;gap:10px;margin:38px 0 25px;padding:10px;border:1px solid #ffffff12;border-radius:12px;background:#ffffff08}.team-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:#b8f45c;color:#10251e;font-weight:900}.workspace div{display:grid;gap:4px;min-width:0}.workspace small,.profile small{color:#789386;font-size:8px;letter-spacing:1px}.workspace strong{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.sidebar nav{display:grid;gap:4px}.nav-label{margin:17px 12px 7px;color:#527366;font-size:9px;font-weight:850;letter-spacing:1.7px}.sidebar nav a,.sidebar-bottom a,.sidebar-bottom button{display:flex;align-items:center;gap:12px;padding:11px 12px;border:0;border-radius:9px;background:transparent;color:#91aa9d;text-decoration:none;font:inherit;font-size:12px;text-align:left;cursor:pointer}.sidebar nav a:hover,.sidebar-bottom a:hover,.sidebar-bottom button:hover,.sidebar nav a.active{background:#b8f45c14;color:#f3fbf6}.sidebar nav a.active{box-shadow:inset 2px 0 #b8f45c}.sidebar i{width:16px;color:#789386;font-style:normal;text-align:center}.sidebar a.active i{color:#b8f45c}.sidebar em{margin-left:auto;padding:3px 5px;border-radius:4px;background:#b8f45c;color:#10251e;font-size:7px;font-style:normal;font-weight:900}.sidebar-bottom{margin-top:auto;border-top:1px solid #ffffff12;padding-top:15px}.content{min-width:0;flex:1}.topbar{box-sizing:border-box;display:flex;align-items:center;height:78px;padding:0 4vw;border-bottom:1px solid #ffffff12}.crumb{font-size:14px;font-weight:750}.menu{display:none}.top-actions{display:flex;align-items:center;gap:11px;margin-left:auto}.icon-btn{width:34px;height:34px;border:1px solid #ffffff14;border-radius:9px;background:#ffffff08;color:#91aa9d}.profile{display:flex;align-items:center;gap:9px;margin-left:10px}.profile>span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#b8f45c;color:#10251e;font-size:10px;font-weight:900}.profile div{display:grid;gap:3px}.profile b{font-size:11px}.home-content{max-width:1000px;padding:78px 4vw}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{margin:18px 0;font-size:clamp(48px,7vw,80px);line-height:.94;letter-spacing:-5px}h1 span{color:#b8f45c}em{color:#91aa9d;font-style:normal}.home-content>p{color:#91aa9d}.primary{margin-top:25px;padding:14px 18px;border:0;border-radius:10px;background:#b8f45c;color:#10251e;font-weight:850;cursor:pointer}.primary b{margin-left:18px;font-size:18px}.team-banner{display:grid;gap:5px;width:max-content;margin-top:25px;padding:16px 20px;border:1px solid #b8f45c35;border-radius:12px;background:#0c2119d9}.team-banner small{color:#b8f45c;font-size:9px;letter-spacing:1.2px}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:55px;max-width:780px}.quick-grid a{display:grid;gap:10px;padding:20px;border:1px solid #ffffff18;border-radius:16px;background:#0c2119d9;color:#edf8f2;text-decoration:none}.quick-grid a:hover{border-color:#b8f45c55;transform:translateY(-2px)}.quick-grid small{color:#789386}.mobile-nav{display:none}@media(max-width:800px){.app-shell.sidebar-active{height:100vh;overflow:hidden}.content{min-height:100vh}.sidebar{position:fixed;z-index:20;top:0;bottom:0;left:0;transform:translateX(-100%);transition:transform .25s;box-shadow:20px 0 50px #0008}.sidebar.open{transform:translateX(0)}.sidebar-head{min-height:34px}.close-sidebar{display:block;width:32px;height:32px;border:1px solid #ffffff18;border-radius:9px;background:#ffffff0b;color:#b8f45c;font-size:24px;line-height:1;cursor:pointer}.sidebar-backdrop{display:block;position:fixed;z-index:15;inset:0;width:100vw;height:100vh;border:0;background:#0009;backdrop-filter:blur(2px)}.menu{display:block;margin-right:16px;border:0;background:transparent;color:#b8f45c;font-size:20px}.topbar{height:64px;padding:0 18px}.profile div,.icon-btn{display:none}.home-content{padding:55px 20px 90px}.quick-grid{grid-template-columns:1fr;margin-top:35px}h1{letter-spacing:-3px}.mobile-nav{position:fixed;z-index:5;right:0;bottom:0;left:0;display:flex;justify-content:space-around;padding:9px 4px;border-top:1px solid #ffffff18;background:#091a14f5;backdrop-filter:blur(15px)}.mobile-nav a{display:grid;gap:3px;justify-items:center;color:#789386;text-decoration:none;font-size:18px}.mobile-nav a.active{color:#b8f45c}.mobile-nav small{font-size:8px}}
  `]
})
export class DashboardComponent implements AfterViewInit {
  private readonly http=inject(HttpClient); private readonly router=inject(Router); user:CurrentUser|null=null; team:{name:string}|null=null; sidebarOpen=false;
  @ViewChild('sidebar') sidebar?: ElementRef<HTMLElement>;
  constructor(){const saved=localStorage.getItem('cricketpulse_team');this.team=saved?JSON.parse(saved) as {name:string}:null;this.router.events.subscribe(event=>{if(event instanceof NavigationEnd){setTimeout(()=>this.resetSidebarScroll(),0)}});this.http.get<CurrentUser>('http://localhost:8080/api/auth/me').subscribe({next:u=>this.user=u,error:()=>{clearSession();this.closeSidebar();void this.router.navigateByUrl('/login')}})}
  ngAfterViewInit():void{this.resetSidebarScroll()}
  get initials():string{return(this.user?.fullName||'P').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
  get teamInitial():string{return(this.team?.name||'P').charAt(0).toUpperCase()}
  toggleSidebar():void{this.sidebarOpen ? this.closeSidebar() : this.openSidebar()}
  openSidebar():void{this.sidebarOpen=true;document.body.style.overflow='hidden'}
  closeSidebar():void{this.sidebarOpen=false;document.body.style.overflow=''}
  private resetSidebarScroll():void{if(this.sidebar){this.sidebar.nativeElement.scrollTop=0;this.sidebar.nativeElement.style.overflowY=window.innerWidth<=800?'auto':'hidden'}}
  logout():void{clearSession();void this.router.navigateByUrl('/login')}
  ngOnDestroy():void{document.body.style.overflow=''}
}
