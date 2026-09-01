import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => localStorage.clear());

  it('creates the service', () => expect(service).toBeTruthy());

  it('updates an explicit theme preference', () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBeTrue();
  });
});
