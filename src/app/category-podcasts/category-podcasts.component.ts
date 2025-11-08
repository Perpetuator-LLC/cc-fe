// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicPodcastHttpService, PublicPodcast } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { MessageService } from '../message.service';

@Component({
  selector: 'app-category-podcasts',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ShareButtonsComponent,
  ],
  templateUrl: './category-podcasts.component.html',
  styleUrl: './category-podcasts.component.scss',
})
export class CategoryPodcastsComponent implements OnInit {
  podcasts: PublicPodcast[] = [];
  loading = true;
  category = '';
  subcategory?: string;
  limit = 20;

  constructor(
    private route: ActivatedRoute,
    private publicPodcastService: PublicPodcastHttpService,
    private shareService: ShareService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.category = params['category'];
      this.subcategory = params['subcategory'];
      this.loadPodcasts();
    });
  }

  loadPodcasts(): void {
    this.loading = true;

    this.publicPodcastService.getPodcastsByCategory(this.category, this.subcategory, this.limit).subscribe({
      next: (data) => {
        this.podcasts = data.podcasts;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load podcasts:', err);
        this.loading = false;
        this.messageService.error('Failed to load podcasts');
      },
    });
  }

  getPodcastUrl(podcast: PublicPodcast): string {
    return this.shareService.buildPodcastRoute(podcast.id, podcast.name);
  }

  getShareUrl(podcast: PublicPodcast): string {
    return this.shareService.buildPodcastUrl(podcast.id, podcast.name);
  }

  getPageTitle(): string {
    if (this.subcategory) {
      return `${this.category} > ${this.subcategory}`;
    }
    return this.category;
  }
}
