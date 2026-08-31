import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  scheduledAt?: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}

type Filter = 'ALL' | 'SCHEDULED' | 'LIVE' | 'COMPLETED';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="matches-page">
      <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>

      <header class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span></span> Match operations</div>
          <h1>Your <em>matchday</em><br>command center.</h1>
          <p>Monitor every fixture, jump into live action, and keep your cricket workspace moving.</p>
        </div>
        <div class="hero-actions">
          <button class="icon-action" type="button" (click)="load()" title="Refresh">↻</button>
          <a class="create-btn" routerLink="/matches/new"><span>＋</span> Create match</a>
        </div>
      </header>

      <section class="intel-strip">
        <div class="intel-card"><div class="intel-icon live-icon">◉</div><div><b>{{ liveCount }}</b><span>Live now</span></div><i></i></div>
        <div class="intel-card"><div class="intel-icon">◷</div><div><b>{{ scheduledCount }}</b><span>Upcoming</span></div></div>
        <div class="intel-card"><div class="intel-icon">✓</div><div><b>{{ completedCount }}</b><span>Completed</span></div></div>
        <div class="intel-card total"><div><small>Workspace total</small><b>{{ matches.length }} <span>matches</span></b></div><div class="mini-bars"><i></i><i></i><i></i><i></i><i></i></div></div>
      </section>

      <section class="control-bar">
        <div class="tabs">
          @for (item of filterOptions; track item.value) {
            <button type="button" [class.active]="activeFilter === item.value" (click)="setFilter(item.value)">
              {{ item.label }} <span>{{ countFor(item.value) }}</span>
            </button>
          }
        </div>
        <label class="search-box">
          <span>⌕</span>
          <input [(value)]="query" (input)="onSearch($event)" placeholder="Search matches, teams..." />
          @if(query){<button type="button" (click)="query=''">×</button>}
        </label>
      </section>

      @if(loading){
        <div class="loading-grid">
          @for(item of [1,2,3,4]; track item){<div class="skeleton-card"><i></i><i></i><i></i></div>}
        </div>
      } @else if(error) {
        <section class="state-card error-state"><div class="state-icon">!</div><h2>Couldn’t load your matches</h2><p>The workspace connection needs another try.</p><button (click)="load()">Try again</button></section>
      } @else if(filteredMatches.length) {
        <div class="list-header"><span>{{ filteredMatches.length }} Match{{ filteredMatches.length === 1 ? '' : 'ES' }} FOUND</span><small>Updated just now</small></div>
        <div class="match-grid">
          @for(match of filteredMatches; track match.id; let index = $index){
            <article class="match-card" [class.live-card]="normalizeStatus(match.status)==='LIVE'" [style.--delay]="index * 55 + 'ms'">
              <div class="card-no">0{{ index + 1 }}</div>
              <div class="card-top">
                <span class="status" [attr.data-status]="normalizeStatus(match.status)">
                  <i></i>{{ statusLabel(match.status) }}
                </span>
                <button class="more" type="button">•••</button>
              </div>

              <div class="match-title">
                <span class="format">{{ match.format || 'CRICKET' }}</span>
                <h2>{{ match.name || 'Untitled Match' }}</h2>
                <p>{{ displayDate(match.scheduledAt) }}</p>
              </div>

              <div class="versus-zone">
                <div class="club">
                  <div class="crest">{{ initials(match.teamAName || 'Team A') }}</div>
                  <strong>{{ match.teamAName || 'Team A' }}</strong>
                  <small>HOME</small>
                </div>
                <div class="vs"><span>VS</span><i></i></div>
                <div class="club away">
                  <div class="crest alt">{{ initials(match.teamBName || 'Team B') }}</div>
                  <strong>{{ match.teamBName || 'Team B' }}</strong>
                  <small>AWAY</small>
                </div>
              </div>

              <div class="card-footer">
                <div class="match-meta">
                  <span>◷ {{ timeHint(match) }}</span>
                  @if(normalizeStatus(match.status)==='LIVE'){<span class="pulse-meta">● LIVE DATA</span>}
                </div>
                <a [routerLink]="['/matches', match.id]">Open workspace <b>→</b></a>
              </div>
            </article>
          }
        </div>
      } @else {
        <section class="state-card">
          <div class="empty-orbit"><span>◉</span></div>
          <div class="eyebrow"><span></span> CLEAN SLATE</div>
          <h2>No matches in view.</h2>
          <p>{{ query ? 'Try a different search or switch filters.' : 'Your matchday workspace is ready for its first fixture.' }}</p>
          @if(query){<button (click)="query=''">Clear search</button>} @else {<a routerLink="/matches/new">Create your first match →</a>}
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block;--ink:var(--cp-text);--muted:var(--cp-text-muted);--line:var(--cp-border);--panel:var(--cp-surface);--raised:var(--cp-surface-raised);--accent:var(--cp-accent);--accent-soft:var(--cp-accent-soft);}
    .matches-page{position:relative;isolation:isolate;max-width:1440px;margin:0 auto;padding:44px 4vw 100px;color:var(--ink);overflow:hidden}
    .ambient{position:absolute;pointer-events:none;filter:blur(70px);opacity:.12;border-radius:50%;z-index:-1}.ambient-one{width:420px;height:420px;background:var(--accent);right:-180px;top:80px}.ambient-two{width:320px;height:320px;background:#52b8ff;left:-180px;top:420px}
    .hero{display:flex;justify-content:space-between;gap:32px;align-items:flex-end;margin-bottom:34px}.eyebrow{display:flex;align-items:center;gap:9px;color:var(--accent);font-size:10px;font-weight:900;letter-spacing:2.2px}.eyebrow span{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}
    .hero h1{margin:13px 0 12px;font-size:clamp(30px,3.2vw,48px);line-height:1.04;letter-spacing:-2.2px;font-weight:780}.hero h1 em{font-style:normal;color:var(--accent)}.hero p{margin:0;max-width:570px;color:var(--muted);font-size:12px;line-height:1.65}
    .hero-actions{display:flex;gap:10px;align-items:center;flex:none}.icon-action,.create-btn{height:48px;border-radius:14px}.icon-action{width:48px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-size:20px;cursor:pointer;transition:.25s}.icon-action:hover{transform:rotate(45deg);border-color:var(--accent)}.create-btn{display:inline-flex;align-items:center;gap:9px;padding:0 18px;background:var(--accent);color:#102019;text-decoration:none;font-size:12px;font-weight:900;box-shadow:0 16px 34px color-mix(in srgb,var(--accent) 16%,transparent);transition:.25s}.create-btn:hover{transform:translateY(-2px);box-shadow:0 20px 40px color-mix(in srgb,var(--accent) 25%,transparent)}.create-btn span{font-size:18px}
    .intel-strip{display:grid;grid-template-columns:repeat(3,1fr) 1.45fr;border:1px solid var(--line);border-radius:20px;background:linear-gradient(110deg,var(--panel),transparent);overflow:hidden;margin-bottom:28px}.intel-card{min-height:86px;padding:18px 20px;display:flex;align-items:center;gap:12px;border-right:1px solid var(--line);position:relative}.intel-card:last-child{border:0}.intel-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--raised);color:var(--muted);font-weight:900}.live-icon{color:var(--accent);animation:livePulse 1.8s infinite}.intel-card b{display:block;font-size:22px;letter-spacing:-1px}.intel-card span{display:block;color:var(--muted);font-size:10px;margin-top:2px}.intel-card i{position:absolute;width:4px;height:4px;background:var(--accent);border-radius:50%;right:18px;opacity:.55}.intel-card.total{justify-content:space-between;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 6%,transparent),transparent)}.total small{display:block;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:.35px;margin-bottom:7px}.total b{font-size:25px}.total b span{display:inline;font-size:11px;color:var(--muted);font-weight:600;margin-left:3px}.mini-bars{height:34px;display:flex;align-items:end;gap:4px}.mini-bars i{position:static;width:5px;background:var(--accent);opacity:.8;border-radius:3px}.mini-bars i:nth-child(1){height:11px}.mini-bars i:nth-child(2){height:22px}.mini-bars i:nth-child(3){height:16px}.mini-bars i:nth-child(4){height:30px}.mini-bars i:nth-child(5){height:24px}
    .control-bar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:8px 0 20px}.tabs{display:flex;gap:6px;overflow:auto}.tabs button{border:1px solid transparent;background:transparent;color:var(--muted);padding:9px 12px;border-radius:10px;font-size:10px;font-weight:800;white-space:nowrap;cursor:pointer;transition:.2s}.tabs button span{margin-left:5px;opacity:.65}.tabs button:hover{color:var(--ink);background:color-mix(in srgb,var(--cp-text) 4%,transparent)}.tabs button.active{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 20%,transparent);background:color-mix(in srgb,var(--accent) 7%,transparent)}.search-box{width:260px;height:42px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--muted)}.search-box input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font:inherit;font-size:11px}.search-box input::placeholder{color:var(--muted)}.search-box button{border:0;background:none;color:var(--muted);cursor:pointer;font-size:16px}
    .list-header{display:flex;justify-content:space-between;margin:0 2px 13px}.list-header span{font-size:9px;letter-spacing:.35px;font-weight:900;color:var(--muted)}.list-header small{font-size:9px;color:var(--muted);opacity:.65}
    .match-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.match-card{position:relative;padding:22px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(145deg,var(--panel),var(--raised));overflow:hidden;animation:enter .55s both;animation-delay:var(--delay);transition:transform .28s,border-color .28s,box-shadow .28s}.match-card:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 100% 0,color-mix(in srgb,var(--accent) 8%,transparent),transparent 34%);pointer-events:none}.match-card:hover{transform:translateY(-5px);border-color:rgba(184,244,92,.28);box-shadow:0 24px 50px rgba(0,0,0,.18)}.match-card.live-card{border-color:color-mix(in srgb,var(--accent) 25%,transparent)}.card-no{position:absolute;right:18px;top:15px;color:var(--ink);opacity:.045;font-size:52px;font-weight:900;letter-spacing:-5px}.card-top{position:relative;display:flex;justify-content:space-between;align-items:center}.status{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font-size:9px;font-weight:900;letter-spacing:.25px;color:var(--muted);background:color-mix(in srgb,var(--cp-text) 3%,transparent)}.status i{width:6px;height:6px;border-radius:50%;background:var(--muted)}.status[data-status="LIVE"]{color:var(--accent);border-color:rgba(184,244,92,.24);background:color-mix(in srgb,var(--accent) 7%,transparent)}.status[data-status="LIVE"] i{background:var(--accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 9%,transparent);animation:livePulse 1.6s infinite}.status[data-status="COMPLETED"] i{background:#68d5a0}.status[data-status="SCHEDULED"] i{background:#72bfff}.more{border:0;background:transparent;color:var(--muted);letter-spacing:2px;cursor:pointer}.match-title{position:relative;padding:21px 0 18px}.format{font-size:8px;letter-spacing:1.8px;font-weight:900;color:var(--accent)}.match-title h2{margin:7px 0 7px;font-size:19px;line-height:1.15;letter-spacing:-.7px}.match-title p{margin:0;color:var(--muted);font-size:10px}
    .versus-zone{position:relative;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.club{min-width:0;display:grid;justify-items:start;gap:5px}.club.away{justify-items:end;text-align:right}.crest{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 20%,transparent),rgba(184,244,92,.04));border:1px solid color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);font-size:9px;font-weight:900}.crest.alt{background:linear-gradient(145deg,rgba(98,181,255,.18),rgba(98,181,255,.03));border-color:rgba(98,181,255,.16);color:#86c8ff}.club strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.club small{font-size:8px;letter-spacing:.35px;color:var(--muted)}.vs{position:relative;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.025);border:1px solid var(--line);font-size:9px;font-weight:900;color:var(--muted)}.vs i{position:absolute;width:1px;height:18px;background:var(--line);bottom:-28px}
    .card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:16px}.match-meta{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:9px}.pulse-meta{color:var(--accent)}.card-footer a{color:var(--ink);text-decoration:none;font-size:10px;font-weight:900;transition:.2s}.card-footer a b{color:var(--accent);font-size:15px;margin-left:4px}.card-footer a:hover{color:var(--accent)}
    .state-card{padding:74px 24px;text-align:center;border:1px dashed var(--line);border-radius:24px;background:var(--panel)}.empty-orbit{width:62px;height:62px;margin:0 auto 20px;border:1px solid color-mix(in srgb,var(--accent) 18%,transparent);border-radius:50%;display:grid;place-items:center;color:var(--accent);box-shadow:0 0 40px color-mix(in srgb,var(--accent) 8%,transparent)}.state-card .eyebrow{justify-content:center}.state-card h2{margin:13px 0 8px;font-size:24px;letter-spacing:-1px}.state-card p{margin:0 auto 22px;max-width:420px;color:var(--muted);font-size:12px;line-height:1.6}.state-card a,.state-card button{display:inline-flex;padding:12px 16px;border:0;border-radius:10px;background:var(--accent);color:#102019;text-decoration:none;font-size:11px;font-weight:900;cursor:pointer}.error-state .state-icon{width:48px;height:48px;margin:auto auto 16px;border-radius:14px;display:grid;place-items:center;background:rgba(255,94,94,.1);color:#ff8787;font-size:20px;font-weight:900}.loading-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.skeleton-card{height:330px;border:1px solid var(--line);border-radius:22px;padding:22px;background:linear-gradient(90deg,color-mix(in srgb,var(--cp-text) 3%,transparent),color-mix(in srgb,var(--cp-text) 7%,transparent),color-mix(in srgb,var(--cp-text) 3%,transparent));background-size:200% 100%;animation:shimmer 1.3s infinite}.skeleton-card i{display:block;height:14px;width:40%;border-radius:8px;background:color-mix(in srgb,var(--cp-text) 6%,transparent);margin-bottom:25px}.skeleton-card i:nth-child(2){height:90px;width:100%;margin-top:35px}.skeleton-card i:nth-child(3){width:70%;margin-top:30px}
    @keyframes enter{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes livePulse{50%{opacity:.42}}@keyframes shimmer{to{background-position:-200% 0}}
    @media(max-width:950px){.intel-strip{grid-template-columns:repeat(2,1fr)}.intel-card:nth-child(2){border-right:0}.intel-card.total{border-top:1px solid var(--line)}}
    @media(max-width:720px){.matches-page{padding:32px 18px 80px}.hero{align-items:flex-start;flex-direction:column}.hero h1{letter-spacing:-3.5px}.hero-actions{width:100%}.create-btn{flex:1;justify-content:center}.intel-strip{grid-template-columns:1fr 1fr;border-radius:16px}.intel-card{min-height:78px;padding:14px;border-right:1px solid var(--line)}.intel-card:nth-child(2){border-right:0}.intel-card:nth-child(3){border-top:1px solid var(--line)}.intel-card.total{border-top:1px solid var(--line);border-right:0}.control-bar{align-items:stretch;flex-direction:column}.tabs{padding-bottom:2px}.search-box{width:auto}.match-grid,.loading-grid{grid-template-columns:1fr}.match-card{padding:18px}.match-title h2{font-size:21px}}
    @media (prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
  `]
})
export class MatchesComponent {
  private readonly http = inject(HttpClient);

  matches: Match[] = [];
  activeFilter: Filter = 'ALL';
  query = '';
  loading = true;
  error = false;

  readonly filterOptions: { label: string; value: Filter }[] = [
    { label: 'All matches', value: 'ALL' },
    { label: 'Upcoming', value: 'SCHEDULED' },
    { label: 'Live now', value: 'LIVE' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  constructor() { this.load(); }

  get liveCount(): number { return this.matches.filter(m => this.normalizeStatus(m.status) === 'LIVE').length; }
  get scheduledCount(): number { return this.matches.filter(m => this.normalizeStatus(m.status) === 'SCHEDULED').length; }
  get completedCount(): number { return this.matches.filter(m => this.normalizeStatus(m.status) === 'COMPLETED').length; }

  get filteredMatches(): Match[] {
    const q = this.query.trim().toLowerCase();
    return this.matches.filter(match => {
      const matchesFilter = this.activeFilter === 'ALL' || this.normalizeStatus(match.status) === this.activeFilter;
      const haystack = [match.name, match.teamAName, match.teamBName, match.format, match.status].filter(Boolean).join(' ').toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.http.get<Match[]>('http://localhost:8080/api/matches').subscribe({
      next: matches => { this.matches = matches ?? []; this.loading = false; },
      error: () => { this.matches = []; this.loading = false; this.error = true; }
    });
  }

  setFilter(filter: Filter): void { this.activeFilter = filter; }
  onSearch(event: Event): void { this.query = (event.target as HTMLInputElement).value; }

  countFor(filter: Filter): number {
    if (filter === 'ALL') return this.matches.length;
    return this.matches.filter(m => this.normalizeStatus(m.status) === filter).length;
  }

  normalizeStatus(status?: string): string {
    const value = (status || 'SCHEDULED').trim().toUpperCase();
    if (['UPCOMING', 'CREATED', 'READY'].includes(value)) return 'SCHEDULED';
    if (['FINISHED', 'RESULT'].includes(value)) return 'COMPLETED';
    return value;
  }

  statusLabel(status?: string): string {
    const value = this.normalizeStatus(status);
    return value === 'SCHEDULED' ? 'UPCOMING' : value;
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'TM';
  }

  timeHint(match: Match): string {
    if (!match.scheduledAt) return 'Time pending';
    const date = new Date(match.scheduledAt);
    if (Number.isNaN(date.getTime())) return 'Schedule set';
    if (this.normalizeStatus(match.status) === 'LIVE') return 'In progress';
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  displayDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }
}
