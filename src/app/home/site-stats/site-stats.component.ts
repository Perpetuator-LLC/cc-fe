// Copyright (c) 2025-2026 Perpetuator LLC
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { SiteStatistics } from '../../interface';

@Component({
  selector: 'app-home-site-stats',
  standalone: true,
  imports: [DecimalPipe, MatCard, MatCardContent, MatIcon],
  templateUrl: './site-stats.component.html',
  styleUrl: './site-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteStatsComponent {
  @Input() loading = false;
  @Input() stats: SiteStatistics | null = null;
  readonly skeletonItems = [1, 2, 3, 4, 5, 6];
}
