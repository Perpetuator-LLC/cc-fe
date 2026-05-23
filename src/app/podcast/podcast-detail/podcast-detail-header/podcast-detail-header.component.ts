// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ShareButtonsComponent } from '../../../share-buttons/share-buttons.component';

/**
 * Top page header for PodcastDetail: title row, status summary, and the
 * "Create Episode" action buttons. Extracted to keep the parent template
 * below the cyclomatic-complexity threshold.
 */
@Component({
  selector: 'app-podcast-detail-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ShareButtonsComponent,
  ],
  templateUrl: './podcast-detail-header.component.html',
  styleUrls: ['./podcast-detail-header.component.scss'],
})
export class PodcastDetailHeaderComponent {
  @Input({ required: true }) podcastForm!: FormGroup;
  @Input({ required: true }) publicShareUrl!: string;
  @Input({ required: true }) podcastDescription!: string;
  @Input() hasUnsavedChanges = false;
  @Input() creatingNewsEpisode = false;
  @Input() creatingResearchEpisode = false;
  @Input() telegramConnected = false;

  @Output() save = new EventEmitter<void>();
  @Output() createNewsEpisode = new EventEmitter<void>();
  @Output() createResearchEpisode = new EventEmitter<void>();
  @Output() createBlankEpisode = new EventEmitter<void>();

  get podcastName(): string {
    return this.podcastForm.get('name')?.value ?? '';
  }

  get shareTitle(): string {
    return this.podcastName || '';
  }

  get teamName(): string | null {
    return this.podcastForm.get('team')?.value?.name ?? null;
  }

  get teamUuid(): string | null {
    return this.podcastForm.get('team')?.value?.uuid ?? null;
  }

  get teamUrl(): string {
    return `/team/${this.teamUuid}`;
  }

  get isLive(): boolean {
    return !!this.podcastForm.get('enabled')?.value;
  }

  get liveLabel(): string {
    return this.isLive ? 'Live' : 'Disabled';
  }

  get telegramLabel(): string {
    return this.telegramConnected ? 'Connected' : 'Disconnected';
  }

  get saveDisabled(): boolean {
    return !this.podcastForm.dirty || !this.podcastForm.valid;
  }

  get newsEpisodeDisabled(): boolean {
    return this.hasUnsavedChanges || this.creatingNewsEpisode;
  }

  get researchEpisodeDisabled(): boolean {
    return this.hasUnsavedChanges || this.creatingResearchEpisode;
  }
}
