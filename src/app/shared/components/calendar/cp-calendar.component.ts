import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

interface CalendarDay {
  date: Date;
  iso: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
  today: boolean;
  selected: boolean;
}

@Component({
  selector: 'cp-calendar',
  standalone: true,
  templateUrl: './cp-calendar.component.html',
  styleUrl: './cp-calendar.component.scss',
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

  isOpen = false;
  popoverTop = 0;
  popoverLeft = 0;
  visibleMonth = this.startOfMonth(this.parseDate(this.value) ?? new Date());
  readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  get monthLabel(): string {
    return new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
    }).format(this.visibleMonth);
  }

  get displayValue(): string {
    const date = this.parseDate(this.value);
    if (!date) return '';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  get days(): CalendarDay[] {
    const first = this.startOfMonth(this.visibleMonth);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const today = this.toIso(new Date());
    const selected = this.value ?? '';

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = this.toIso(date);
      return {
        date,
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === this.visibleMonth.getMonth(),
        disabled: (!!this.min && iso < this.min) || (!!this.max && iso > this.max),
        today: iso === today,
        selected: iso === selected,
      };
    });
  }

  toggleCalendar(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.visibleMonth = this.startOfMonth(
        this.parseDate(this.value) ?? new Date(),
      );
      requestAnimationFrame(() => this.positionPopover());
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  repositionPopover(): void {
    if (this.isOpen) {
      requestAnimationFrame(() => this.positionPopover());
    }
  }

  private positionPopover(): void {
    const trigger = this.elementRef.nativeElement.querySelector(
      '.calendar-trigger',
    );
    const popover = this.elementRef.nativeElement.querySelector(
      '.calendar-popover',
    );
    if (!trigger || !popover) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 7;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const openBelow =
      spaceBelow >= popoverRect.height + gap || spaceBelow >= spaceAbove;
    const availableHeight = Math.max(
      180,
      (openBelow ? spaceBelow : spaceAbove) - gap,
    );
    const top = openBelow
      ? triggerRect.bottom + gap
      : Math.max(
          viewportPadding,
          triggerRect.top - Math.min(popoverRect.height, availableHeight) - gap,
        );
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      window.innerWidth - popoverRect.width - viewportPadding,
    );

    this.popoverTop = top;
    this.popoverLeft = left;
  }

  previousMonth(): void {
    this.visibleMonth = new Date(
      this.visibleMonth.getFullYear(),
      this.visibleMonth.getMonth() - 1,
      1,
    );
  }

  nextMonth(): void {
    this.visibleMonth = new Date(
      this.visibleMonth.getFullYear(),
      this.visibleMonth.getMonth() + 1,
      1,
    );
  }

  selectDay(day: CalendarDay): void {
    if (day.disabled) return;
    this.valueChange.emit(day.iso);
    this.isOpen = false;
  }

  selectToday(): void {
    const today = this.toIso(new Date());
    if ((!this.min || today >= this.min) && (!this.max || today <= this.max)) {
      this.valueChange.emit(today);
      this.visibleMonth = this.startOfMonth(new Date());
      this.isOpen = false;
    }
  }

  clearDate(): void {
    this.valueChange.emit('');
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (
      this.isOpen &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.isOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.isOpen = false;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
