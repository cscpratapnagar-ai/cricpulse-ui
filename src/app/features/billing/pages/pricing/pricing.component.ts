import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { API_BASE_URL } from '../../../../core/config/api.config';

interface PackageOption {
  code: string;
  name: string;
  amountPaise: number;
  currency: string;
  description: string;
  validity: string;
}

interface PaymentOrder {
  id: string;
  tournamentId: string | null;
  teamId: string | null;
  packageCode: string;
  amountPaise: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

interface TournamentOption {
  id: string;
  name: string;
  status: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  city: string | null;
  workspaceRole: string;
  canManage: boolean;
}

interface Entitlement {
  tournamentId: string | null;
  teamId: string | null;
  packageCode: string;
  activationSource: string;
  activatedAt: string;
  expiresAt: string | null;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
})
export class PricingComponent {
  private readonly http = inject(HttpClient);
  readonly packages = signal<PackageOption[]>([]);
  readonly tournaments = signal<TournamentOption[]>([]);
  readonly selectedTournamentId = signal('');
  readonly workspaces = signal<WorkspaceOption[]>([]);
  readonly selectedWorkspaceId = signal('');
  readonly orders = signal<PaymentOrder[]>([]);
  readonly entitlements = signal<Entitlement[]>([]);
  readonly loading = signal(true);
  readonly busyCode = signal('');
  readonly error = signal('');
  readonly notice = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<PackageOption[]>(`${API_BASE_URL}/payments/packages`).subscribe({
      next: (items) => this.packages.set(items ?? []),
      error: () => this.error.set('Pricing catalogue could not be loaded. Please retry.'),
    });
    this.http.get<TournamentOption[]>(`${API_BASE_URL}/tournaments/mine`).subscribe({
      next: (items) => {
        this.tournaments.set(items ?? []);
        if (!this.selectedTournamentId() && items?.length) {
          this.selectedTournamentId.set(items[0].id);
        }
      },
      error: () => this.error.set('Your tournament list could not be loaded.'),
    });
    this.http.get<WorkspaceOption[]>(`${API_BASE_URL}/teams/workspaces`).subscribe({
      next: (items) => {
        const manageable = (items ?? []).filter(
          (workspace) => workspace.workspaceRole === 'OWNER' || workspace.workspaceRole === 'MANAGER',
        );
        this.workspaces.set(manageable);
        if (!this.selectedWorkspaceId() && manageable.length) {
          this.selectedWorkspaceId.set(manageable[0].id);
        }
      },
      error: () => this.error.set('Your team workspaces could not be loaded.'),
    });
    this.http.get<PaymentOrder[]>(`${API_BASE_URL}/payments/orders`).subscribe({
      next: (items) => this.orders.set(items ?? []),
      error: () => this.error.set('Your payment history could not be loaded.'),
    });
    this.http.get<Entitlement[]>(`${API_BASE_URL}/payments/entitlements`).subscribe({
      next: (items) => {
        this.entitlements.set(items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Your active access could not be loaded.');
      },
    });
  }

  selectTournament(tournamentId: string): void {
    this.selectedTournamentId.set(tournamentId);
  }

  selectWorkspace(teamId: string): void {
    this.selectedWorkspaceId.set(teamId);
  }

  workspaceName(teamId: string): string {
    return this.workspaces().find((workspace) => workspace.id === teamId)?.name ?? 'Team workspace';
  }

  isWorkspacePackage(item: PackageOption): boolean {
    return item.code === 'CLUB_ACADEMY_PLUS' || item.code === 'ACADEMY_BRANDING';
  }

  tournamentName(tournamentId: string): string {
    return (
      this.tournaments().find((tournament) => tournament.id === tournamentId)?.name ?? 'Tournament'
    );
  }

  price(amountPaise: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amountPaise / 100);
  }

  isActive(item: PackageOption): boolean {
    const expectedTournamentId =
      item.validity === 'Per tournament' ? this.selectedTournamentId() : null;
    const expectedTeamId = this.isWorkspacePackage(item) ? this.selectedWorkspaceId() : null;
    return this.entitlements().some((entitlement) => {
      const packageMatches =
        entitlement.packageCode === item.code ||
        (item.code === 'ORGANIZER_PLUS' && entitlement.packageCode === 'ORGANIZER_PRO');
      return packageMatches &&
        entitlement.tournamentId === expectedTournamentId &&
        entitlement.teamId === expectedTeamId;
    });
  }

  createRequest(item: PackageOption): void {
    if (this.isActive(item)) {
      this.notice.set(`${item.name} is already active for the selected scope.`);
      return;
    }
    if (item.amountPaise === 0) {
      this.notice.set('Free Tournament is the default tier. No payment is needed.');
      return;
    }
    this.busyCode.set(item.code);
    this.error.set('');
    this.notice.set('');
    this.http
      .post<PaymentOrder>(`${API_BASE_URL}/payments/orders`, {
        packageCode: item.code,
        idempotencyKey: globalThis.crypto.randomUUID(),
        tournamentId: item.validity === 'Per tournament' ? this.selectedTournamentId() : null,
        teamId: this.isWorkspacePackage(item) ? this.selectedWorkspaceId() : null,
      })
      .subscribe({
        next: (order) => {
          this.busyCode.set('');
          this.notice.set(
            `Request created for ${item.name}. Order ${order.id} is ${order.status.toLowerCase()}. Payment is not collected online yet; access starts only after verified admin activation.`,
          );
          this.load();
        },
        error: (response) => {
          this.busyCode.set('');
          this.error.set(response?.error?.message || 'Unable to create the payment request.');
        },
      });
  }
}
