// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-delete-team-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './delete-team-dialog.component.html',
  styleUrls: ['./delete-team-dialog.component.scss'],
})
export class DeleteTeamDialogComponent {
  dialogRef = inject<MatDialogRef<DeleteTeamDialogComponent>>(MatDialogRef);
  data = inject<{
    teamName: string;
  }>(MAT_DIALOG_DATA);

  deleteConfirmation = '';
  teamName: string;

  constructor() {
    const data = this.data;

    this.teamName = data.teamName;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    if (this.deleteConfirmation === this.teamName) {
      this.dialogRef.close(true);
    }
  }
}
