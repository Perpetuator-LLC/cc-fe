// Copyright (c) 2025-2026 Perpetuator LLC
import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { NewsResult } from '../../news.service';

/**
 * Single news row in the news list. Pre-renders all the per-row strings
 * (tooltip, "selected" state) to keep the parent template's complexity
 * down.
 */
@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [DatePipe, NgClass, MatCheckbox, MatIcon, MatListItem, MatTooltip],
  templateUrl: './news-card.component.html',
  styleUrl: './news-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
  @Input({ required: true }) news!: NewsResult;
  @Input() selected = false;
  @Input() isActive = false;

  @Output() cardClick = new EventEmitter<void>();
  @Output() checkboxClick = new EventEmitter<MouseEvent>();
  @Output() toggleSelection = new EventEmitter<void>();

  /** Pre-computed: tooltip for the article's external link. */
  get sourceTooltip(): string {
    return `Opens ${this.news.source} in new tab`;
  }

  onCardClick(): void {
    this.cardClick.emit();
  }

  onCheckboxClick(event: MouseEvent): void {
    event.stopPropagation();
    this.checkboxClick.emit(event);
    this.toggleSelection.emit();
  }
}
