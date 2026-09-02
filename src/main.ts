import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
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
