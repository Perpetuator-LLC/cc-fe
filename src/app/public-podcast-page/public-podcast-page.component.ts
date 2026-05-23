// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PublicPodcastHttpService, PodcastResponse, PublicEpisode } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { MessageService } from '../message.service';
import { AuthService } from '../auth/auth.service';
import { SeoService } from '../seo.service';
import { AudioPlayerService, AudioTrack } from '../shared/audio-player/audio-player.service';

@Component({
  selector: 'app-public-podcast-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    ShareButtonsComponent,
  ],
  templateUrl: './public-podcast-page.component.html',
  styleUrl: './public-podcast-page.component.scss',
})
export class PublicPodcastPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicPodcastService = inject(PublicPodcastHttpService);
  private shareService = inject(ShareService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private seoService = inject(SeoService);
  private audioPlayerService = inject(AudioPlayerService);

  podcastData: PodcastResponse | null = null;
  /**
   * Pre-enriched episode list cached so the template can read per-episode
   * display strings as property access (`episode.formattedDate` etc.) instead
   * of calling formatters on every change-detection tick.
   */
  episodesDisplay: (PublicEpisode & {
    url: string;
    shareUrl: string;
    formattedDate: string;
    formattedDuration: string;
  })[] = [];
  /**
   * Pre-computed flat list of category badges (header + subcategories) so the
   * template can render them with a single `@for` instead of nested loops.
   */
  categoriesDisplay: { key: string; subcategory?: string; route: (string | undefined)[]; label: string }[] = [];
  /**
   * Pre-computed list of optional load-count stats so the template can render
   * them with a single `@for` instead of three sibling `@if` blocks.
   */
  optionalLoadStats: { icon: string; label: string }[] = [];
  loading = true;
  error = false;
  podcastId = '';
  currentPage = 1;
  perPage = 20;
  isAuthenticated = false;

  constructor() {
    this.isAuthenticated = this.authService.isLoggedIn();
  }

  playEpisode(episode: PublicEpisode): void {
    if (!episode.audioUrl) return;

    const track: AudioTrack = {
      id: episode.id.toString(),
      title: episode.title,
      subtitle: this.podcastData?.name,
      audioUrl: episode.audioUrl,
      duration: episode.duration,
      type: 'episode',
      sourceRoute: this.getEpisodeUrl(episode.id, episode.title),
    };

    this.audioPlayerService.play(track);
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const idParam = params['id'];
      this.podcastId = this.shareService.extractIdFromSlugParam(idParam);
      this.loadPodcast();
    });

    this.route.queryParams.subscribe((params) => {
      const page = params['page'];
      if (page) {
        this.currentPage = parseInt(page, 10);
      }
    });
  }

  loadPodcast(): void {
    this.loading = true;
    this.error = false;

    this.publicPodcastService.getPodcast(this.podcastId, this.currentPage, this.perPage).subscribe({
      next: (data) => {
        this.podcastData = data;
        this.episodesDisplay = (data.episodes || []).map((ep) => ({
          ...ep,
          url: this.getEpisodeUrl(ep.id, ep.title),
          shareUrl: this.getEpisodeShareUrl(ep.id, ep.title),
          formattedDate: this.formatDate(ep.date),
          formattedDuration: this.formatDuration(ep.duration),
        }));
        this.categoriesDisplay = this.buildCategoriesDisplay(data.categories);
        this.optionalLoadStats = this.buildOptionalLoadStats(data);
        this.loading = false;
        this.updateSeoTags();
      },
      error: (err) => {
        console.error('[PublicPodcastPage] Failed to load podcast:', err);
        this.error = true;
        this.loading = false;
        this.messageService.error(`Failed to load podcast: ${err.status} ${err.statusText || err.message}`);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.currentPage },
      queryParamsHandling: 'merge',
    });
    this.loadPodcast();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Public share URL for the podcast itself. Getter so template reads it as property access. */
  get shareUrl(): string {
    if (!this.podcastData) return '';
    return this.shareService.buildPodcastUrl(this.podcastData.id, this.podcastData.name);
  }

  /**
   * Preferred podcast cover image (thumbnail when available, otherwise the
   * full-size image). Empty string when neither is present.
   * Exposed as a getter so the template renders a single `@if` instead of
   * `@if/@else if` on two separate URL fields.
   */
  get podcastImage(): string {
    return this.podcastData?.thumbnailUrl || this.podcastData?.imageUrl || '';
  }

  /** Whether the paginator should be shown. Avoids an inline boolean expression in the template. */
  get showPaginator(): boolean {
    return (this.podcastData?.pagination.totalPages ?? 0) > 1;
  }

  /**
   * Flatten the categories map into a single list of badge descriptors so the
   * template can render headers and subcategories with one `@for` instead of
   * a nested loop.
   */
  private buildCategoriesDisplay(
    categories: Record<string, string[]> | null | undefined,
  ): { key: string; subcategory?: string; route: (string | undefined)[]; label: string }[] {
    if (!categories) return [];
    const result: { key: string; subcategory?: string; route: (string | undefined)[]; label: string }[] = [];
    for (const key of Object.keys(categories)) {
      result.push({ key, route: ['/categories', key], label: key });
      for (const subcategory of categories[key] || []) {
        result.push({
          key,
          subcategory,
          route: ['/categories', key, subcategory],
          label: subcategory,
        });
      }
    }
    return result;
  }

  /**
   * Build the list of optional load-count stats so the template renders them
   * via a single `@for` rather than three sibling `@if` blocks. Stats with
   * undefined counts are simply omitted.
   */
  private buildOptionalLoadStats(data: PodcastResponse): { icon: string; label: string }[] {
    const stats: { icon: string; label: string }[] = [];
    if (data.rssLoadCount !== undefined) {
      stats.push({ icon: 'rss_feed', label: `${data.rssLoadCount} RSS loads` });
    }
    if (data.imageLoadCount !== undefined) {
      stats.push({ icon: 'image', label: `${data.imageLoadCount} image loads` });
    }
    if (data.thumbnailLoadCount !== undefined) {
      stats.push({ icon: 'photo', label: `${data.thumbnailLoadCount} thumbnail loads` });
    }
    return stats;
  }

  /** Backwards-compatible method kept for the internal updateSeoTags caller. */
  getShareUrl(): string {
    return this.shareUrl;
  }

  getEpisodeUrl(episodeId: string, title: string): string {
    return this.shareService.buildEpisodeRoute(episodeId, title);
  }

  getEpisodeShareUrl(episodeId: string, title: string): string {
    return this.shareService.buildEpisodeUrl(episodeId, title);
  }

  getCategoryUrl(category: string, subcategory?: string): string {
    return subcategory ? `/categories/${category}/${subcategory}` : `/categories/${category}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private updateSeoTags(): void {
    if (!this.podcastData) return;

    const shareUrl = this.getShareUrl();
    const description =
      this.podcastData.description ||
      `Listen to ${this.podcastData.name} - ${this.podcastData.pagination.totalEpisodes} episodes available`;

    this.seoService.updateTags({
      title: `${this.podcastData.name} | Capital Copilot`,
      description,
      image: this.podcastData.imageUrl || this.podcastData.thumbnailUrl,
      url: shareUrl,
      type: 'website',
      author: this.podcastData.ownerName,
      twitterCard: 'summary_large_image',
    });
  }
}
