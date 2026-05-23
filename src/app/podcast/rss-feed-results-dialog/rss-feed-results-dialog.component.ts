// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CommonModule } from '@angular/common';

export interface RssFeedResults {
  successful: string[];
  failed: { url: string; error: string }[];
}

@Component({
  selector: 'app-rss-feed-results-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
  ],
  templateUrl: './rss-feed-results-dialog.component.html',
  styleUrl: './rss-feed-results-dialog.component.scss',
})
export class RssFeedResultsDialogComponent {
  private dialogRef = inject<MatDialogRef<RssFeedResultsDialogComponent>>(MatDialogRef);
  data = inject<RssFeedResults>(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close();
  }

  get successfulText(): string {
    return this.data.successful.join('\n');
  }

  get failedText(): string {
    return this.data.failed.map((f) => `${f.url} - ${f.error}`).join('\n');
  }
}
