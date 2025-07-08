// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
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
  template: `
    <div class="delete-dialog">
      <h2 mat-dialog-title>Permanently remove your account</h2>
      <mat-dialog-content>
        <div class="danger-zone">
          <p>
            Username is publicly visible, do not use personally identifying information in it. Username is publicly
            visible, do not use personally identifying information in it.
          </p>
          <div class="action-row">
            <mat-form-field appearance="fill" style="width:100%">
              <mat-label>Delete Confirmation</mat-label>
              <input
                matInput
                [placeholder]="'Type email \\'' + email + '\\' to confirm'"
                [(ngModel)]="deleteConfirmation"
              />
            </mat-form-field>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="cancel-btn" mat-button (click)="onCancel()">Cancel</button>
        <button
          class="delete-btn"
          mat-flat-button
          color="warn"
          (click)="onDelete()"
          [disabled]="deleteConfirmation !== email"
        >
          Delete Account
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
        border-radius: 10px;
        color: var(--theme-color);
        font-weight: 500;
      }
      .delete-btn {
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: #ff4a4a !important;
        color: white !important;
      }
    `,
  ],
})
export class DeleteAccountDialogComponent {
  deleteConfirmation = '';
  email: string;

  constructor(
    public dialogRef: MatDialogRef<DeleteAccountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string },
  ) {
    this.email = data.email;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    if (this.deleteConfirmation === this.email) {
      this.dialogRef.close(true);
    }
  }
}
