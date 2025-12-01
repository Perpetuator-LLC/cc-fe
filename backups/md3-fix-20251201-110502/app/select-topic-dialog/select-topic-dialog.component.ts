// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../research.service';

export interface SelectTopicDialogData {
  podcastUuid: string;
  topics: Topic[];
}

export interface SelectTopicDialogResult {
  topicUuid: string;
}

@Component({
  selector: 'app-select-topic-dialog',
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
    <h2 mat-dialog-title>Create Research Episode</h2>
    <mat-dialog-content>
      @if (filteredTopics.length > 0) {
        <p class="dialog-description">Select a research topic to create an episode from:</p>
        <mat-form-field class="full-width">
          <mat-label>Select Research Topic</mat-label>
          <mat-select [(value)]="selectedTopicUuid" placeholder="Choose a topic">
            @for (topic of filteredTopics; track topic.uuid) {
              <mat-option [value]="topic.uuid">
                {{ topic.title }}
                @if (topic.episode) {
                  <span class="has-episode-badge">(Episode exists)</span>
                }
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      } @else {
        <div class="no-topics-message">
          <mat-icon>info</mat-icon>
          <p>No research topics available for this podcast.</p>
          <p class="suggestion">Create a research topic first from the Research Topics page.</p>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      @if (filteredTopics.length > 0) {
        <button mat-flat-button color="primary" [disabled]="!selectedTopicUuid" (click)="onCreate()">
          <mat-icon>article</mat-icon>
          Create Episode
        </button>
      }
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
      }

      .has-episode-badge {
        margin-left: 8px;
        font-size: 12px;
        color: var(--description-color);
        font-style: italic;
      }

      .no-topics-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 40px 20px;
        text-align: center;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: var(--description-color);
        }

        p {
          margin: 0;
          color: var(--theme-color);
          font-size: 14px;
        }

        .suggestion {
          color: var(--description-color);
          font-size: 13px;
        }
      }

      button[mat-flat-button] {
        background: var(--primary);
        color: var(--theme-white);
        border-radius: 8px;
        border: 1px solid var(--border-color);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;

        &:disabled {
          background-color: var(--secondary-400);
          color: var(--description-color);
          cursor: not-allowed;
          opacity: 0.6;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin: 0;
        }
      }
    `,
  ],
})
export class SelectTopicDialogComponent implements OnInit {
  selectedTopicUuid: string | null = null;
  filteredTopics: Topic[] = [];

  constructor(
    public dialogRef: MatDialogRef<SelectTopicDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectTopicDialogData,
  ) {}

  ngOnInit(): void {
    // Filter topics for the selected podcast
    this.filteredTopics = this.data.topics.filter((topic) => topic.podcast.uuid === this.data.podcastUuid);

    // Auto-select if there's only one topic
    if (this.filteredTopics.length === 1) {
      this.selectedTopicUuid = this.filteredTopics[0].uuid;
    }
  }

  onCreate(): void {
    if (!this.selectedTopicUuid) {
      return;
    }

    const result: SelectTopicDialogResult = {
      topicUuid: this.selectedTopicUuid,
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
