// Copyright (c) 2025 Perpetuator LLC
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { graphqlProvider } from './graphql.provider';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { CustomMatPaginatorIntl } from './custom-paginator-intl';
import { OAuthModule } from 'angular-oauth2-oidc';
import { authInterceptor } from './auth/interceptors/auth.interceptor';
import { tokenRefreshInterceptor } from './auth/interceptors/token-refresh.interceptor';
import { errorTrackingInterceptor } from './core/interceptors/error-tracking.interceptor';
import { GlobalErrorHandler } from './core/global-error-handler';
import { RouterErrorTracker } from './core/router-error-tracker';
import { AppTitleStrategy } from './layout/app-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([tokenRefreshInterceptor, authInterceptor, errorTrackingInterceptor]),
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    graphqlProvider,
    importProvidersFrom(MatIconModule, OAuthModule.forRoot()),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (iconRegistry: MatIconRegistry) => () => {
        iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
      },
      deps: [MatIconRegistry],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (routerErrorTracker: RouterErrorTracker) => () => {
        // RouterErrorTracker is instantiated and starts tracking automatically
        void routerErrorTracker;
      },
      deps: [RouterErrorTracker],
      multi: true,
    },
    {
      provide: MatPaginatorIntl,
      useClass: CustomMatPaginatorIntl,
    },
    {
      provide: TitleStrategy,
      useClass: AppTitleStrategy,
    },
  ],
};
