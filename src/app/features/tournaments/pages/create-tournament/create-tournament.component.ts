import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DateTimeFieldComponent } from '../../../../ui/date-time-field.component';
import { CpDropdownComponent, CpDropdownOption } from '../../../../shared/cp-dropdown.component';

interface TournamentResponse { id:string; name:string; format:string; overs:number; location:string|null; startDate:string|null; status:string; }

type Step = 1|2|3;

@Component({
  selector:'app-create-tournament',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,DateTimeFieldComponent,CpDropdownComponent],
  templateUrl: './create-tournament.component.html',
styleUrl: './create-tournament.component.scss']
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