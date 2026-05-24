// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PodcastCardPublicComponent, PublicPodcastDisplay } from '../podcast-card-public/podcast-card-public.component';

@Component({
  selector: 'app-home-recent-episodes-section',
  standalone: true,
  imports: [MatCard, MatCardContent, MatIcon, RouterLink, PodcastCardPublicComponent],
  templateUrl: './recent-episodes-section.component.html',
  styleUrl: './recent-episodes-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentEpisodesSectionComponent {
  @Input() loading = false;
  @Input() podcasts: PublicPodcastDisplay[] = [];
  readonly skeletonItems = [1, 2, 3];

  get hasRecent(): boolean {
    return this.podcasts.length > 0;
  }
}
