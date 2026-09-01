import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingCount = signal(0);
  private readonly visibleState = signal(false);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading = computed(() => this.visibleState());

  start(): void {
    this.pendingCount.update((value) => value + 1);
    if (this.pendingCount() !== 1) return;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = setTimeout(() => {
      if (this.pendingCount() > 0) this.visibleState.set(true);
    }, 120);
  }

  stop(): void {
    this.pendingCount.update((value) => Math.max(0, value - 1));
    if (this.pendingCount() !== 0) return;
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.visibleState.set(false), 180);
  }

  reset(): void {
    this.pendingCount.set(0);
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.visibleState.set(false);
  }
}
