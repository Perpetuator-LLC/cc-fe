// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RssFeedResult } from '../podcasts.service';

@Component({
  selector: 'app-rss-feed-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinner,
    DatePipe,
  ],
  templateUrl: './rss-feed-table.component.html',
  styleUrls: ['./rss-feed-table.component.scss'],
})
export class RssFeedTableComponent implements OnInit {
  @Input() dataSource: RssFeedResult[] = [];
  @Input() showActions = false;
  @Input() loading = false;
  @Output() deleteFeed = new EventEmitter<string>();

  displayedColumns: string[] = ['name', 'url', 'status'];

  ngOnInit() {
    if (this.showActions) {
      this.displayedColumns = ['name', 'url', 'status', 'actions'];
    }
  }

  onDelete(uuid: string) {
    this.deleteFeed.emit(uuid);
  }

  getTooltipText(feed: RssFeedResult): string {
    const parts: string[] = [];

    if (feed.isReachable) {
      parts.push('✓ Feed is reachable');
    } else {
      parts.push('✗ Feed is not reachable (404, timeout, etc.)');
    }

    if (feed.isParsable) {
      parts.push('✓ Feed content is valid and parsable');
    } else {
      parts.push('✗ Feed has format/parsing issues');
    }

    if (feed.lastFetchAttempt) {
      parts.push(`Last checked: ${new Date(feed.lastFetchAttempt).toLocaleString()}`);
    }

    return parts.join('\n');
  }
}
