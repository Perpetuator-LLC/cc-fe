// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, debounceTime } from 'rxjs';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { UserService, UserPreferences } from '../../user/user.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { DialogDraftService } from '../../shared/services/dialog-draft.service';

interface PulseDraft {
  description: string;
  title: string;
  smsNotificationEnabled: boolean;
}

@Component({
  selector: 'app-create-pulse-dialog',
  standalone: true,
  imports: [
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatIconButton,
    MatLabel,
    MatError,
    MatHint,
    MatDialogModule,
    MatIcon,
    MatCheckbox,
    MatTooltip,
    RouterLink,
    A11yModule,
  ],
  templateUrl: './create-pulse-dialog.component.html',
  styleUrl: './create-pulse-dialog.component.scss',
})
export class CreatePulseDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly pulsesService = inject(PulsesService);
  private readonly userService = inject(UserService);
  readonly dialogRef = inject(MatDialogRef<CreatePulseDialogComponent>);
  private readonly router = inject(Router);
  private readonly draftService = inject(DialogDraftService);

  pulseForm: FormGroup;
  private subscriptions = new Subscription();
  isSubmitting = false;
  descriptionError: string | null = null;
  titleError: string | null = null;

  // Phone verification status for SMS toggle
  phoneVerified = false;
  phoneNumber: string | null = null;
  loadingPreferences = true;

  constructor() {
    // Prevent accidental close on backdrop click
    this.dialogRef.disableClose = true;

    this.pulseForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
      title: [''],
      smsNotificationEnabled: [false],
    });

    this.pulseForm.get('description')?.valueChanges.subscribe(() => {
      this.updateDescriptionValidation();
    });

    this.pulseForm.get('title')?.valueChanges.subscribe(() => {
      this.updateTitleValidation();
    });

    // Auto-save draft on changes (debounced)
    this.subscriptions.add(
      this.pulseForm.valueChanges.pipe(debounceTime(500)).subscribe(() => {
        this.saveDraft();
      }),
    );
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.loadUserPreferences();
    this.restoreDraft();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Restore any previously saved draft
   */
  private restoreDraft(): void {
    const savedData = this.draftService.loadDraft<PulseDraft>('pulse');
    if (savedData) {
      this.pulseForm.patchValue(savedData, { emitEvent: false });
      this.updateDescriptionValidation();
      this.updateTitleValidation();
    }
  }

  /**
   * Save current form state to localStorage
   */
  private saveDraft(): void {
    const formValue = this.pulseForm.getRawValue();
    this.draftService.saveDraft('pulse', formValue);
  }

  /**
   * Load user preferences to check phone verification status
   */
  private loadUserPreferences(): void {
    this.loadingPreferences = true;
    this.subscriptions.add(
      this.userService.getUserPreferences().subscribe({
        next: (preferences: UserPreferences) => {
          this.phoneNumber = preferences.sms.phoneNumber || null;
          this.phoneVerified = preferences.sms.isVerified || false;
          this.loadingPreferences = false;

          // Disable SMS toggle if phone not verified
          if (!this.phoneVerified) {
            this.pulseForm.get('smsNotificationEnabled')?.disable();
          }
        },
        error: () => {
          this.loadingPreferences = false;
          // Disable SMS toggle on error
          this.pulseForm.get('smsNotificationEnabled')?.disable();
        },
      }),
    );
  }

  private updateDescriptionValidation(): void {
    const errors = this.pulseForm.get('description')?.errors;
    if (errors) {
      if (errors['required']) {
        this.descriptionError = 'Description is required';
      } else if (errors['minlength']) {
        this.descriptionError = 'Description must be at least 10 characters';
      } else {
        this.descriptionError = 'Enter a valid description';
      }
    } else {
      this.descriptionError = null;
    }
  }

  private updateTitleValidation(): void {
    const errors = this.pulseForm.get('title')?.errors;
    if (errors) {
      this.titleError = 'Enter a valid title';
    } else {
      this.titleError = null;
    }
  }

  onSubmit(): void {
    if (this.pulseForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.pulseForm.getRawValue();

    this.subscriptions.add(
      this.pulsesService
        .generatePulseFromDescription({
          description: formValue.description,
          title: formValue.title || undefined,
          smsNotificationEnabled: formValue.smsNotificationEnabled || false,
        })
        .subscribe({
          next: (result) => {
            this.isSubmitting = false;
            this.messageService.success('Pulse generation started! You can track progress in the jobs panel.');
            // Clear draft on successful creation
            this.draftService.clearDraft('pulse');
            this.dialogRef.close({ jobUuid: result.job.uuid });
            // Navigate to jobs to track progress
            this.router.navigate(['/jobs']);
          },
          error: (err: Error) => {
            this.isSubmitting = false;
            this.messageService.error(`Failed to create pulse: ${err.message}`);
          },
        }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
