import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

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
      @if (label) { <label>{{ label }} @if (required) { <span>*</span> }</label> }
      <div class="dropdown">
        <button type="button" class="trigger" [class.open]="open" [disabled]="disabled"
          [attr.aria-expanded]="open" aria-haspopup="listbox" (click)="toggle()">
          <span>{{ selectedLabel }}</span><i aria-hidden="true">⌄</i>
        </button>
        @if (open) {
          <div class="menu" role="listbox">
            @for (option of options; track option.value) {
              <button type="button" role="option" [disabled]="option.disabled"
                [class.selected]="isSelected(option)" [attr.aria-selected]="isSelected(option)"
                (click)="select(option)">
                <span>{{ option.label }}@if (option.hint) { <small> · {{ option.hint }}</small> }</span>
                @if (isSelected(option)) { <b>✓</b> }
              </button>
            }
          </div>
        }
      </div>
      @if (hint) { <small class="hint">{{ hint }}</small> }
    </div>
  `,
  styles: [`
    :host{display:block}.field{display:grid;gap:8px}.field label{color:var(--cp-text-muted);font-size:8px;font-weight:850;letter-spacing:.7px;text-transform:uppercase}.field label span{color:var(--cp-accent)}
    .dropdown{position:relative}.trigger,.menu button{font:750 10px inherit}.trigger{display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%;min-height:43px;padding:0 12px;border:1px solid var(--cp-border);border-radius:10px;background:var(--cp-surface);color:var(--cp-text);text-align:left;cursor:pointer;transition:border-color .18s,box-shadow .18s,background .18s}
    .trigger:hover,.trigger.open{border-color:color-mix(in srgb,var(--cp-accent) 55%,var(--cp-border));box-shadow:0 0 0 3px var(--cp-accent-soft)}.trigger i{font-style:normal;color:var(--cp-muted,var(--cp-text-muted));font-size:14px;font-weight:850;transition:transform .18s,color .18s}.trigger.open i{transform:rotate(180deg);color:var(--cp-accent)}
    .menu{position:absolute;top:calc(100% + 6px);right:0;left:0;z-index:100;display:grid;min-width:170px;padding:5px;border:1px solid color-mix(in srgb,var(--cp-accent) 24%,var(--cp-border));border-radius:11px;background:var(--cp-surface);box-shadow:0 18px 42px color-mix(in srgb,#000 28%,transparent);animation:cp-dropdown-in .16s ease both}
    .menu button{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;padding:10px 11px;border:0;border-radius:7px;background:transparent;color:var(--cp-text);text-align:left;cursor:pointer;transition:background .14s,color .14s}.menu button:hover,.menu button.selected{background:var(--cp-accent-soft);color:var(--cp-accent)}.menu button:disabled{opacity:.45;cursor:not-allowed}.menu button b{font-size:10px;color:var(--cp-accent)}.menu button small{font-size:8px;opacity:.75}.hint{color:var(--cp-text-muted);font-size:8px}.disabled{opacity:.55}.disabled .trigger{cursor:not-allowed}
    @keyframes cp-dropdown-in{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.trigger,.trigger i,.menu,.menu button{animation:none!important;transition:none!important}}
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
  open = false;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  get hasValue(): boolean { return this.value !== null && this.value !== undefined && String(this.value) !== ''; }
  get selectedLabel(): string {
    const selected = this.options.find(option => this.isSelected(option));
    return selected?.label || this.placeholder;
  }

  toggle(): void { if (!this.disabled) this.open = !this.open; }
  select(option: CpDropdownOption<T>): void {
    if (option.disabled) return;
    this.valueChange.emit(option.value);
    this.open = false;
  }
  isSelected(option: CpDropdownOption<T>): boolean {
    return this.hasValue && String(option.value) === String(this.value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.open = false; }
}