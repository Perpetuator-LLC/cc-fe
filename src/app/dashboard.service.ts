// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SiteStatistics } from './interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private apollo: Apollo) {}

  /**
   * Get site statistics using GraphQL public query (no auth required)
   */
  getStats(): Observable<SiteStatistics> {
    const query = gql`
      query GetSiteStatistics {
        siteStatistics {
          totalUsers
          activeUsers30Days
          totalPodcasts
          enabledPodcasts
          totalEpisodes
          liveEpisodes
          totalNewsArticles
          totalJobs
          pendingJobs
          runningJobs
          completedJobs
          failedJobs
          totalAudioMinutesGenerated
          totalAudioMinutesPublished
        }
      }
    `;

    interface SiteStatisticsResult {
      siteStatistics: SiteStatistics;
    }

    return this.apollo
      .query<SiteStatisticsResult>({
        query,
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data.siteStatistics));
  }
}
