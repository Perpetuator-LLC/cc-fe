// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-delete-account-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './delete-account-dialog.component.html',
  styleUrl: './delete-account-dialog.component.scss',
})
export class DeleteAccountDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<DeleteAccountDialogComponent>>(MatDialogRef);
  private readonly data = inject<{ email: string }>(MAT_DIALOG_DATA);

  deleteConfirmation = '';
  email: string;

  constructor() {
    const data = this.data;

    this.email = data.email;
  }

  get placeholderText(): string {
    return `Type email '${this.email}' to confirm`;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    if (this.deleteConfirmation === this.email) {
      this.dialogRef.close(this.deleteConfirmation);
    }
  }
}
