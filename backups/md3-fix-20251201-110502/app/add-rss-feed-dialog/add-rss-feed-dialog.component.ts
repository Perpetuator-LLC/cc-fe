// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-add-rss-feed-dialog',
  standalone: true,
  imports: [
    MatDialogContent,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatDialogActions,
    MatButton,
    MatDialogTitle,
    MatLabel,
  ],
  templateUrl: './add-rss-feed-dialog.component.html',
  styleUrl: './add-rss-feed-dialog.component.scss',
})
export class AddRssFeedDialogComponent {
  rssFeedForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddRssFeedDialogComponent>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.rssFeedForm = this.fb.group({
      urls: ['', [Validators.required]],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    if (this.rssFeedForm.valid) {
      const urlsText = this.rssFeedForm.value.urls;
      // Parse URLs by splitting on whitespace and commas
      const urls = urlsText
        .split(/[\s,]+/)
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0)
        .map((url: string) => {
          // Add https:// if the URL doesn't start with http:// or https://
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
          }
          return url;
        });

      this.dialogRef.close({ urls });
    }
  }
}
