import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptorService } from './auth-interceptor.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { graphqlProvider } from './graphql.provider';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true,
    },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideHttpClient(),
    graphqlProvider,
    importProvidersFrom(MatIconModule),
    {
      provide: APP_INITIALIZER,
      useFactory: (iconRegistry: MatIconRegistry) => () => {
        iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
        // ...so we don't have to add the font set class to every icon, but different font sets can still be used.
      },
      deps: [MatIconRegistry],
      multi: true,
    },
  ],
};
