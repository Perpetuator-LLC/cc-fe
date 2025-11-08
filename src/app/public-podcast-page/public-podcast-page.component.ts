// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PublicPodcastHttpService, PodcastResponse } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { MessageService } from '../message.service';
import { AuthService } from '../auth.service';
import { SeoService } from '../seo.service';

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
  podcastData: PodcastResponse | null = null;
  loading = true;
  error = false;
  podcastId = '';
  currentPage = 1;
  perPage = 20;
  isAuthenticated = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicPodcastService: PublicPodcastHttpService,
    private shareService: ShareService,
    private messageService: MessageService,
    private authService: AuthService,
    private seoService: SeoService,
  ) {
    this.isAuthenticated = this.authService.isLoggedIn();
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

  getShareUrl(): string {
    if (!this.podcastData) return '';
    return this.shareService.buildPodcastUrl(this.podcastData.id, this.podcastData.name);
  }

  getEpisodeUrl(episodeId: string, title: string): string {
    return this.shareService.buildEpisodeRoute(episodeId, title);
  }

  getEpisodeShareUrl(episodeId: string, title: string): string {
    return this.shareService.buildEpisodeUrl(episodeId, title);
  }

  getCategoryUrl(category: string, subcategory?: string): string {
    return subcategory ? `/c/${category}/${subcategory}` : `/c/${category}`;
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
      `Listen to ${this.podcastData.name} - ${this.podcastData.totalEpisodes} episodes available`;

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
