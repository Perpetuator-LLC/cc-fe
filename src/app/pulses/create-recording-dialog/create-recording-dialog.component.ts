// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
import { A11yModule } from '@angular/cdk/a11y';
import { Subscription, debounceTime } from 'rxjs';
import { PulsesService } from '../pulses.service';
import { MessageService } from '../../message.service';
import { JobService } from '../../jobs/job.service';
import { UserService } from '../../user/user.service';
import { Voice } from '../../podcast/voices.service';
import { VoiceDropdownComponent } from '../../shared/voice-dropdown/voice-dropdown.component';
import { DialogDraftService } from '../../shared/services/dialog-draft.service';

export interface CreateRecordingDialogData {
  pulseConfigUuid?: string; // Optional — if absent, creates standalone recording
  initialText?: string;
  initialTitle?: string;
}

export interface CreateRecordingDialogResult {
  pulseUuid: string;
  jobUuid: string;
}

interface RecordingDraft {
  title: string;
  text: string;
  convertToTranscript: boolean;
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
    A11yModule,
    VoiceDropdownComponent,
  ],
  templateUrl: './create-recording-dialog.component.html',
  styleUrl: './create-recording-dialog.component.scss',
})
export class CreateRecordingDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<CreateRecordingDialogComponent, CreateRecordingDialogResult>>(MatDialogRef);
  readonly data = inject<CreateRecordingDialogData>(MAT_DIALOG_DATA);
  private readonly pulsesService = inject(PulsesService);
  private readonly messageService = inject(MessageService);
  private readonly jobService = inject(JobService);
  private readonly userService = inject(UserService);
  private readonly draftService = inject(DialogDraftService);

  form: FormGroup;
  generating = false;
  private subscriptions = new Subscription();

  // Voice selection for standalone recordings
  selectedVoiceUuid: string | null = null;

  /** Whether this dialog creates a standalone recording (no pulse config) */
  get isStandalone(): boolean {
    return !this.data?.pulseConfigUuid;
  }

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

  constructor() {
    // Prevent accidental close on backdrop click
    this.dialogRef.disableClose = true;

    this.form = this.fb.group({
      title: [this.data?.initialTitle || '', [Validators.maxLength(200)]],
      text: [this.data?.initialText || '', [Validators.required, Validators.maxLength(50000)]],
      convertToTranscript: [true],
    });

    // Auto-save draft on changes (debounced) - only for standalone recordings
    this.subscriptions.add(
      this.form.valueChanges.pipe(debounceTime(500)).subscribe(() => {
        if (this.isStandalone) {
          this.saveDraft();
        }
      }),
    );
  }

  ngOnInit(): void {
    if (this.isStandalone) {
      this.loadUserDefaultVoice();
      this.restoreDraft();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Restore any previously saved draft (only for standalone recordings)
   */
  private restoreDraft(): void {
    const savedData = this.draftService.loadDraft<RecordingDraft>('recording');
    if (savedData) {
      this.form.patchValue(savedData, { emitEvent: false });
    }
  }

  /**
   * Save current form state to localStorage
   */
  private saveDraft(): void {
    const formValue = this.form.getRawValue();
    this.draftService.saveDraft('recording', formValue);
  }

  private loadUserDefaultVoice(): void {
    this.userService.userSettings(['defaultVoice']).subscribe({
      next: (settings) => {
        const defaultVoiceSetting = settings.find((s) => s.key === 'defaultVoice');
        if (defaultVoiceSetting?.value) {
          this.selectedVoiceUuid = defaultVoiceSetting.value;
        }
      },
      error: () => {
        // Ignore - use component default
      },
    });
  }

  onVoiceSelected(voice: Voice): void {
    this.selectedVoiceUuid = voice.uuid;
    this.saveDefaultVoice(voice.uuid);
  }

  private saveDefaultVoice(voiceUuid: string): void {
    this.userService.updateUserSetting('defaultVoice', voiceUuid).subscribe({
      // Silent save — don't interrupt user flow
      error: () => {
        // Ignore errors, voice selection still works locally
      },
    });
  }

  generate(): void {
    if (this.form.invalid || this.generating) return;

    this.generating = true;
    const { title, text, convertToTranscript } = this.form.value;

    const obs = this.isStandalone
      ? this.pulsesService.generateTextToSpeech(text, title, this.selectedVoiceUuid ?? undefined, convertToTranscript)
      : this.pulsesService.createRecording(this.data.pulseConfigUuid!, title, text, convertToTranscript);

    obs.subscribe({
      next: (response) => {
        this.generating = false;
        this.messageService.success('Recording created! Audio will be ready shortly.');
        this.trackJob(response.jobUuid);
        // Clear draft on successful creation
        if (this.isStandalone) {
          this.draftService.clearDraft('recording');
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

  private trackJob(jobUuid: string): void {
    if (jobUuid) {
      this.jobService.addJob({
        id: jobUuid,
        uuid: jobUuid,
        kind: 'CREATE_RECORDING',
        status: 'RUNNING',
        error: '',
        result: null,
        args: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
