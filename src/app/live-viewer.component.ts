import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of, startWith } from 'rxjs';
import { LiveScore, LiveScoreService } from './live-score.service';

@Component({
  selector: 'app-live-viewer', standalone: true, imports: [FormsModule, AsyncPipe],
  template: `
    <section class="card"><div class="card-top"><div><span class="live-pill"><i></i> LIVE</span><h2>Live score</h2></div><span class="sport-icon">✦</span></div>
      <div class="connect-row"><input [(ngModel)]="inningsId" placeholder="Paste innings UUID" /><button (click)="connect()">Connect</button></div>
      @if (score$ | async; as score) { @if (score) { <div class="score">{{ score.runs }}<small>/{{ score.wickets }}</small></div><div class="meta"><span>{{ overs(score.legalBalls) }} OVERS</span><span>INNINGS {{ score.inningsNumber }}</span><span class="synced">● SYNCED</span></div> } @else { <p class="waiting">Waiting for the first score update...</p> } }
    </section>
  `,
  styles: [`
    .card { border:1px solid #ffffff18; border-radius:22px; padding:25px; background:linear-gradient(145deg,#10251eaa,#0b1b16dd); box-shadow:0 20px 55px #00000030; backdrop-filter:blur(18px); animation:rise .65s .1s ease-out both; }.card-top { display:flex; justify-content:space-between; align-items:start; } h2 { margin:12px 0 20px; font-size:22px; }.sport-icon { color:#b8f45c; font-size:30px; }.live-pill { color:#b8f45c; font-size:10px; letter-spacing:1.5px; font-weight:800; }.live-pill i { display:inline-block; width:6px; height:6px; background:#b8f45c; border-radius:50%; margin-right:6px; box-shadow:0 0 10px #b8f45c; }.connect-row { display:flex; gap:10px; margin:12px 0 30px; } input { flex:1; min-width:0; border:1px solid #ffffff18; border-radius:10px; padding:13px; color:white; background:#ffffff0b; outline:none; } input:focus { border-color:#b8f45c; box-shadow:0 0 0 3px #b8f45c18; } button { border:0; border-radius:10px; padding:0 18px; background:#b8f45c; color:#10251e; font-weight:800; cursor:pointer; transition:transform .2s,box-shadow .2s; } button:hover { transform:translateY(-2px); box-shadow:0 8px 18px #b8f45c30; }.score { font-size:86px; font-weight:850; letter-spacing:-6px; color:#f2fbe9; animation:scoreIn .4s ease-out; }.score small { font-size:34px; color:#91aa9d; letter-spacing:-2px; }.meta { display:flex; gap:18px; color:#91aa9d; font-size:10px; letter-spacing:1.2px; font-weight:800; }.synced { color:#b8f45c; }.waiting { color:#91aa9d; } @keyframes rise { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } } @keyframes scoreIn { from { opacity:.2; transform:scale(1.04); } to { opacity:1; transform:scale(1); } }
  `]
})
export class LiveViewerComponent { private readonly liveScore = inject(LiveScoreService); inningsId = ''; score$ = of<LiveScore | null>(null); connect(): void { if (!this.inningsId.trim()) return; this.score$ = this.liveScore.watch(this.inningsId.trim()).pipe(startWith(null), catchError(() => of(null))); } overs(legalBalls: number): string { return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`; } }
