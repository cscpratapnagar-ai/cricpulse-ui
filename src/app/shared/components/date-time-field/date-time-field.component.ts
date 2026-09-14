import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
interface CalendarDay {
  date: Date;
  number: number;
  currentMonth: boolean;
  selected: boolean;
  today: boolean;
}
@Component({
  selector: 'app-date-time-field',
  standalone: true,
  templateUrl: './date-time-field.component.html',
  styleUrl: './date-time-field.component.scss',
})
export class DateTimeFieldComponent implements OnChanges {
  @Input() label = '';
  @Input() name = '';
  @Input() value = '';
  @Input() includeTime = true;
  @Output() valueChange = new EventEmitter<string>();
  open = false;
  openUp = false;
  alignRight = false;
  viewDate = new Date();
  selectedDate: Date | null = null;
  hour = '12';
  minute = '00';
  period = 'PM';
  weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  minutes = ['00', '15', '30', '45'];
  constructor(private host: ElementRef<HTMLElement>) {
    this.syncFromValue();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange) this.syncFromValue();
  }
  get monthLabel() {
    return this.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  get displayValue() {
    if (!this.selectedDate) return this.includeTime ? 'Select date and time' : 'Select date';
    const date = this.selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return this.includeTime ? `${date} - ${this.hour}:${this.minute} ${this.period}` : date;
  }
  get calendarDays(): CalendarDay[] {
    const first = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const today = new Date();
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        date: d,
        number: d.getDate(),
        currentMonth: d.getMonth() === this.viewDate.getMonth(),
        selected: !!this.selectedDate && d.toDateString() === this.selectedDate.toDateString(),
        today: d.toDateString() === today.toDateString(),
      };
    });
  }
  toggle() {
    this.open = !this.open;
    if (this.open) {
      if (this.selectedDate)
        this.viewDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
      else {
        const now = new Date();
        this.viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      setTimeout(() => this.updatePlacement());
    }
  }
  private updatePlacement() {
    const trigger = this.host.nativeElement.querySelector('.trigger');
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const pickerWidth = Math.min(300, window.innerWidth - 24);
    const pickerHeight = this.includeTime ? 390 : 330;
    const below = window.innerHeight - box.bottom;
    const above = box.top;
    this.openUp = below < pickerHeight && above > below;
    this.alignRight = box.left + pickerWidth > window.innerWidth - 12;
  }
  previousMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
  }
  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
  }
  selectDay(day: CalendarDay) {
    this.selectedDate = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate());
    this.viewDate = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
    this.emitValue();
    if (!this.includeTime) this.open = false;
  }
  today() {
    const now = new Date();
    this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.emitValue();
    if (!this.includeTime) this.open = false;
  }
  clear() {
    this.selectedDate = null;
    this.value = '';
    this.valueChange.emit('');
    this.open = false;
  }
  emitValue() {
    if (!this.selectedDate) return;
    const d = new Date(this.selectedDate);
    if (this.includeTime) {
      const h = (Number(this.hour) % 12) + (this.period === 'PM' ? 12 : 0);
      d.setHours(h, Number(this.minute), 0, 0);
    } else d.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.value = this.includeTime
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    this.valueChange.emit(this.value);
  }
  private syncFromValue() {
    if (!this.value) {
      this.selectedDate = null;
      return;
    }
    const raw = this.value.trim();
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, day] = raw.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      this.selectedDate = null;
      return;
    }
    this.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    this.viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
    const h = d.getHours();
    this.period = h >= 12 ? 'PM' : 'AM';
    this.hour = String(h % 12 || 12);
    this.minute = String(Math.floor(d.getMinutes() / 15) * 15).padStart(2, '0');
  }
  @HostListener('document:click', ['$event']) close(event: Event) {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }
  @HostListener('window:resize') onResize() {
    if (this.open) this.updatePlacement();
  }
  @HostListener('window:scroll') onScroll() {
    if (this.open) this.updatePlacement();
  }
}
