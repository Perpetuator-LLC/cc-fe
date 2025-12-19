// Copyright (c) 2025 Perpetuator LLC
import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AffiliateService, AffiliateLanding } from '../affiliate.service';

/**
 * Route resolver for affiliate landing page
 * Fetches affiliate data before the component loads so SSR can render with proper meta tags
 */
export const affiliateLandingResolver: ResolveFn<AffiliateLanding | null> = (route: ActivatedRouteSnapshot) => {
  const affiliateService = inject(AffiliateService);
  const code = route.paramMap.get('code');

  if (!code) {
    return of(null);
  }

  return affiliateService.getAffiliateLanding(code).pipe(
    catchError(() => {
      // Return null if the affiliate code is invalid or there's an error
      return of(null);
    }),
  );
};
