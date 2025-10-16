// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SiteStatistics } from './interface';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  getStats(): Observable<SiteStatistics> {
    return this.http.get<SiteStatistics>(`${this.apiUrl}/site-statistics/`);
  }
}
