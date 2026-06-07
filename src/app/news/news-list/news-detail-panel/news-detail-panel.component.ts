// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { SafeHtml } from '@angular/platform-browser';
import { DynamicStyleDirective } from '../../../shared/dynamic-style.directive';
import { ActionButtonComponent } from '../../../shared/ui/action-button/action-button.component';
import { IncludesPipe } from '../../../shared/pipes';
import { UserService } from '../../../user/user.service';
import { NewsResult } from '../../news.service';

/** Display-ready bundle of pre-rendered fields for the selected news item. */
export interface NewsDetailDisplay {
  summaryHtml: SafeHtml | null;
  validatedSummaryHtml: SafeHtml | null;
  contentHtml: SafeHtml | null;
}

/** A single metadata tag prepared for display (label + semantic CSS class). */
export interface NewsDisplayTag {
  kind: string;
  value: string;
  label: string;
  class: string;
}

@Component({
  selector: 'app-news-detail-panel',
  standalone: true,
  imports: [
    NgClass,
    MatButton,
    MatDivider,
    MatIcon,
    MatTooltip,
    DynamicStyleDirective,
    ActionButtonComponent,
    IncludesPipe,
  ],
  templateUrl: './news-detail-panel.component.html',
  styleUrl: './news-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsDetailPanelComponent {
  protected userService = inject(UserService);

  private _selectedNewsDetail: NewsResult | null = null;

  /**
   * Pre-computed metadata tags (label + semantic class) for the selected item.
   * Built once when the input changes so the template doesn't run getTag* per
   * change-detection tick.
   */
  displayTags: NewsDisplayTag[] = [];

  @Input()
  set selectedNewsDetail(value: NewsResult | null) {
    this._selectedNewsDetail = value;
    this.displayTags = (value?.tags ?? []).map((t) => ({
      kind: t.kind,
      value: t.value,
      label: this.getTagLabel(t.kind, t.value),
      class: this.getTagClass(t.kind, t.value),
    }));
  }
  get selectedNewsDetail(): NewsResult | null {
    return this._selectedNewsDetail;
  }

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

  /** Get a formatted, human-readable label for a metadata tag. */
  private getTagLabel(kind: string, value: string): string {
    const labels: Record<string, Record<string, string>> = {
      political: {
        democratic: 'Democratic',
        republican: 'Republican',
        neutral: 'Neutral',
      },
      financial_sentiment: {
        bullish: '📈 Bullish',
        bearish: '📉 Bearish',
        neutral: '➡️ Neutral',
      },
      tone: {
        urgent: 'Urgent',
        calm: 'Calm',
        analytical: 'Analytical',
        sensational: 'Sensational',
      },
      content_type: {
        analysis: 'Analysis',
        breaking: 'Breaking',
        opinion: 'Opinion',
        data: 'Data Report',
      },
    };

    return labels[kind]?.[value] || value;
  }

  /** Get the semantic CSS class for a metadata tag (styled in this component's SCSS). */
  private getTagClass(kind: string, value: string): string {
    const classes: Record<string, Record<string, string>> = {
      political: {
        democratic: 'tag-political-democratic',
        republican: 'tag-political-republican',
        neutral: 'tag-political-neutral',
      },
      financial_sentiment: {
        bullish: 'tag-sentiment-bullish',
        bearish: 'tag-sentiment-bearish',
        neutral: 'tag-sentiment-neutral',
      },
      tone: {
        urgent: 'tag-tone-urgent',
        calm: 'tag-tone-calm',
        analytical: 'tag-tone-analytical',
        sensational: 'tag-tone-sensational',
      },
      content_type: {
        analysis: 'tag-content-analysis',
        breaking: 'tag-content-breaking',
        opinion: 'tag-content-opinion',
        data: 'tag-content-data',
      },
    };

    return classes[kind]?.[value] || 'tag-default';
  }
}
