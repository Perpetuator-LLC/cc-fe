// Copyright (c) 2026 Perpetuator LLC
import { Component, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { AlertType } from '../pulses.types';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

export interface AddAlertTriggerDialogData {
  pulseConfigUuid: string;
}

@Component({
  selector: 'app-add-alert-trigger-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatSelect,
    MatOption,
    MatDialogModule,
    MatIcon,
    MatChipsModule,
  ],
  templateUrl: './add-alert-trigger-dialog.component.html',
  styleUrl: './add-alert-trigger-dialog.component.scss',
})
export class AddAlertTriggerDialogComponent implements OnDestroy {
  alertForm: FormGroup;
  private subscriptions = new Subscription();
  isSubmitting = false;

  // Keywords for breaking news
  keywords: string[] = [];
  readonly separatorKeyCodes = [ENTER, COMMA] as const;

  alertTypes: { value: AlertType; label: string; icon: string; available: boolean }[] = [
    { value: 'breaking_news', label: 'Breaking News', icon: 'breaking_news', available: true },
    { value: 'price_alert', label: 'Price Alert', icon: 'trending_up', available: false },
    { value: 'earnings', label: 'Earnings', icon: 'attach_money', available: false },
    { value: 'sec_filing', label: 'SEC Filing', icon: 'description', available: false },
    { value: 'indicator_alert', label: 'Indicator Alert', icon: 'analytics', available: false },
    { value: 'fundamental_alert', label: 'Fundamental Alert', icon: 'assessment', available: false },
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private pulsesService: PulsesService,
    public dialogRef: MatDialogRef<AddAlertTriggerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddAlertTriggerDialogData,
  ) {
    this.alertForm = this.fb.group({
      alertType: ['breaking_news', Validators.required],
      cooldownMinutes: [30, [Validators.min(5), Validators.max(1440)]],
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get selectedType(): AlertType {
    return this.alertForm.get('alertType')?.value;
  }

  addKeyword(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.keywords.includes(value)) {
      this.keywords.push(value);
    }
    event.chipInput.clear();
  }

  removeKeyword(keyword: string): void {
    const index = this.keywords.indexOf(keyword);
    if (index >= 0) {
      this.keywords.splice(index, 1);
    }
  }

  onSubmit(): void {
    if (this.alertForm.invalid || this.isSubmitting) {
      return;
    }

    // Validate keywords for breaking_news type
    if (this.selectedType === 'breaking_news' && this.keywords.length === 0) {
      this.messageService.error('Please add at least one keyword');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.alertForm.value;

    const trigger: {
      alertType: AlertType;
      keywords?: string[];
      cooldownMinutes: number;
    } = {
      alertType: formValue.alertType,
      cooldownMinutes: formValue.cooldownMinutes,
    };

    if (formValue.alertType === 'breaking_news') {
      trigger.keywords = this.keywords;
    }

    this.subscriptions.add(
      this.pulsesService.addAlertTrigger(this.data.pulseConfigUuid, trigger).subscribe({
        next: (result) => {
          this.isSubmitting = false;
          this.messageService.success('Alert trigger added');
          this.dialogRef.close(result.alertTrigger);
        },
        error: (err: Error) => {
          this.isSubmitting = false;
          this.messageService.error(`Failed to add alert trigger: ${err.message}`);
        },
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
