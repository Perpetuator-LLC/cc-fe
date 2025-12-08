// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  constructor(private http: HttpClient) {}

  /**
   * Get public affiliate landing page data
   * @deprecated Use AffiliateService.getAffiliateLanding() instead - migrated to GraphQL
   */
  getAffiliateLanding(code: string): Observable<AffiliateLandingData> {
    return this.http.get<AffiliateLandingData>(`${environment.API_URL}/a/${code}/`);
  }
}
