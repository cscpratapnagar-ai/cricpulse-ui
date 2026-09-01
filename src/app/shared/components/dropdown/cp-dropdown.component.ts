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
  templateUrl: './cp-dropdown.component.html',
  styleUrl: './cp-dropdown.component.scss']
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