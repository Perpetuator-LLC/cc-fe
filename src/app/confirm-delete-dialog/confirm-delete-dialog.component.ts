// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDeleteDialogData {
  title: string;
  message: string;
  confirmButtonText?: string;
  confirmButtonColor?: 'primary' | 'accent' | 'warn';
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
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button [color]="data.confirmButtonColor || 'warn'" (click)="onConfirm()">
        {{ data.confirmButtonText || 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-actions {
        gap: 8px;
        padding: 16px 24px;
      }

      mat-dialog-content {
        padding: 0 24px 20px;
      }

      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 16px;
      }

      p {
        margin: 0;
        line-height: 1.5;
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
