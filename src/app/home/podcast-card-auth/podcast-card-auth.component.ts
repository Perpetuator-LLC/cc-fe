// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PodcastsResult } from '../../podcast/podcasts.service';

/** Pre-computed display fields attached to each authenticated PodcastsResult row. */
export interface AuthPodcastDisplay extends PodcastsResult {
  formattedTimeAgo: string;
  formattedViewCount: string;
}

@Component({
  selector: 'app-home-podcast-card-auth',
  standalone: true,
  imports: [MatCard, MatCardContent, MatIcon, RouterLink],
  templateUrl: './podcast-card-auth.component.html',
  styleUrl: './podcast-card-auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastCardAuthComponent {
  @Input({ required: true }) podcast!: AuthPodcastDisplay;
}
