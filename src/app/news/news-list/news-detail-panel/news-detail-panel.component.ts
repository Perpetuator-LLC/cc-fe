// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { SafeHtml } from '@angular/platform-browser';
import { DynamicStyleDirective } from '../../../shared/dynamic-style.directive';
import { IncludesPipe } from '../../../shared/pipes';
import { UserService } from '../../../user/user.service';
import { NewsResult } from '../../news.service';

/** Display-ready bundle of pre-rendered fields for the selected news item. */
export interface NewsDetailDisplay {
  summaryHtml: SafeHtml | null;
  validatedSummaryHtml: SafeHtml | null;
  contentHtml: SafeHtml | null;
  tags: { kind: string; value: string; label: string; class: string }[];
}

@Component({
  selector: 'app-news-detail-panel',
  standalone: true,
  imports: [NgClass, MatButton, MatDivider, MatIcon, MatTooltip, DynamicStyleDirective, IncludesPipe],
  templateUrl: './news-detail-panel.component.html',
  styleUrl: './news-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsDetailPanelComponent {
  protected userService = inject(UserService);

  @Input() selectedNewsDetail: NewsResult | null = null;
  @Input() selectedNewsDisplay: NewsDetailDisplay | null = null;
  @Input() detailPanelWidth = 450;
  @Input() isResizing = false;

  @Output() closePanel = new EventEmitter<void>();
  @Output() resizeStart = new EventEmitter<MouseEvent>();
  @Output() processNews = new EventEmitter<string>();
  @Output() regenerateSummary = new EventEmitter<string>();

  /** Pre-computed: tooltip string for the article external link. */
  get sourceTooltip(): string {
    return this.selectedNewsDetail ? `Opens ${this.selectedNewsDetail.source} in new tab` : '';
  }

  /**
   * Pre-computed: label for the "regenerate summary (force)" button —
   * "Reg" when there's existing summary text, otherwise "G".
   */
  get regenerateButtonLabel(): string {
    return (this.selectedNewsDetail?.summary?.length ?? 0) > 0 ? 'Reg' : 'G';
  }

  /** Pre-computed: dynamic style payload for the detail panel width. */
  get widthStyle(): Record<string, string> {
    return { width: (this.selectedNewsDetail ? this.detailPanelWidth : 0) + 'px' };
  }

  /** Pre-computed: whether the article has any categories to render. */
  get hasCategories(): boolean {
    return (this.selectedNewsDetail?.categories?.length ?? 0) > 0;
  }

  /** Pre-computed: whether the article has any tags to render. */
  get hasTags(): boolean {
    return (this.selectedNewsDetail?.tags?.length ?? 0) > 0;
  }

  onResizeStartHandler(event: MouseEvent): void {
    this.resizeStart.emit(event);
  }

  onCloseHandler(): void {
    this.closePanel.emit();
  }

  onProcessNews(uuid: string): void {
    this.processNews.emit(uuid);
  }

  onRegenerateSummary(uuid: string): void {
    this.regenerateSummary.emit(uuid);
  }
}
