// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../core/app-config.service';

/**
 * PUBLIC Affiliate HTTP Service
 *
 * ⚠️ DEPRECATED - Use AffiliateService.getAffiliateLanding() instead
 *
 * This service is deprecated as of December 2025.
 * The backend has migrated from HTTP endpoints to GraphQL queries.
 *
 * Migration: Use AffiliateService.getAffiliateLanding(code) which uses GraphQL
 * and does not require authentication (public query).
 *
 * See migration guide in backend documentation.
 */

export interface AffiliateLandingData {
  affiliate_code: string;
  affiliate_username: string;
  brand_image_url: string | null;
}

/**
 * @deprecated Use AffiliateService.getAffiliateLanding() instead
 */
@Injectable({
  providedIn: 'root',
})
export class AffiliateHttpService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  /**
   * Get public affiliate landing page data
   * @deprecated Use AffiliateService.getAffiliateLanding() instead - migrated to GraphQL
   */
  getAffiliateLanding(code: string): Observable<AffiliateLandingData> {
    return this.http.get<AffiliateLandingData>(`${this.appConfig.config.API_URL}/a/${code}/`);
  }
}
