// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { DeliveryMethod, ScheduleFrequency } from '../pulses.types';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-pulse-dialog',
  standalone: true,
  imports: [
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,
    MatError,
    MatSelect,
    MatOption,
    MatDialogModule,
    MatIcon,
    MatSliderModule,
  ],
  templateUrl: './create-pulse-dialog.component.html',
  styleUrl: './create-pulse-dialog.component.scss',
})
export class CreatePulseDialogComponent implements OnInit, OnDestroy {
  pulseForm: FormGroup;
  private subscriptions = new Subscription();
  isSubmitting = false;

  // Options for dropdowns
  toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
  ];

  deliveryOptions: { value: DeliveryMethod; label: string }[] = [
    { value: 'in_app', label: 'In-App Only' },
    { value: 'email_link', label: 'Email' },
    { value: 'sms_link', label: 'SMS (requires verified phone)' },
  ];

  scheduleOptions: { value: ScheduleFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'once', label: 'One-time' },
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private pulsesService: PulsesService,
    public dialogRef: MatDialogRef<CreatePulseDialogComponent>,
    private router: Router,
  ) {
    this.pulseForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: [''],
      targetDurationMinutes: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      tone: ['professional', Validators.required],
      deliveryMethod: ['in_app', Validators.required],
      scheduleFrequency: ['daily', Validators.required],
      scheduleTime: ['07:00'],
    });
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSubmit(): void {
    if (this.pulseForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.pulseForm.value;

    this.subscriptions.add(
      this.pulsesService
        .createPulseConfig({
          name: formValue.name,
          description: formValue.description || undefined,
          targetDurationMinutes: formValue.targetDurationMinutes,
          tone: formValue.tone,
          deliveryMethod: formValue.deliveryMethod,
          scheduleFrequency: formValue.scheduleFrequency,
          scheduleTime: formValue.scheduleTime,
        })
        .subscribe({
          next: (result) => {
            this.isSubmitting = false;
            this.messageService.success('Pulse configuration created successfully!');
            this.dialogRef.close(result.pulseConfig);
            // Navigate to the new pulse config for editing
            this.router.navigate(['/media/pulses', result.pulseConfig.uuid]);
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

  formatDuration(value: number): string {
    return `${value} min`;
  }

  /**
   * Calculate target words based on duration.
   * Uses default 150 WPM since voice isn't selected during creation.
   * Actual WPM will be recalculated when voice is set.
   */
  getTargetWords(): number {
    const minutes = this.pulseForm.get('targetDurationMinutes')?.value || 0;
    return minutes * 150; // Default WPM
  }
}
