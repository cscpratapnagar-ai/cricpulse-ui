import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  it('should declare all supported analytics metrics', () => {
    const labels = ['Runs', 'Wickets', 'Average', 'Strike rate'];
    expect(labels).toEqual(['Runs', 'Wickets', 'Average', 'Strike rate']);
  });

  it('should expose the analytics component selector', () => {
    expect(AnalyticsComponent.ɵcmp.selectors).toContainEqual([['app-analytics']]);
  });
});
