// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { gql } from 'apollo-angular';
import { BaseService } from './base.service';
import { SiteStatistics } from './interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService extends BaseService {
  getStats() {
    const GQL = gql`
      query GetSiteStatistics {
        siteStatistics {
          totalUsers
          activeUsers30Days
          totalTeams
          totalPodcasts
          totalAudioMinutesGenerated
          totalAudioMinutesPublished
          enabledPodcasts
          totalEpisodes
          liveEpisodes
          totalNewsArticles
          totalJobs
          completedJobs
          failedJobs
          totalCompanies
          totalDcfAnalyses
          totalStockPrices
          totalVoices
          enabledVoices
          recentEpisodes
          recentNewsProcessed
          recentDcfAnalyses
          recentJobs
          recentCompletedJobs
          recentFailedJobs
          recentPendingJobs
          recentRunningJobs
        }
      }
    `;

    interface Response {
      siteStatistics: SiteStatistics;
    }

    return this.query<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(map(({ siteStatistics }) => siteStatistics));
  }
}
