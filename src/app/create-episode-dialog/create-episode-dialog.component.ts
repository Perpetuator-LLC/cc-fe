// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { PodcastsResult } from '../podcasts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecentlyUsedPodcastsService } from '../recently-used-podcasts.service';

export interface CreateEpisodeDialogData {
  podcasts: PodcastsResult[];
}

export interface CreateEpisodeDialogResult {
  podcastUuid: string;
  episodeType: 'blank' | 'news' | 'research';
}

@Component({
  selector: 'app-create-episode-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatIcon,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Create New Episode</h2>
    <mat-dialog-content>
      <p class="dialog-description">Select a podcast to create an episode for:</p>
      <mat-form-field class="full-width">
        <mat-label>Select Podcast</mat-label>
        <mat-select [(value)]="selectedPodcast" placeholder="Choose a podcast">
          @for (podcast of data.podcasts; track podcast.uuid) {
            <mat-option [value]="podcast.uuid">{{ podcast.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="episode-type-section">
        <p class="section-label">Choose episode type:</p>
        <div class="episode-type-buttons">
          <button
            mat-flat-button
            class="episode-type-btn"
            [disabled]="!selectedPodcast"
            (click)="createEpisode('blank')"
          >
            <mat-icon>article</mat-icon>
            <div class="btn-content">
              <span class="btn-title">Blank Episode</span>
              <span class="btn-description">Start with empty content</span>
            </div>
          </button>

          <button
            mat-flat-button
            class="episode-type-btn"
            [disabled]="!selectedPodcast"
            (click)="createEpisode('news')"
          >
            <mat-icon>newspaper</mat-icon>
            <div class="btn-content">
              <span class="btn-title">News Episode</span>
              <span class="btn-description">Create from latest news</span>
            </div>
          </button>

          <button
            mat-flat-button
            class="episode-type-btn"
            [disabled]="!selectedPodcast"
            (click)="createEpisode('research')"
          >
            <mat-icon>science</mat-icon>
            <div class="btn-content">
              <span class="btn-title">Research Episode</span>
              <span class="btn-description">Create from research topic</span>
            </div>
          </button>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        padding: 0 24px 20px;
        min-width: 500px;

        @media screen and (max-width: 576px) {
          min-width: auto;
        }
      }

      mat-dialog-actions {
        gap: 8px;
        padding: 16px 24px;
      }

      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 16px;
        color: var(--theme-color);
      }

      .dialog-description {
        margin: 0 0 16px 0;
        color: var(--description-color);
        font-size: 14px;
      }

      .full-width {
        width: 100%;
        margin-bottom: 24px;
      }

      .episode-type-section {
        margin-top: 24px;
      }

      .section-label {
        margin: 0 0 12px 0;
        font-weight: 600;
        color: var(--theme-color);
        font-size: 14px;
      }

      .episode-type-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .episode-type-btn {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        text-align: left;
        background: var(--toolbar-container-background-color);
        color: var(--theme-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        transition: all 0.2s ease;
        width: 100%;
        min-height: 80px;

        &:not(:disabled):hover {
          background: var(--secondary-400);
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 4px;
        }

        .btn-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
          align-self: center;
        }

        .btn-title {
          font-weight: 600;
          font-size: 16px;
          line-height: 1.3;
          color: var(--theme-color);
          white-space: normal;
          word-wrap: break-word;
        }

        .btn-description {
          font-size: 13px;
          line-height: 1.4;
          color: var(--description-color);
          white-space: normal;
          word-wrap: break-word;
        }
      }
    `,
  ],
})
export class CreateEpisodeDialogComponent implements OnInit {
  selectedPodcast: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<CreateEpisodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateEpisodeDialogData,
    private recentlyUsedPodcastsService: RecentlyUsedPodcastsService,
  ) {}

  ngOnInit(): void {
    // Sort podcasts by recently used
    this.data.podcasts = this.recentlyUsedPodcastsService.sortByRecentlyUsed(this.data.podcasts);

    // Auto-select if there's only one podcast, or use most recently used
    this.selectedPodcast = this.recentlyUsedPodcastsService.getDefaultSelection(this.data.podcasts);
  }

  createEpisode(episodeType: 'blank' | 'news' | 'research'): void {
    if (!this.selectedPodcast) {
      return;
    }

    // Record the podcast selection in history
    this.recentlyUsedPodcastsService.recordSelection(this.selectedPodcast);

    const result: CreateEpisodeDialogResult = {
      podcastUuid: this.selectedPodcast,
      episodeType,
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
