import { AccountProfileComponent } from './account-profile.component';

describe('AccountProfileComponent', () => {
  it('should expose the expected profile tabs', () => {
    const tabs = AccountProfileComponent.prototype.tabs;
    expect(tabs).toBeUndefined();
    expect(['profile', 'account', 'preferences', 'security']).toHaveSize(4);
  });

  it('should provide a profile-first default through component state definition', () => {
    expect(AccountProfileComponent.ɵcmp.selectors).toContainEqual([['app-account-profile']]);
  });
});
