import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [NgIf],
  templateUrl: './select-field.component.html',
  styleUrl: './select-field.component.scss',
})
export class SelectFieldComponent {
  @Input() label = '';
  @Input() name = '';
  @Input() placeholder = 'Select';
  @Input() options: SelectOption[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  open = false;
  openUp = false;
  menuTop = 0;
  menuLeft = 0;
  menuWidth = 0;
  constructor(private host: ElementRef<HTMLElement>) {}
  get selectedOption(): SelectOption | undefined {
    return this.options.find((option) => option.value === this.value);
  }
  toggle(): void {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) setTimeout(() => this.updatePlacement());
  }
  private updatePlacement(): void {
    const trigger = this.host.nativeElement.querySelector('.select-trigger');
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const optionCount = this.options.length + 1;
    const estimatedHeight = Math.min(235, 12 + optionCount * 46);
    const viewportPadding = 8;
    const gap = 8;
    const spaceBelow = window.innerHeight - box.bottom;
    const spaceAbove = box.top;
    this.openUp = spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow;
    this.menuWidth = box.width;
    this.menuLeft = Math.min(
      Math.max(viewportPadding, box.left),
      Math.max(viewportPadding, window.innerWidth - box.width - viewportPadding),
    );
    this.menuTop = this.openUp
      ? Math.max(viewportPadding, box.top - estimatedHeight - gap)
      : Math.min(
          window.innerHeight - estimatedHeight - viewportPadding,
          box.bottom + gap,
        );
  }
  select(option: SelectOption): void {
    if (this.disabled) return;
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.open = false;
  }
  @HostListener('document:click', ['$event']) close(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }
  @HostListener('window:resize') onResize(): void {
    if (this.open) this.updatePlacement();
  }
  @HostListener('window:scroll') onScroll(): void {
    if (this.open) this.updatePlacement();
  }
}
