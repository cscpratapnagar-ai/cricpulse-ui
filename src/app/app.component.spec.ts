import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('should declare the root application selector', () => {
    expect(AppComponent.ɵcmp.selectors).toContainEqual([['app-root']]);
  });
});
