// Copyright (c) 2025 Perpetuator LLC
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton, MatAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

import { PodcastsService, PodcastsResult } from '../podcast/podcasts.service';
import { PublicPodcastHttpService, PublicPodcast } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth/auth.service';
import { Component, AfterViewInit, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../dashboard.service';
import { SiteStatistics } from '../interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardContent, MatButton, MatAnchor, RouterLink, MatIcon, SvgIconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnInit {
  protected isLoggedIn = this.authService.isLoggedIn;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  siteStats: SiteStatistics | undefined;
  loadingStats = true;

  authPodcasts: PodcastsResult[] = [];
  publicPodcasts: PublicPodcast[] = [];
  recentPodcasts: PublicPodcast[] = [];
  loadingRecentPodcasts = true;

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
    private podcastsService: PodcastsService,
    private publicPodcastService: PublicPodcastHttpService,
    private dashboardService: DashboardService,
    protected shareService: ShareService,
  ) {}

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      forkJoin({
        stats: this.dashboardService.getStats(),
        podcasts: this.podcastsService.getPodcasts(3),
      }).subscribe({
        next: ({ stats, podcasts }) => {
          this.siteStats = stats;
          this.authPodcasts = podcasts.podcasts;
          this.loadingStats = false;
        },
        error: (error) => {
          console.error('[Home] Logged-in data loading error:', error);
          this.authPodcasts = [];
          this.loadingStats = false;
        },
      });
    } else {
      forkJoin({
        stats: this.dashboardService.getStats(),
        popular: this.publicPodcastService.getPodcasts(3, 'views'),
        recent: this.publicPodcastService.getPodcasts(6, 'recent'),
      }).subscribe({
        next: ({ stats, popular, recent }) => {
          this.siteStats = stats;
          this.publicPodcasts = popular.podcasts;

          // Filter out podcasts that are in the popular list
          const popularIds = new Set(this.publicPodcasts.map((p) => p.id));
          const filteredRecent = recent.podcasts.filter((p) => !popularIds.has(p.id));

          // Take the top 3 from filtered recent podcasts
          this.recentPodcasts = filteredRecent.slice(0, 3);

          this.loadingStats = false;
          this.loadingRecentPodcasts = false;
        },
        error: (error) => {
          console.error('[Home] Logged-out data loading error:', error);
          this.publicPodcasts = [];
          this.recentPodcasts = [];
          this.loadingStats = false;
          this.loadingRecentPodcasts = false;
        },
      });
    }
  }

  ngAfterViewInit() {
    // Only set toolbar when logged in (regular layout)
    // Pre-login layout already has branding in its header
    if (this.isLoggedIn()) {
      const viewContainerRef = this.toolbarService.getViewContainerRef();
      viewContainerRef.clear();
      viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    }
  }

  protected formatTimeAgo(dateString: string | null): string {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  protected formatViewCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else if (count === 1) {
      return '1 view';
    } else {
      return `${count} views`;
    }
  }

  protected truncateDescription(description: string, maxLength = 350): string {
    if (!description || description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength).trim() + '...';
  }
}
