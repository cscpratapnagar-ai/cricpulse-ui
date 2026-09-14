import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface SelectOption { value: string; label: string; }

@Component({
  selector: 'app-select-field',
  standalone: true,
  template: `<label class="field"><span>{{label}}</span><div class="select-wrap"><button type="button" class="select-trigger" [disabled]="disabled" [class.disabled]="disabled" [class.open]="open" (click)="toggle()"><span [class.muted]="!selectedOption">{{selectedOption?.label || placeholder}}</span><b>v</b></button>@if(open && !disabled){<div class="options" [class.up]="openUp" role="listbox"><button type="button" class="option placeholder-option" [class.active]="!value" (click)="select({value:'',label:placeholder})">{{placeholder}}</button>@for(option of options; track option.value){<button type="button" class="option" [class.active]="option.value===value" (click)="select(option)">{{option.label}}</button>}</div>}</div></label>`,
  styles: [`:host{display:block}.field{display:grid;gap:8px;color:#b9ccc2;font-size:12px;font-weight:750}.select-wrap{position:relative}.select-trigger{display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;width:100%;height:50px;padding:0 15px;border:1px solid #ffffff1c;border-radius:11px;background:linear-gradient(135deg,#ffffff0c,#ffffff05);color:#f3fbf6;outline:none;font:inherit;text-align:left;cursor:pointer;transition:border-color .2s,box-shadow .2s}.select-trigger:hover:not(:disabled),.select-trigger.open{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}.select-trigger b{color:#b8f45c;font-size:12px;transition:transform .2s}.select-trigger.open b{transform:rotate(180deg)}.select-trigger.disabled{opacity:.5;cursor:not-allowed}.muted{color:#789386}.options{position:absolute;z-index:60;top:58px;left:0;width:100%;box-sizing:border-box;max-height:235px;overflow-y:auto;padding:6px;border:1px solid #ffffff25;border-radius:13px;background:#10251ef7;box-shadow:0 24px 60px #000b;backdrop-filter:blur(18px)}.options.up{top:auto;bottom:58px}.option{display:block;width:100%;padding:11px 12px;border:0;border-radius:8px;background:transparent;color:#dcece2;font:inherit;text-align:left;cursor:pointer}.option:hover,.option.active{background:#b8f45c;color:#10251e;font-weight:850}.placeholder-option{color:#789386;border-bottom:1px solid #ffffff12;border-radius:5px}@media(max-width:650px){.options{max-height:200px}}`]
})
export class SelectFieldComponent {
  @Input() label = ''; @Input() name = ''; @Input() placeholder = 'Select'; @Input() options: SelectOption[] = []; @Input() value = ''; @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  open = false; openUp = false;
  constructor(private host: ElementRef<HTMLElement>) {}
  get selectedOption(): SelectOption | undefined { return this.options.find(option => option.value === this.value); }
  toggle(): void { if(this.disabled)return; this.open = !this.open; if(this.open) setTimeout(() => this.updatePlacement()); }
  private updatePlacement(): void { const trigger=this.host.nativeElement.querySelector('.select-trigger'); if(!trigger)return; const box=trigger.getBoundingClientRect(); const spaceBelow=window.innerHeight-box.bottom; const spaceAbove=box.top; this.openUp=spaceBelow < 250 && spaceAbove > spaceBelow; }
  select(option: SelectOption): void { if(this.disabled)return; this.value = option.value; this.valueChange.emit(this.value); this.open = false; }
  @HostListener('document:click', ['$event']) close(event: Event): void { if(this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false; }
  @HostListener('window:resize') onResize(): void { if(this.open)this.updatePlacement(); }
  @HostListener('window:scroll') onScroll(): void { if(this.open)this.updatePlacement(); }
}
