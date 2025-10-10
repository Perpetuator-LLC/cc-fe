// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDeleteDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="cancel-btn" mat-button (click)="onCancel()">Cancel</button>
      <button class="deletePodcastBtn" mat-flat-button color="warn" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-actions {
        gap: 8px;
      }
      .cancel-btn {
        background: var(--secondary-light);
        border: 1px solid var(--border-color);
        color: var(--theme-color);
        border-radius: 10px;
        width: 88px;
        height: 40px;
      }
      .deletePodcastBtn {
        background: #ff4a4a;
        border: 1px solid var(--border-color);
        border-radius: 10px;
        color: white;
        width: 225px;
        font-size: 14px;
        font-weight: 600;
        height: 40px;
      }
    `,
  ],
})
export class ConfirmDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
