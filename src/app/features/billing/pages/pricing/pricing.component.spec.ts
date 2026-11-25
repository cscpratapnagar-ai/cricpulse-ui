import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { PricingComponent } from './pricing.component';

describe('PricingComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, PricingComponent],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the catalogue, tournaments, orders and entitlements', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    const component = fixture.componentInstance;
    const freePackage = {
      code: 'FREE_TOURNAMENT',
      name: 'Free Tournament',
      amountPaise: 0,
      currency: 'INR',
      description: 'Free',
      validity: 'Free',
    };
    const plusPackage = {
      code: 'ORGANIZER_PLUS',
      name: 'Organizer Plus',
      amountPaise: 9900,
      currency: 'INR',
      description: 'Plus',
      validity: 'Per tournament',
    };
    const tournament = { id: 'tournament-1', name: 'City League', status: 'DRAFT' };

    http.expectOne(`${API_BASE_URL}/payments/packages`).flush([freePackage, plusPackage]);
    http.expectOne(`${API_BASE_URL}/tournaments/mine`).flush([tournament]);
    http.expectOne(`${API_BASE_URL}/payments/orders`).flush([]);
    http.expectOne(`${API_BASE_URL}/payments/entitlements`).flush([]);

    expect(component.packages().length).toBe(2);
    expect(component.packages()[1].amountPaise).toBe(9900);
    expect(component.loading()).toBeFalse();
    expect(component.tournaments()[0].name).toBe('City League');
    expect(component.selectedTournamentId()).toBe('tournament-1');
    expect(component.orders()).toEqual([]);
    expect(component.entitlements()).toEqual([]);
    fixture.destroy();
  });

  it('inherits Plus access from Pro', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    const component = fixture.componentInstance;
    const tournament = { id: 'tournament-1', name: 'City League', status: 'DRAFT' };
    const entitlement = {
      tournamentId: 'tournament-1',
      packageCode: 'ORGANIZER_PRO',
      activationSource: 'MANUAL',
      activatedAt: '2026-11-25T10:00:00Z',
      expiresAt: null,
    };
    const plusPackage = {
      code: 'ORGANIZER_PLUS',
      name: 'Organizer Plus',
      amountPaise: 9900,
      currency: 'INR',
      description: 'Plus',
      validity: 'Per tournament',
    };

    http.expectOne(`${API_BASE_URL}/payments/packages`).flush([]);
    http.expectOne(`${API_BASE_URL}/tournaments/mine`).flush([tournament]);
    http.expectOne(`${API_BASE_URL}/payments/orders`).flush([]);
    http.expectOne(`${API_BASE_URL}/payments/entitlements`).flush([entitlement]);
    component.packages.set([plusPackage]);

    expect(component.isActive(component.packages()[0])).toBeTrue();
    fixture.destroy();
  });

  it('formats paise as Indian rupees', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    const component = fixture.componentInstance;

    http.expectOne(`${API_BASE_URL}/payments/packages`).flush([]);
    http.expectOne(`${API_BASE_URL}/tournaments/mine`).flush([]);
    http.expectOne(`${API_BASE_URL}/payments/orders`).flush([]);
    http.expectOne(`${API_BASE_URL}/payments/entitlements`).flush([]);

    expect(component.price(19900)).toContain('199');
    fixture.destroy();
  });
});
