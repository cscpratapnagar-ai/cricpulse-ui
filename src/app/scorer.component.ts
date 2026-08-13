import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-scorer',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card">
      <h2>Scorer</h2>
      <input [(ngModel)]="inningsId" placeholder="Innings UUID" />
      <input [(ngModel)]="strikerId" placeholder="Striker UUID" />
      <input [(ngModel)]="nonStrikerId" placeholder="Non-striker UUID" />
      <input [(ngModel)]="bowlerId" placeholder="Bowler UUID" />
      <div class="buttons">
        @for (run of runs; track run) {
          <button (click)="record(run)">{{ run }}</button>
        }
      </div>
      <div class="buttons">
        <button (click)="recordExtra('WIDE')">Wide</button>
        <button (click)="recordExtra('NO_BALL')">No-ball</button>
        <button (click)="recordExtra('BYE')">Bye</button>
        <button (click)="recordExtra('LEG_BYE')">Leg-bye</button>
        <button class="danger" (click)="recordWicket()">Wicket</button>
        <button (click)="undo()">Undo</button>
      </div>
      @if (message) { <p>{{ message }}</p> }
    </section>
  `,
  styles: [`
    .card { border:1px solid #ffffff18; border-radius:22px; padding:25px; background:linear-gradient(145deg,#10251eaa,#0b1b16dd); box-shadow:0 20px 55px #00000030; backdrop-filter:blur(18px); animation:rise .65s .2s ease-out both; }
    h2 { margin-top:0; font-size:22px; } input { display:block; width:100%; box-sizing:border-box; margin:9px 0; padding:13px; color:white; background:#ffffff0b; border:1px solid #ffffff18; border-radius:10px; outline:none; } input:focus { border-color:#b8f45c; }
    .buttons { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; } button { border:0; border-radius:10px; padding:11px 15px; background:#b8f45c; color:#10251e; font-weight:800; cursor:pointer; transition:transform .2s,box-shadow .2s; } button:hover { transform:translateY(-2px); box-shadow:0 8px 18px #b8f45c30; } .danger { background:#ff766d; } @keyframes rise { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
  `]
})
export class ScorerComponent {
  private readonly http = inject(HttpClient);
  inningsId = '';
  strikerId = '';
  nonStrikerId = '';
  bowlerId = '';
  overNumber = 0;
  ballNumber = 1;
  legalBallsInOver = 0;
  message = '';
  readonly runs = [0, 1, 2, 3, 4, 6];

  record(batRuns: number): void {
    this.submit(batRuns, 0, null, null, null, true);
  }

  recordExtra(extraType: string): void {
    this.submit(0, 1, extraType, null, null, extraType !== 'WIDE' && extraType !== 'NO_BALL');
  }

  recordWicket(): void {
    this.submit(0, 0, null, 'BOWLED', this.strikerId, true);
  }

  private submit(batRuns: number, extraRuns: number, extraType: string | null,
                 wicketType: string | null, dismissedPlayerId: string | null, legalBall: boolean): void {
    const payload = {
      inningsId: this.inningsId,
      overNumber: this.overNumber,
      ballNumber: this.ballNumber,
      strikerId: this.strikerId,
      nonStrikerId: this.nonStrikerId,
      bowlerId: this.bowlerId,
      batRuns, extraRuns, extraType, wicketType, dismissedPlayerId
    };
    this.http.post('http://localhost:8080/api/scoring/innings/' + this.inningsId + '/deliveries', payload)
      .subscribe({
        next: () => {
          this.message = 'Delivery recorded';
          this.advanceDelivery(legalBall);
        },
        error: () => this.message = 'Delivery could not be recorded'
      });
  }

  undo(): void {
    this.http.post(`http://localhost:8080/api/scoring/innings/${this.inningsId}/undo`, {})
      .subscribe({ next: () => this.message = 'Last delivery undone', error: () => this.message = 'Nothing to undo' });
  }

  private advanceDelivery(legalBall: boolean): void {
    this.ballNumber++;
    if (legalBall) this.legalBallsInOver++;
    if (this.legalBallsInOver === 6) {
      this.ballNumber = 1;
      this.overNumber++;
      this.legalBallsInOver = 0;
    }
  }
}
