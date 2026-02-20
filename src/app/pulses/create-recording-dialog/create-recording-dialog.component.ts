// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnInit } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { PulsesService } from '../pulses.service';
import { MessageService } from '../../message.service';
import { JobService } from '../../jobs/job.service';
import { UserService } from '../../user/user.service';
import { Voice, VoicesService, VoiceTier, voiceToTier, tierToString } from '../../podcast/voices.service';
import { forkJoin } from 'rxjs';

export interface CreateRecordingDialogData {
  pulseConfigUuid?: string; // Optional — if absent, creates standalone recording
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
    MatSelectModule,
  ],
  templateUrl: './create-recording-dialog.component.html',
  styleUrl: './create-recording-dialog.component.scss',
})
export class CreateRecordingDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<CreateRecordingDialogComponent, CreateRecordingDialogResult>>(MatDialogRef);
  readonly data = inject<CreateRecordingDialogData>(MAT_DIALOG_DATA);
  private readonly pulsesService = inject(PulsesService);
  private readonly messageService = inject(MessageService);
  private readonly jobService = inject(JobService);
  private readonly userService = inject(UserService);
  private readonly voicesService = inject(VoicesService);

  form: FormGroup;
  generating = false;

  // Voice selection for standalone recordings
  voices: Voice[] = [];
  loadingVoices = false;
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
    this.form = this.fb.group({
      title: [this.data?.initialTitle || '', [Validators.required, Validators.maxLength(200)]],
      text: [this.data?.initialText || '', [Validators.required, Validators.maxLength(50000)]],
      convertToTranscript: [true],
    });
  }

  ngOnInit(): void {
    if (this.isStandalone) {
      this.loadVoicesAndUserDefault();
    }
  }

  private loadVoicesAndUserDefault(): void {
    this.loadingVoices = true;

    // Load voices and user's default voice setting in parallel
    forkJoin({
      voicesResult: this.voicesService.getVoices(),
      settings: this.userService.userSettings(['defaultVoice']),
    }).subscribe({
      next: ({ voicesResult, settings }) => {
        this.voices = voicesResult.voices;
        this.loadingVoices = false;

        // Check if user has a saved default voice
        const defaultVoiceSetting = settings.find((s) => s.key === 'defaultVoice');
        if (defaultVoiceSetting?.value) {
          // Verify the saved voice still exists
          const savedVoice = this.voices.find((v) => v.uuid === defaultVoiceSetting.value);
          if (savedVoice) {
            this.selectedVoiceUuid = savedVoice.uuid;
            return;
          }
        }

        // No saved default or it doesn't exist — pick first Regular HD voice
        const regularHdVoice = this.voices.find((v) => voiceToTier(v) === VoiceTier.REGULAR_HD);
        if (regularHdVoice) {
          this.selectedVoiceUuid = regularHdVoice.uuid;
          // Save as user's default
          this.saveDefaultVoice(regularHdVoice.uuid);
        } else if (this.voices.length > 0) {
          // Fallback to first available voice
          this.selectedVoiceUuid = this.voices[0].uuid;
        }
      },
      error: () => {
        this.loadingVoices = false;
        // Continue without voice selection — backend will use its default
      },
    });
  }

  onVoiceChange(voiceUuid: string): void {
    this.selectedVoiceUuid = voiceUuid;
    this.saveDefaultVoice(voiceUuid);
  }

  private saveDefaultVoice(voiceUuid: string): void {
    this.userService.updateUserSetting('defaultVoice', voiceUuid).subscribe({
      // Silent save — don't interrupt user flow
      error: () => {
        // Ignore errors, voice selection still works locally
      },
    });
  }

  getVoiceTierLabel(voice: Voice): string {
    return tierToString(voiceToTier(voice));
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
