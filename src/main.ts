import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/auth';
import { loadingInterceptor } from './app/loading.interceptor';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor])), provideRouter(routes)]
}).catch((error: unknown) => console.error(error));
