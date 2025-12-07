// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { PublicPodcastHttpService, EpisodeResponse } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { MessageService } from '../message.service';
import { AuthService } from '../auth/auth.service';
import { SeoService } from '../seo.service';

@Component({
  selector: 'app-public-episode-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    ShareButtonsComponent,
  ],
  templateUrl: './public-episode-page.component.html',
  styleUrl: './public-episode-page.component.scss',
})
export class PublicEpisodePageComponent implements OnInit {
  episodeData: EpisodeResponse | null = null;
  loading = true;
  error = false;
  episodeId = '';
  isAuthenticated = false;

  constructor(
    private route: ActivatedRoute,
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
      this.episodeId = this.shareService.extractIdFromSlugParam(idParam);
      this.loadEpisode();
    });
  }

  loadEpisode(): void {
    this.loading = true;
    this.error = false;

    this.publicPodcastService.getEpisode(this.episodeId).subscribe({
      next: (data) => {
        this.episodeData = data;
        this.loading = false;
        this.updateSeoTags();
      },
      error: (err) => {
        console.error('[PublicEpisodePage] Failed to load episode:', err);
        this.error = true;
        this.loading = false;
        this.messageService.error(`Failed to load episode: ${err.status} ${err.statusText || err.message}`);
      },
    });
  }

  getShareUrl(): string {
    if (!this.episodeData) return '';
    return this.shareService.buildEpisodeUrl(this.episodeData.id, this.episodeData.title);
  }

  getPodcastUrl(): string {
    if (!this.episodeData?.podcastId) {
      return '';
    }
    return this.shareService.buildPodcastRoute(this.episodeData.podcastId, this.episodeData.podcastName);
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
    if (!this.episodeData) return;

    const shareUrl = this.getShareUrl();
    const description =
      this.episodeData.description || `Listen to ${this.episodeData.title} from ${this.episodeData.podcastName}`;

    this.seoService.updateTags({
      title: `${this.episodeData.title} - ${this.episodeData.podcastName} | Capital Copilot`,
      description,
      image: this.episodeData.podcast?.imageUrl || this.episodeData.podcast?.thumbnailUrl,
      url: shareUrl,
      type: 'music.song',
      author: this.episodeData.podcastName,
      publishedTime: this.episodeData.date,
      twitterCard: 'player',
      audio: this.episodeData.audioUrl,
      audioType: 'audio/mpeg',
    });
  }
}
