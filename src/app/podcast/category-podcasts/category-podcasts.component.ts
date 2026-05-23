// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicPodcastHttpService, PublicPodcast } from '../../public-podcast-http.service';
import { ShareService } from '../../share.service';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { MessageService } from '../../message.service';

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
  private route = inject(ActivatedRoute);
  private publicPodcastService = inject(PublicPodcastHttpService);
  private shareService = inject(ShareService);
  private messageService = inject(MessageService);

  /**
   * Enriched podcast list with pre-computed routerLink + share URL per row.
   * Built when the API returns so the template avoids per-CD method calls.
   */
  podcasts: (PublicPodcast & { url: string; shareUrl: string })[] = [];
  loading = true;
  category = '';
  subcategory?: string;
  decodedCategory = '';
  decodedSubcategory = '';
  pageTitle = '';
  limit = 20;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.category = params['category'];
      this.subcategory = params['subcategory'];
      this.decodedCategory = this.decodeCategory(this.category);
      this.decodedSubcategory = this.subcategory ? this.decodeCategory(this.subcategory) : '';
      this.pageTitle = this.subcategory ? `${this.decodedCategory} > ${this.decodedSubcategory}` : this.decodedCategory;
      this.loadPodcasts();
    });
  }

  loadPodcasts(): void {
    this.loading = true;

    this.publicPodcastService.getPodcastsByCategory(this.category, this.subcategory, this.limit).subscribe({
      next: (data) => {
        this.podcasts = data.podcasts.map((p) => ({
          ...p,
          url: this.getPodcastUrl(p),
          shareUrl: this.getShareUrl(p),
        }));
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
    const decodedCategory = this.decodeCategory(this.category);
    if (this.subcategory) {
      const decodedSubcategory = this.decodeCategory(this.subcategory);
      return `${decodedCategory} > ${decodedSubcategory}`;
    }
    return decodedCategory;
  }

  decodeCategory(category: string): string {
    try {
      return decodeURIComponent(category);
    } catch {
      return category;
    }
  }
}
