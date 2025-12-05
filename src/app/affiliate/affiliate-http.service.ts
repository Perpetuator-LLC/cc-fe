// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AffiliateLandingData {
  affiliate_code: string;
  affiliate_username: string;
  brand_image_url: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AffiliateHttpService {
  constructor(private http: HttpClient) {}

  getAffiliateLanding(code: string): Observable<AffiliateLandingData> {
    return this.http.get<AffiliateLandingData>(`${environment.API_URL}/a/${code}/`);
  }
}
