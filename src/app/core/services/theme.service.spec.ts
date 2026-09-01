import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let document: Document;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-transition'
    );
    document.body.classList.remove('theme-light', 'theme-dark');
  });

  it('applies and persists an explicit dark theme', () => {
    service.setTheme('dark');

    expect(service.preference()).toBe('dark');
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(localStorage.getItem('cricpulse-theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.body.classList.contains('theme-dark')).toBeTrue();
  });

  it('toggles from the current resolved theme', () => {
    service.setTheme('dark');
    service.toggle();

    expect(service.preference()).toBe('light');
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBeFalse();
  });

  it('marks system preference explicitly', () => {
    service.setTheme('system');

    expect(service.preference()).toBe('system');
    expect(service.isSystem()).toBeTrue();
    expect(['light', 'dark']).toContain(service.theme());
  });
});
