// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PodcastsResult } from '../../../podcast/podcasts.service';

/**
 * Empty-state form shown before the user has fetched news for a podcast.
 * Lets the user pick a podcast and a time window.
 */
@Component({
  selector: 'app-news-select-podcast-form',
  standalone: true,
  imports: [MatButton, MatFormField, MatLabel, MatOption, MatSelect, MatProgressSpinner],
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

  /** Pre-computed: whether the fetch-news button is disabled. */
  get fetchDisabled(): boolean {
    return this.selectedPodcastUuid === null;
  }

  onPodcastValueChange(uuid: string | null): void {
    this.selectedPodcastUuidChange.emit(uuid);
    this.podcastChange.emit();
  }

  onHoursValueChange(hours: number): void {
    this.selectedHoursChange.emit(hours);
    this.podcastChange.emit();
  }

  onFetchClick(): void {
    this.fetchNews.emit();
  }
}
