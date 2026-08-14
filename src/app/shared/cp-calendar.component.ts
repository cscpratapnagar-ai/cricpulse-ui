import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cp-calendar',
  standalone: true,
  template: `
    <div class="field">
      @if (label) { <label [for]="id">{{ label }} @if (required) { <span>*</span> }</label> }
      <div class="calendar-shell">
        <input [id]="id" [name]="name || id" type="date" [value]="value || ''" [min]="min || null" [max]="max || null" [disabled]="disabled" [required]="required" (change)="onChange($event)" />
        <span class="calendar-icon" aria-hidden="true">▣</span>
      </div>
      @if (hint) { <small>{{ hint }}</small> }
    </div>
  `,
  styles: [`
    :host{display:block}.field{display:grid;gap:8px}.field label{color:#b9ccc2;font-size:12px;font-weight:750}.field label span{color:#b8f45c}.calendar-shell{position:relative}.calendar-shell input{appearance:none;box-sizing:border-box;width:100%;min-height:46px;padding:12px 44px 12px 13px;border:1px solid #ffffff1c;border-radius:10px;background:#142c22;color:#fff;font:inherit;outline:none;color-scheme:dark}.calendar-shell input:focus{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}.calendar-shell input::-webkit-calendar-picker-indicator{opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer}.calendar-icon{pointer-events:none;position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#b8f45c;font-size:15px}.field small{color:#789386;font-size:10px}
  `]
})
export class CpCalendarComponent {
  @Input() id = `cp-calendar-${Math.random().toString(36).slice(2, 8)}`;
  @Input() name = '';
  @Input() label = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() min = '';
  @Input() max = '';
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
