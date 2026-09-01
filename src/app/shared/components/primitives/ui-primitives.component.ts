import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
@Component({
  selector: 'cp-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-primitives.component.html',
  styleUrl: './ui-primitives.component.scss',
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() detail = '';
  @Input() icon = '✦';
}
@Component({
  selector: 'cp-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="cp-empty">
    <div>{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <ng-content />
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .cp-empty {
        padding: 48px 24px;
        border: 1px dashed var(--cp-border-strong);
        border-radius: 22px;
        background: var(--cp-surface);
        text-align: center;
      }
      .cp-empty > div {
        display: grid;
        place-items: center;
        width: 58px;
        height: 58px;
        margin: auto;
        border-radius: 18px;
        background: var(--cp-accent-soft);
        font-size: 24px;
      }
      .cp-empty h3 {
        margin: 16px 0 7px;
      }
      .cp-empty p {
        max-width: 430px;
        margin: auto;
        color: var(--cp-text-muted);
        font-size: 13px;
        line-height: 1.6;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = '◌';
  @Input() title = 'Nothing here yet';
  @Input() description = 'Create your first item to start building your cricket workspace.';
}
