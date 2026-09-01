import { TestBed } from '@angular/core/testing';
import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  let service: CurrentUserService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentUserService);
  });

  afterEach(() => localStorage.clear());

  it('persists and clears the current user', () => {
    service.set({ userId: '1', displayName: 'Vishal' });

    expect(service.user()?.userId).toBe('1');
    expect(service.displayName()).toBe('Vishal');
    expect(JSON.parse(localStorage.getItem('cricketpulse_user') ?? '{}').displayName).toBe(
      'Vishal',
    );

    service.clear();

    expect(service.user()).toBeNull();
    expect(localStorage.getItem('cricketpulse_user')).toBeNull();
  });

  it('falls back through available display-name fields', () => {
    service.set({ fullName: 'Full Name' });
    expect(service.displayName()).toBe('Full Name');

    service.set({ email: 'player@example.com' });
    expect(service.displayName()).toBe('player');

    service.clear();
    expect(service.displayName()).toBe('there');
  });

  it('tolerates corrupt persisted user data', () => {
    localStorage.setItem('cricketpulse_user', '{broken');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(CurrentUserService);

    expect(restored.user()).toBeNull();
    expect(restored.displayName()).toBe('there');
  });
});
