// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
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
  deleteConfirmation = '';
  teamName: string;

  constructor(
    public dialogRef: MatDialogRef<DeleteTeamDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { teamName: string },
  ) {
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
