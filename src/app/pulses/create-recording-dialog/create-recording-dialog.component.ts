// Copyright (c) 2026 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PulsesService } from '../pulses.service';
import { MessageService } from '../../message.service';
import { JobService } from '../../jobs/job.service';

export interface CreateRecordingDialogData {
  pulseConfigUuid: string;
  initialText?: string;
  initialTitle?: string;
}

export interface CreateRecordingDialogResult {
  pulseUuid: string;
  jobUuid: string;
}

@Component({
  selector: 'app-create-recording-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './create-recording-dialog.component.html',
  styleUrl: './create-recording-dialog.component.scss',
})
export class CreateRecordingDialogComponent {
  form: FormGroup;
  generating = false;

  // Word count computed from text
  get wordCount(): number {
    const text = this.form.get('text')?.value || '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  // Estimated duration at 120 WPM
  get estimatedDuration(): string {
    const minutes = this.wordCount / 120;
    if (minutes < 1) {
      return `${Math.ceil(minutes * 60)} seconds`;
    }
    return `${minutes.toFixed(1)} minutes`;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateRecordingDialogComponent, CreateRecordingDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: CreateRecordingDialogData,
    private pulsesService: PulsesService,
    private messageService: MessageService,
    private jobService: JobService,
  ) {
    this.form = this.fb.group({
      title: [data?.initialTitle || '', [Validators.required, Validators.maxLength(200)]],
      text: [data?.initialText || '', [Validators.required, Validators.maxLength(50000)]],
      convertToTranscript: [true], // Default: ON - AI converts to audio-friendly transcript
    });
  }

  generate(): void {
    if (this.form.invalid || this.generating) return;

    this.generating = true;
    const { title, text, convertToTranscript } = this.form.value;

    this.pulsesService.createRecording(this.data.pulseConfigUuid, title, text, convertToTranscript).subscribe({
      next: (response) => {
        this.generating = false;
        this.messageService.success('Recording created! Audio will be ready shortly.');

        // Track the job
        if (response.jobUuid) {
          this.jobService.addJob({
            id: response.jobUuid,
            uuid: response.jobUuid,
            kind: 'CREATE_RECORDING',
            status: 'RUNNING',
            error: '',
            result: null,
            args: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        this.dialogRef.close({
          pulseUuid: response.pulse.uuid,
          jobUuid: response.jobUuid,
        });
      },
      error: (error) => {
        this.generating = false;
        this.messageService.error(`Failed to create recording: ${error.message}`);
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
