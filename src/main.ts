import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth/auth';
import { apiErrorInterceptor } from './app/core/interceptors/api-error.interceptor';
import { loadingInterceptor } from './app/core/interceptors/loading.interceptor';
import { scoringCommandIdInterceptor } from './app/core/interceptors/scoring-command-id.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        apiErrorInterceptor,
        loadingInterceptor,
        scoringCommandIdInterceptor,
      ]),
    ),
    provideRouter(routes),
  ],
}).catch((error: unknown) => console.error(error));

// Cache the production app shell and static bundles so the scorer can reopen offline.
if ('serviceWorker' in navigator && !isDevMode()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('CricketPulse offline app-shell registration failed:', error);
    });
  });
}
