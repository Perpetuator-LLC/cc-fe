// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCard, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { NewsResult } from '../../../news/news.service';

/** Pre-computed display state for an RSS feed in the news view. */
interface NewsFeedDisplay {
  id: string;
  name: string;
  url: string;
  isReachable: boolean;
  isParsable: boolean;
  reachIcon: string;
  reachClass: string;
  reachTooltip: string;
  parseIcon: string;
  parseClass: string;
  parseTooltip: string;
}

/** News item enriched with pre-computed display data. */
export interface NewsItemDisplay extends NewsResult {
  hasFeeds: boolean;
  feedDisplays: NewsFeedDisplay[];
}

@Component({
  selector: 'app-episode-referenced-news',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, MatCard, MatCardHeader, MatIcon, MatTooltip],
  templateUrl: './episode-referenced-news.component.html',
  styleUrl: './episode-referenced-news.component.scss',
})
export class EpisodeReferencedNewsComponent {
  @Input() news: NewsItemDisplay[] = [];
  @Input() isGridView = true;

  @Output() viewToggle = new EventEmitter<boolean>();

  get countLabel(): string {
    return `${this.news.length} news articles`;
  }

  onToggleView(isGrid: boolean): void {
    this.viewToggle.emit(isGrid);
  }
}
