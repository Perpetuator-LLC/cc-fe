// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../../message.service';
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
  templateUrl: './create-topic-dialog.component.html',
  styleUrl: './create-topic-dialog.component.scss',
})
export class CreateTopicDialogComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private researchService = inject(ResearchService);
  dialogRef = inject<MatDialogRef<CreateTopicDialogComponent>>(MatDialogRef);
  data = inject<CreateTopicDialogData>(MAT_DIALOG_DATA);

  topicForm: FormGroup;
  private subscriptions = new Subscription();
  isCreating = false;

  constructor() {
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
