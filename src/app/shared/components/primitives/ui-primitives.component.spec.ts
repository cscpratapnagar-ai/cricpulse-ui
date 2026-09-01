import { EmptyStateComponent, StatCardComponent } from './ui-primitives.component';

describe('UI primitives', () => {
  it('should expose the stat card component', () => expect(StatCardComponent).toBeTruthy());

  it('should expose the empty state component', () => expect(EmptyStateComponent).toBeTruthy());
});
