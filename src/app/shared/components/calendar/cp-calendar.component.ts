import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cp-calendar',
  standalone: true,
  templateUrl: './cp-calendar.component.html',
  styleUrl: './cp-calendar.component.scss']
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
