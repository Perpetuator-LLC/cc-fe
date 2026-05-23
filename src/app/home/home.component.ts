// Copyright (c) 2025-2026 Perpetuator LLC
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { PodcastsService, PodcastsResult } from '../podcast/podcasts.service';
import { PublicPodcastHttpService, PublicPodcast } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ToolbarService } from '../layout/toolbar.service';
import { AuthService } from '../auth/auth.service';
import { Component, AfterViewInit, ViewChild, TemplateRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../dashboard.service';
import { SiteStatistics } from '../interface';
import { NewsletterDialogComponent } from '../news/newsletter-dialog/newsletter-dialog.component';
import { PodcastCardAuthComponent, AuthPodcastDisplay } from './podcast-card-auth/podcast-card-auth.component';
import { PodcastCardPublicComponent, PublicPodcastDisplay } from './podcast-card-public/podcast-card-public.component';
import { SiteStatsComponent } from './site-stats/site-stats.component';
import { RecentEpisodesSectionComponent } from './recent-episodes-section/recent-episodes-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardContent,
    MatButton,
    RouterLink,
    MatIcon,
    PodcastCardAuthComponent,
    PodcastCardPublicComponent,
    SiteStatsComponent,
    RecentEpisodesSectionComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnInit {
  private toolbarService = inject(ToolbarService);
  protected authService = inject(AuthService);
  private podcastsService = inject(PodcastsService);
  private publicPodcastService = inject(PublicPodcastHttpService);
  private dashboardService = inject(DashboardService);
  protected shareService = inject(ShareService);
  private dialog = inject(MatDialog);

  protected isLoggedIn = this.authService.isLoggedIn;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  siteStats: SiteStatistics | null = null;
  loadingStats = true;
  readonly podcastSkeletonItems = [1, 2, 3];

  /** Pre-computed: which "no podcasts" empty-state message to show. */
  get noPodcastsMessage(): string {
    return this.isLoggedIn() ? 'No podcasts yet. Create your first podcast!' : 'No podcasts available.';
  }

  /** Pre-computed: which podcasts section title to show. */
  get podcastsSectionTitle(): string {
    return this.isLoggedIn() ? 'Recent Podcasts' : 'Popular Podcasts';
  }

  /** Pre-computed: where "View all" should route. */
  get viewAllLink(): string {
    return this.isLoggedIn() ? '/media/podcasts' : '/podcasts';
  }

  /** Pre-computed: are there any podcasts to show in the current podcasts section. */
  get hasPodcastsToShow(): boolean {
    return this.isLoggedIn() ? this.authPodcasts.length > 0 : this.publicPodcasts.length > 0;
  }

  authPodcasts: AuthPodcastDisplay[] = [];
  /**
   * Pre-enriched public podcast lists used by the template. Each entry
   * carries pre-built `slug`, `truncatedDescription`, `formattedTimeAgo`,
   * and `formattedViewCount` so the template avoids per-tick method
   * calls.
   */
  publicPodcasts: PublicPodcastDisplay[] = [];
  recentPodcasts: PublicPodcastDisplay[] = [];
  loadingRecentPodcasts = true;

  private enrichPublic(p: PublicPodcast): PublicPodcastDisplay {
    return {
      ...p,
      truncatedDescription: this.truncateDescription(p.description ?? ''),
      // `PublicPodcast.latestEpisodeDate` isn't part of the shared interface yet;
      // fall back to `null` if the API doesn't return it.
      formattedTimeAgo: this.formatTimeAgo(
        (p as PublicPodcast & { latestEpisodeDate?: string | null }).latestEpisodeDate ?? null,
      ),
      formattedViewCount: this.formatViewCount(p.viewCount ?? 0),
    };
  }

  private enrichAuth(p: PodcastsResult): AuthPodcastDisplay {
    return {
      ...p,
      formattedTimeAgo: this.formatTimeAgo(p.latestEpisodeDate ?? null),
      formattedViewCount: this.formatViewCount(p.viewCount ?? 0),
    };
  }

  openNewsletterDialog(): void {
    this.dialog.open(NewsletterDialogComponent, {
      width: '500px',
      disableClose: false,
    });
  }

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      forkJoin({
        stats: this.dashboardService.getStats(),
        podcasts: this.podcastsService.getPodcasts(3),
      }).subscribe({
        next: ({ stats, podcasts }) => {
          this.siteStats = stats;
          this.authPodcasts = podcasts.podcasts.map((p) => this.enrichAuth(p));
          this.loadingStats = false;
        },
        error: (error: unknown) => {
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
          this.publicPodcasts = popular.podcasts.map((p) => this.enrichPublic(p));

          // Filter out podcasts that are in the popular list
          const popularIds = new Set(this.publicPodcasts.map((p) => p.id));
          const filteredRecent = recent.podcasts.filter((p) => !popularIds.has(p.id));

          // Take the top 3 from filtered recent podcasts
          this.recentPodcasts = filteredRecent.slice(0, 3).map((p) => this.enrichPublic(p));

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
      this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
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
