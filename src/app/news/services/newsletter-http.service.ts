// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NewsletterSubscribeRequest {
  email: string;
}

export interface NewsletterUnsubscribeRequest {
  email: string;
  token?: string;
}

export interface NewsletterResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NewsletterHttpService {
  constructor(private http: HttpClient) {}

  subscribe(email: string): Observable<NewsletterResponse> {
    return this.http.post<NewsletterResponse>(`${environment.API_URL}/newsletter/subscribe/`, { email });
  }

  unsubscribe(email: string, token?: string): Observable<NewsletterResponse> {
    const payload: NewsletterUnsubscribeRequest = { email };
    if (token) {
      payload.token = token;
    }
    return this.http.post<NewsletterResponse>(`${environment.API_URL}/newsletter/unsubscribe/`, payload);
  }
}
