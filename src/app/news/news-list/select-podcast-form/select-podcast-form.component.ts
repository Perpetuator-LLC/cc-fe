// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { LabeledSelectComponent, LabeledSelectOption } from '../../../shared/labeled-select/labeled-select.component';
import { PodcastsResult } from '../../../podcast/podcasts.service';

/** Static time-window options shared by the news dropdowns. */
const TIME_OPTIONS: LabeledSelectOption[] = [
  { value: 12, label: '12 Hours' },
  { value: 24, label: '24 Hours' },
  { value: 7 * 24, label: '1 Week' },
  { value: 14 * 24, label: '2 Weeks' },
];

/**
 * Empty-state form shown before the user has fetched news for a podcast.
 * Lets the user pick a podcast and a time window.
 */
@Component({
  selector: 'app-news-select-podcast-form',
  standalone: true,
  imports: [MatButton, LabeledSelectComponent],
  templateUrl: './select-podcast-form.component.html',
  styleUrl: './select-podcast-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectPodcastFormComponent {
  @Input() podcasts: PodcastsResult[] = [];
  @Input() selectedPodcastUuid: string | null = null;
  @Input() selectedHours = 24;
  @Input() loadingPodcasts = false;

  @Output() selectedPodcastUuidChange = new EventEmitter<string | null>();
  @Output() selectedHoursChange = new EventEmitter<number>();
  @Output() podcastChange = new EventEmitter<void>();
  @Output() fetchNews = new EventEmitter<void>();

  readonly timeOptions = TIME_OPTIONS;

  /** Podcasts mapped to the labeled-select option shape. */
  get podcastOptions(): LabeledSelectOption[] {
    return this.podcasts.map((podcast) => ({ value: podcast.uuid, label: podcast.name ?? '' }));
  }

  /** Pre-computed: whether the fetch-news button is disabled. */
  get fetchDisabled(): boolean {
    return this.selectedPodcastUuid === null;
  }

  onPodcastValueChange(uuid: unknown): void {
    this.selectedPodcastUuidChange.emit((uuid as string | null) ?? null);
    this.podcastChange.emit();
  }

  onHoursValueChange(hours: unknown): void {
    this.selectedHoursChange.emit(hours as number);
    this.podcastChange.emit();
  }

  onFetchClick(): void {
    this.fetchNews.emit();
  }
}
