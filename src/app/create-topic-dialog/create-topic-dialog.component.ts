// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { ResearchService } from '../research.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSelect, MatOption } from '@angular/material/select';
import { CommonModule } from '@angular/common';

export interface PodcastOption {
  uuid: string;
  name: string;
}

export interface CreateTopicDialogData {
  podcasts: PodcastOption[];
}

@Component({
  selector: 'app-create-topic-dialog',
  standalone: true,
  imports: [
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,

    MatError,
    MatDialogModule,
    MatSelect,
    MatOption,
    CommonModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Custom Topic</h2>
    <mat-dialog-content>
      <form [formGroup]="topicForm" (ngSubmit)="createTopic()">
        <mat-form-field>
          <mat-label>Select Podcast</mat-label>
          <mat-select formControlName="podcastUuid" required>
            @for (podcast of data.podcasts; track podcast.uuid) {
              <mat-option [value]="podcast.uuid">{{ podcast.name }}</mat-option>
            }
          </mat-select>
          @if (podcastError) {
            <mat-error>{{ podcastError }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Topic Title</mat-label>
          <input matInput formControlName="title" required />
          @if (titleError) {
            <mat-error>{{ titleError }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="4"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="cancel-btn" mat-button (click)="dialogRef.close()">Cancel</button>
      <button class="create-btn" mat-flat-button (click)="createTopic()" [disabled]="!topicForm.valid || isCreating">
        @if (isCreating) {
          <mat-progress-spinner diameter="20" mode="indeterminate" />
        }
        Create Topic
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .mat-mdc-dialog-title {
        font-size: 18px;
        font-weight: 600;
      }

      mat-form-field {
        width: 100%;
        margin-bottom: 16px;
      }

      .mat-mdc-dialog-content {
        min-width: 500px;
      }

      .cancel-btn {
        border: 1px solid var(--border-color);
        color: var(--theme-color);
      }

      .create-btn {
        background: var(--primary);
        color: var(--theme-white);
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      mat-progress-spinner {
        display: inline-block;
      }

      @media screen and (max-width: 576px) {
        .mat-mdc-dialog-content {
          min-width: 300px;
        }
      }
    `,
  ],
})
export class CreateTopicDialogComponent implements OnDestroy {
  topicForm: FormGroup;
  private subscriptions = new Subscription();
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private researchService: ResearchService,
    public dialogRef: MatDialogRef<CreateTopicDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateTopicDialogData,
  ) {
    this.topicForm = this.fb.group({
      podcastUuid: ['', Validators.required],
      title: ['', Validators.required],
      description: [''],
    });
  }

  get podcastError(): string {
    const control = this.topicForm.get('podcastUuid');
    if (control?.hasError('required')) {
      return 'Please select a podcast';
    }
    return '';
  }

  get titleError(): string {
    const control = this.topicForm.get('title');
    if (control?.hasError('required')) {
      return 'Title is required';
    }
    return '';
  }

  createTopic(): void {
    if (this.topicForm.invalid || this.isCreating) {
      return;
    }

    this.isCreating = true;
    this.messageService.clearMessages();

    const { podcastUuid, title, description } = this.topicForm.value;

    this.subscriptions.add(
      this.researchService.createCustomTopic(podcastUuid, title, description || undefined).subscribe({
        next: (response) => {
          this.messageService.success('Topic created successfully!');
          this.dialogRef.close(response.topic);
        },
        error: (err: { message: string }) => {
          this.isCreating = false;
          this.messageService.error(`Failed to create topic: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
