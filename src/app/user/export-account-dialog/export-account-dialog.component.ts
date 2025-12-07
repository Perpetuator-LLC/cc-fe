// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-export-account-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './export-account-dialog.component.html',
  styleUrls: ['./export-account-dialog.component.scss'],
})
export class ExportAccountDialogComponent {
  exportConfirmation = '';

  constructor(
    public dialogRef: MatDialogRef<ExportAccountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: unknown,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onExport(): void {
    this.dialogRef.close(this.exportConfirmation);
  }
}
