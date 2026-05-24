// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PublicPodcast } from '../../public-podcast-http.service';

/** Pre-computed display fields attached to each PublicPodcast row. */
export interface PublicPodcastDisplay extends PublicPodcast {
  truncatedDescription: string;
  formattedTimeAgo: string;
  formattedViewCount: string;
}

@Component({
  selector: 'app-home-podcast-card-public',
  standalone: true,
  imports: [MatCard, MatCardContent, MatIcon, RouterLink],
  templateUrl: './podcast-card-public.component.html',
  styleUrl: './podcast-card-public.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastCardPublicComponent {
  @Input({ required: true }) podcast!: PublicPodcastDisplay;
  /** When `true`, show view count even if undefined as "(No views data)". */
  @Input() showMissingViewsPlaceholder = false;

  get routerLinkPath(): (string | number)[] {
    return ['/podcasts', `${this.podcast.id}-${this.podcast.slug}`];
  }

  get displayImage(): string | undefined {
    return this.podcast.thumbnailUrl || this.podcast.imageUrl;
  }
}
