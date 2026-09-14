import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface CpDropdownOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  hint?: string;
}

@Component({
  selector: 'cp-dropdown',
  standalone: true,
  template: `
    <div class="field" [class.disabled]="disabled">
      @if (label) { <label [for]="id">{{ label }} @if (required) { <span>*</span> }</label> }
      <div class="control">
        <select [id]="id" [name]="name || id" [disabled]="disabled" [required]="required" [value]="stringValue" (change)="onChange($event)">
          @if (placeholder) { <option value="" disabled [selected]="!hasValue">{{ placeholder }}</option> }
          @for (option of options; track option.value) {
            <option [value]="serialize(option.value)" [disabled]="option.disabled">{{ option.label }}{{ option.hint ? ' · ' + option.hint : '' }}</option>
          }
        </select>
        <span class="chevron">⌄</span>
      </div>
      @if (hint) { <small>{{ hint }}</small> }
    </div>
  `,
  styles: [`
    :host{display:block}.field{display:grid;gap:8px}.field label{color:#b9ccc2;font-size:12px;font-weight:750}.field label span{color:#b8f45c}.control{position:relative}.control select{appearance:none;box-sizing:border-box;width:100%;min-height:46px;padding:12px 42px 12px 13px;border:1px solid #ffffff1c;border-radius:10px;background:#142c22;color:#fff;font:inherit;outline:none;cursor:pointer}.control select:focus{border-color:#b8f45c;box-shadow:0 0 0 3px #b8f45c18}.control select option{background:#10251e;color:#fff}.chevron{pointer-events:none;position:absolute;right:14px;top:50%;transform:translateY(-56%);color:#b8f45c;font-size:19px;font-weight:800}.field small{color:#789386;font-size:10px}.disabled{opacity:.55}.disabled select{cursor:not-allowed}
  `]
})
export class CpDropdownComponent<T = string> {
  @Input() id = `cp-dropdown-${Math.random().toString(36).slice(2, 8)}`;
  @Input() name = '';
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() options: CpDropdownOption<T>[] = [];
  @Input() value: T | null = null;
  @Output() valueChange = new EventEmitter<T | null>();

  get hasValue(): boolean { return this.value !== null && this.value !== undefined && String(this.value) !== ''; }
  get stringValue(): string { return this.hasValue ? String(this.value) : ''; }

  serialize(value: T): string { return String(value); }

  onChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const option = this.options.find(item => String(item.value) === raw);
    this.valueChange.emit(option ? option.value : null);
  }
}
