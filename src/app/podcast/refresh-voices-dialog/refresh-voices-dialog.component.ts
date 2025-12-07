// Copyright (c) 2025 Perpetuator LLC

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VoicesService, VoiceTier, tierToString } from '../voices.service'; // Import necessary items
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-refresh-voices-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './refresh-voices-dialog.component.html',
  styleUrl: './refresh-voices-dialog.component.scss',
})
export class RefreshVoicesDialogComponent /*implements OnInit*/ {
  refreshForm: FormGroup;
  voiceTiers = Object.values(VoiceTier); // Use VoiceTier enum
  loading = false;
  tierToString = tierToString; // Make helper function available in template

  // Map VoiceTier enum values to VoiceModel strings expected by the backend
  private tierToModelMap: Record<VoiceTier, string> = {
    [VoiceTier.PREMIUM_HD]: 'ELEVENLABS_MULTILINGUAL_V2',
    [VoiceTier.PREMIUM]: 'ELEVENLABS_FLASH_V2_5',
    [VoiceTier.REGULAR_HD]: 'OPENAI_TTS_1_HD',
    [VoiceTier.REGULAR]: 'OPENAI_TTS_1',
    [VoiceTier.REGULAR_LD]: 'OPENAI_GPT_4O_MINI_TTS',
  };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RefreshVoicesDialogComponent>,
    private voicesService: VoicesService,
    private messageService: MessageService, // Inject MessageService
  ) {
    this.refreshForm = this.fb.group({
      forceMetadata: [false],
      forceSampleAudio: [false],
      models: [[]], // Use tiers for selection, will map later
      externalIds: [''], // Textarea input
    });
  }

  // ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onRefresh(): void {
    if (this.refreshForm.invalid) {
      return;
    }
    this.loading = true;

    const formValue = this.refreshForm.value;

    // Map selected tiers (enum values) to model strings
    const selectedModels = (formValue.models as VoiceTier[]).map((tier) => this.tierToModelMap[tier]);

    // Parse externalIds string into an array, trimming whitespace and filtering empty strings
    const externalIds = formValue.externalIds
      ? formValue.externalIds
          .split(/[\n,]+/) // Split by newline or comma
          .map((id: string) => id.trim())
          .filter((id: string) => id) // Remove empty strings
      : null; // Pass null if textarea is empty

    this.voicesService
      .refreshVoices(
        formValue.forceMetadata,
        formValue.forceSampleAudio,
        selectedModels.length > 0 ? selectedModels : undefined, // Pass undefined if empty
        externalIds,
      )
      .subscribe({
        next: (result) => {
          this.loading = false;
          if (result.success) {
            this.dialogRef.close(result); // Close with success result
          } else {
            // Show error message but keep dialog open for correction
            this.messageService.error(result.message || 'Failed to refresh voices.');
          }
        },
        error: (err) => {
          this.loading = false;
          this.messageService.error(`Error refreshing voices: ${err.message}`);
          // Optionally close with an error indicator: this.dialogRef.close({ success: false, message: err.message });
        },
      });
  }
}
