import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

export interface SelectOption { value: string; label: string; }

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [NgIf],
  templateUrl: './select-field.component.html',
  styleUrl: './select-field.component.scss' ]
})
export class SelectFieldComponent {
  @Input() label = ''; @Input() name = ''; @Input() placeholder = 'Select'; @Input() options: SelectOption[] = []; @Input() value = ''; @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  open = false; openUp = false;
  constructor(private host: ElementRef<HTMLElement>) {}
  get selectedOption(): SelectOption | undefined { return this.options.find(option => option.value === this.value); }
  toggle(): void { if(this.disabled)return; this.open = !this.open; if(this.open) setTimeout(() => this.updatePlacement()); }
  private updatePlacement(): void { const trigger=this.host.nativeElement.querySelector('.select-trigger'); if(!trigger)return; const box=trigger.getBoundingClientRect(); const spaceBelow=window.innerHeight-box.bottom; const spaceAbove=box.top; const requiredSpace=190; this.openUp=spaceBelow<requiredSpace && spaceAbove>spaceBelow+80; }
  select(option: SelectOption): void { if(this.disabled)return; this.value = option.value; this.valueChange.emit(this.value); this.open = false; }
  @HostListener('document:click', ['$event']) close(event: Event): void { if(this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false; }
  @HostListener('window:resize') onResize(): void { if(this.open)this.updatePlacement(); }
  @HostListener('window:scroll') onScroll(): void { if(this.open)this.updatePlacement(); }
}
