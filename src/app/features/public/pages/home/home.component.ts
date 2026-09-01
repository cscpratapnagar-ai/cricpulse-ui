import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { CurrentUser, CurrentUserService } from '../../../../current-user.service';

import { RouterLink } from '@angular/router';

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

  trackPointer(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.cursorX.set(event.clientX - rect.left);
    this.cursorY.set(event.clientY - rect.top);
  }

  private readonly http = inject(HttpClient);
  readonly currentUser = inject(CurrentUserService);

  greeting = 'Good evening';

  ngOnInit(): void {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.http
      .get<CurrentUser>('http://localhost:8080/api/auth/me')
      .pipe(catchError(() => of(this.readCachedUser())))
      .subscribe((user) => {
        if (!user) return;
        this.currentUser.set(user);
      });
  }

  private readCachedUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem('cricketpulse_user');
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }
}
