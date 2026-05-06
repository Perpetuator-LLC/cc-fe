// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-delete-podcast-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './delete-podcast-dialog.component.html',
  styleUrls: ['./delete-podcast-dialog.component.scss'],
})
export class DeletePodcastDialogComponent {
  dialogRef = inject<MatDialogRef<DeletePodcastDialogComponent>>(MatDialogRef);
  data = inject<{
    podcastName: string;
  }>(MAT_DIALOG_DATA);

  deleteConfirmation = '';
  podcastName: string;

  constructor() {
    const data = this.data;

    this.podcastName = data.podcastName;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    if (this.deleteConfirmation === this.podcastName) {
      this.dialogRef.close(this.deleteConfirmation);
    }
  }
}
