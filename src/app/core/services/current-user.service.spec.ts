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

  it('creates the service', () => expect(service).toBeTruthy());

  it('stores and clears the current user', () => {
    service.set({ userId: '1', displayName: 'Vishal' });
    expect(service.displayName()).toBe('Vishal');
    service.clear();
    expect(service.user()).toBeNull();
  });
});
