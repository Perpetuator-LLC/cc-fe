// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../core/app-config.service';

export interface NewsletterResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NewsletterHttpService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  subscribe(email: string): Observable<NewsletterResponse> {
    return this.http.post<NewsletterResponse>(`${this.appConfig.config.API_URL}/newsletter/subscribe/`, { email });
  }

  unsubscribe(email: string): Observable<NewsletterResponse> {
    return this.http.post<NewsletterResponse>(`${this.appConfig.config.API_URL}/newsletter/unsubscribe/`, { email });
  }
}
