// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  blocked?: boolean;
  rssFeeds?: RssFeed[];
}

export interface RssFeed {
  id: string;
  name?: string;
  url: string;
  isReachable: boolean;
  isParsable: boolean;
}

@Component({
  selector: 'app-research-news-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatCardModule, MatTooltipModule, MatButtonModule, DatePipe],
  templateUrl: './research-news-list.component.html',
  styleUrl: './research-news-list.component.scss',
})
export class ResearchNewsListComponent {
  @Input() news: NewsItem[] = [];
  @Input() showHeader = true;
  @Input() viewMode: 'grid' | 'list' = 'grid';

  toggleView(grid: boolean): void {
    this.viewMode = grid ? 'grid' : 'list';
  }
}
