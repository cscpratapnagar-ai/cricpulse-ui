import { TestBed } from '@angular/core/testing';
import { AccountProfileComponent } from './account-profile.component';
import { CurrentUserService } from '../../../../core/services/current-user.service';

describe('AccountProfileComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountProfileComponent],
    }).compileComponents();
  });

  it('should initialize with the profile tab and expected tab definitions', () => {
    const fixture = TestBed.createComponent(AccountProfileComponent);
    const component = fixture.componentInstance;

    expect(component.tab()).toBe('profile');
    expect(component.tabs.map((tab) => tab.key)).toEqual([
      'profile',
      'account',
      'preferences',
      'security',
    ]);
  });

  it('should toggle preference signals', () => {
    const component = TestBed.createComponent(AccountProfileComponent).componentInstance;

    component.toggleShowName();
    component.toggleCompact();
    component.toggleReduceMotion();

    expect(component.showName()).toBeFalse();
    expect(component.compact()).toBeTrue();
    expect(component.reduceMotion()).toBeTrue();
  });

  it('should derive user initials from the current user', () => {
    const users = TestBed.inject(CurrentUserService);
    users.set({ displayName: 'Virat Kohli' });

    const component = TestBed.createComponent(AccountProfileComponent).componentInstance;

    expect(component.initials()).toBe('VK');
  });
});
