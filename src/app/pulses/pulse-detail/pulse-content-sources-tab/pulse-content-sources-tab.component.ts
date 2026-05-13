// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContentSource } from '../../pulses.types';

@Component({
  selector: 'app-pulse-content-sources-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './pulse-content-sources-tab.component.html',
  styleUrl: './pulse-content-sources-tab.component.scss',
})
export class PulseContentSourcesTabComponent {
  @Input() contentSources: ContentSource[] = [];
  @Input() allSymbols: string[] = [];
  @Input() contentSourceColumns: string[] = [];

  @Output() addBulkRssFeeds = new EventEmitter<void>();
  @Output() addContentSource = new EventEmitter<void>();
  @Output() editContentSource = new EventEmitter<ContentSource>();
  @Output() removeContentSource = new EventEmitter<string>();

  getSourceTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      rss_feed: 'rss_feed',
      search_term: 'search',
      watchlist: 'list',
      company: 'business',
    };
    return icons[type] ?? 'source';
  }

  getSourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      rss_feed: 'RSS Feed',
      search_term: 'Search Term',
      watchlist: 'Watchlist',
      company: 'Company',
    };
    return labels[type] ?? type;
  }
}
