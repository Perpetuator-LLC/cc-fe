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
  template: `
    <div class="delete-dialog">
      <h2 mat-dialog-title>Delete {{ teamName }}</h2>
      <mat-dialog-content>
        <div class="danger-zone">
          <p>Are you sure you want to delete this team? This action is irreversible.</p>
          <div class="action-row">
            <mat-form-field appearance="fill" style="width:100%">
              <mat-label>Delete Confirmation</mat-label>
              <input
                matInput
                [placeholder]="'Type team name \\'' + teamName + '\\' to confirm'"
                [(ngModel)]="deleteConfirmation"
              />
            </mat-form-field>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="cancel-btn" mat-button (click)="onCancel()">Cancel</button>
        <button
          class="savePodcastBtn"
          mat-flat-button
          color="primary"
          (click)="onDelete()"
          [disabled]="deleteConfirmation !== teamName"
        >
          Delete Team
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .delete-dialog {
        padding: 28px;
      }
      .delete-dialog .mat-mdc-dialog-title {
        padding: 0;
        font-size: 18px;
      }
      .delete-dialog .mat-mdc-dialog-title::before {
        display: none;
      }
      .mat-mdc-dialog-content {
        padding: 0;
        color: var(--description-color);
      }
      .mat-mdc-dialog-content p {
        margin-top: 0;
      }
      .action-row {
        margin-top: 20px;
      }
      mat-dialog-actions {
        padding: 20px 0 0;
      }
      .cancel-btn {
        background: var(--secondary-light);
        border: 1px solid var(--border-color);
        color: var(--theme-color);
        border-radius: 10px;
        width: 88px;
        height: 40px;
      }
      .savePodcastBtn {
        background: #ffffff;
        border-radius: 10px;
        color: var(--toolbar-container-background-color);
        width: 225px;
        font-size: 14px;
        font-weight: 600;
        height: 40px;
      }
    `,
  ],
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
