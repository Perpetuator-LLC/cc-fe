// Copyright (c) 2025 Perpetuator LLC

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-add-voice-dialog',
  templateUrl: './add-voice-dialog.component.html',
  styleUrls: ['./add-voice-dialog.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
})
export class AddVoiceDialogComponent {
  voiceForm: FormGroup;
  displayNameRequired = false;
  externalIdRequired = false;
  modelRequired = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddVoiceDialogComponent>,
  ) {
    this.voiceForm = this.fb.group({
      externalId: ['21m00Tcm4TlvDq8ikWAM', Validators.required],
      externalUserId: '63e06b7e7cafdc46be4d2e0b3f045940231ae058d508589653d74d1265a574ca',
      displayName: [{ value: 'Rachel Smith', disabled: true }],
      model: ['ELEVENLABS_FLASH_V2_5', Validators.required],
    });

    this.voiceForm.get('externalUserId')?.valueChanges.subscribe((value) => {
      const displayNameControl = this.voiceForm.get('displayName');

      if (value) {
        displayNameControl?.enable();
        displayNameControl?.setValidators(Validators.required);
      } else {
        displayNameControl?.disable();
        displayNameControl?.clearValidators();
      }

      displayNameControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.voiceForm.valid) {
      this.dialogRef.close(this.voiceForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get externalIdControl() {
    return this.voiceForm.get('externalId');
  }
  // get externalUserIdControl() {
  //   return this.voiceForm.get('externalUserId');
  // }
  // get displayNameControl() {
  //   return this.voiceForm.get('displayName');
  // }
  get modelControl() {
    return this.voiceForm.get('model');
  }

  // get externalIdRequired() {
  //   return this.externalIdControl?.hasError('required');
  // }
  // // get externalUserIdRequired() {
  // //   return this.externalUserIdControl?.hasError('required');
  // // }
  // get modelRequired() {
  //   return this.modelControl?.hasError('required');
  // }
}
