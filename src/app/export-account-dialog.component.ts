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
  template: `
    <div class="export-dialog">
      <h2 mat-dialog-title>Delete Account</h2>
      <mat-dialog-content>
        <div class="danger-zone">
          <p>Are you sure you want to export all of your personal data?</p>
          <div class="action-row">
            <mat-form-field appearance="fill" style="width:100%">
              <mat-label>Export Confirmation</mat-label>
              <input
                matInput
                type="password"
                autocomplete="current-password"
                placeholder="Type password to confirm export"
                [(ngModel)]="exportConfirmation"
              />
            </mat-form-field>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="cancel-btn" mat-button (click)="onCancel()">Cancel</button>
        <button class="delete-btn" mat-flat-button color="warn" (click)="onExport()" [disabled]!="exportConfirmation">
          Delete Account
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .export-dialog {
        padding: 28px;
      }
      .export-dialog .mat-mdc-dialog-title {
        padding: 0;
        font-size: 18px;
      }
      .export-dialog .mat-mdc-dialog-title::before {
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
        background: #ff4a4a;
        color: white;
      }
    `,
  ],
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
