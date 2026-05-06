// Copyright (c) 2026 Perpetuator LLC

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

export interface RegenerateImageDialogResult {
  customPromptHint?: string;
}

@Component({
  selector: 'app-regenerate-image-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './regenerate-image-dialog.component.html',
  styleUrl: './regenerate-image-dialog.component.scss',
})
export class RegenerateImageDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<RegenerateImageDialogComponent, RegenerateImageDialogResult>>(MatDialogRef);

  form: FormGroup;

  readonly styleSuggestions = ['minimalist', 'vintage', 'modern', 'tech-inspired', 'bold colors', 'abstract'];

  constructor() {
    this.form = this.fb.group({
      customPromptHint: [''],
    });
  }

  addStyleSuggestion(style: string): void {
    const currentValue = this.form.get('customPromptHint')?.value || '';
    const newValue = currentValue ? `${currentValue}, ${style}` : style;
    this.form.get('customPromptHint')?.setValue(newValue);
  }

  onSubmit(): void {
    const customPromptHint = this.form.get('customPromptHint')?.value?.trim();
    this.dialogRef.close({ customPromptHint: customPromptHint || undefined });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
