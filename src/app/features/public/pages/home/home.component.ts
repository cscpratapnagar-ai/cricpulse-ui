import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { HomeDashboardService } from './home-dashboard.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  readonly cursorX = signal(-500);
  readonly cursorY = signal(-500);
  readonly currentUser = inject(CurrentUserService);
  readonly dashboard = inject(HomeDashboardService);

  greeting = 'Good evening';

  ngOnInit(): void {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    this.dashboard.load();
  }

  trackPointer(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.cursorX.set(event.clientX - rect.left);
    this.cursorY.set(event.clientY - rect.top);
  }
}
