// Copyright (c) 2025-2026 Perpetuator LLC
import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { AffiliateService, AffiliateLanding } from '../affiliate.service';
import { SeoService } from '../../seo.service';
import { environment } from '../../../environments/environment';

/**
 * Route resolver for affiliate landing page
 * Fetches affiliate data before the component loads so SSR can render with proper meta tags
 */
export const affiliateLandingResolver: ResolveFn<AffiliateLanding | null> = (route: ActivatedRouteSnapshot) => {
  const affiliateService = inject(AffiliateService);
  const seoService = inject(SeoService);
  const code = route.paramMap.get('code');

  if (!code) {
    return of(null);
  }

  return affiliateService.getAffiliateLanding(code).pipe(
    tap((data) => {
      if (data) {
        // Set SEO tags during resolve so SSR renders them
        const shareUrl = `${environment.SITE_URL}/a/${code}`;

        // Use customMessage if available, otherwise fall back to default
        const title = data.customMessage
          ? data.customMessage
          : `Join ${data.affiliateUsername}'s Network | Capital Copilot`;

        // Use generic description that works for both custom messages and default
        const description = data.customMessage
          ? `Start your journey with Capital Copilot through this affiliate invitation.`
          : `Start your journey with Capital Copilot and become part of ${data.affiliateUsername}'s affiliate network.`;

        seoService.updateTags({
          title,
          description,
          image: data.brandImageUrl || undefined,
          url: shareUrl,
          type: 'website',
          twitterCard: 'summary_large_image',
        });
      }
    }),
    catchError(() => {
      // Return null if the affiliate code is invalid or there's an error
      return of(null);
    }),
  );
};
