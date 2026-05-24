// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { RssFeed } from '../../pulses.types';

/** Display-enriched RSS feed suggestion with pre-computed flags. */
export interface RssFeedSuggestion extends RssFeed {
  hasIssue: boolean;
}

@Component({
  selector: 'app-rss-feed-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatProgressSpinner,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatIcon,
  ],
  templateUrl: './rss-feed-field.component.html',
  styleUrl: './rss-feed-field.component.scss',
})
export class RssFeedFieldComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() rssFeedSuggestions: RssFeedSuggestion[] = [];
  @Input() isSearchingRssFeeds = false;
  @Input() selectedRssFeed: RssFeed | null = null;
  @Input() displayRssFeed: (feed: RssFeed | string | null) => string = () => '';

  @Output() rssInputChange = new EventEmitter<Event>();
  @Output() rssFeedSelected = new EventEmitter<RssFeed>();

  get noSuggestions(): boolean {
    return this.rssFeedSuggestions.length === 0 && !this.isSearchingRssFeeds;
  }

  get selectedHintText(): string {
    if (!this.selectedRssFeed) {
      return '';
    }
    return this.selectedRssFeed.name || this.selectedRssFeed.url;
  }

  get hasRequiredError(): boolean {
    return !!this.form.get('rssUrl')?.hasError('required');
  }

  get hasPatternError(): boolean {
    return !!this.form.get('rssUrl')?.hasError('pattern');
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.rssFeedSelected.emit(event.option.value);
  }

  onInput(event: Event): void {
    this.rssInputChange.emit(event);
  }
}
