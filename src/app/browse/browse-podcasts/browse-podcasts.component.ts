// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PublicPodcastHttpService, PublicPodcast } from '../../public-podcast-http.service';
import { ShareService } from '../../share.service';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-browse-podcasts',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    ShareButtonsComponent,
  ],
  templateUrl: './browse-podcasts.component.html',
  styleUrl: './browse-podcasts.component.scss',
})
export class BrowsePodcastsComponent implements OnInit {
  private publicPodcastService = inject(PublicPodcastHttpService);
  private shareService = inject(ShareService);
  private messageService = inject(MessageService);

  podcasts: PublicPodcast[] = [];
  loading = true;
  sortBy: 'views' | 'recent' = 'views';
  limit = 20;

  ngOnInit(): void {
    this.loadPodcasts();
  }

  loadPodcasts(): void {
    this.loading = true;

    this.publicPodcastService.getPodcasts(this.limit, this.sortBy).subscribe({
      next: (data) => {
        this.podcasts = data.podcasts;
        this.loading = false;
      },
      error: (err) => {
        console.error('[BrowsePodcasts] Failed to load podcasts:', err);
        this.loading = false;
        this.messageService.error(`Failed to load podcasts: ${err.status} ${err.statusText || err.message}`);
      },
    });
  }

  onSortChange(sort: 'views' | 'recent'): void {
    this.sortBy = sort;
    this.loadPodcasts();
  }

  getPodcastUrl(podcast: PublicPodcast): string {
    return this.shareService.buildPodcastRoute(podcast.id, podcast.name);
  }

  getShareUrl(podcast: PublicPodcast): string {
    return this.shareService.buildPodcastUrl(podcast.id, podcast.name);
  }
}
