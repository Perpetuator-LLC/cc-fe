// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCard, MatCardHeader } from '@angular/material/card';
import { MatList } from '@angular/material/list';
import { NewsResult } from '../../news.service';
import { NewsCardComponent } from '../news-card/news-card.component';

/** A pre-decorated row used by the news list. */
export interface NewsResultDisplay {
  news: NewsResult;
  selected: boolean;
}

/** UI mode for the news list area. */
export type NewsListMode = 'list' | 'noNews' | 'noPodcast' | 'hidden';

/**
 * Renders the active news list view: list, empty-with-filter, or one of
 * the "select a podcast" / "no news found" empty cards.
 */
@Component({
  selector: 'app-news-results',
  standalone: true,
  imports: [MatCard, MatCardHeader, MatList, NewsCardComponent],
  templateUrl: './news-results.component.html',
  styleUrl: './news-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsResultsComponent {
  @Input() mode: NewsListMode = 'hidden';
  @Input() items: NewsResultDisplay[] = [];
  @Input() emptyMessage: string | null = null;
  @Input() activeNews: NewsResult | null = null;

  @Output() selectNews = new EventEmitter<NewsResult>();
  @Output() toggleSelection = new EventEmitter<NewsResult>();
}
