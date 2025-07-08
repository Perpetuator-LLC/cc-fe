// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from './message.service';
import { TeamsService } from './teams.service';

@Component({
  selector: 'app-export-personal-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="export-dialog">
      <h2 mat-dialog-title>Export Personal Data</h2>
      <mat-dialog-content>
        <div class="danger-zone">
          <p>Are you sure you want to export all your personal data? Please confirm by entering your password.</p>
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
        <button class="export-btn" mat-flat-button color="primary" (click)="onExport()">Export</button>
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
      .export-btn {
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--primary, #1976d2);
        color: white;
      }
    `,
  ],
})
export class ExportPersonalDialogComponent {
  exportConfirmation = '';
  password: string;
  private subscriptions = new Subscription();
  private downloadAnchor: HTMLAnchorElement | null = null;

  constructor(
    public dialogRef: MatDialogRef<ExportPersonalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { password: string },
    @Inject(TeamsService) public teamService: TeamsService,
    @Inject(MessageService) public messageService: MessageService,
  ) {
    this.password = data.password;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onExport(): void {
    // if (this.exportConfirmation === this.password) {
    //   this.dialogRef.close(true);
    // }
    this.subscriptions.add(
      this.teamService.getUserDataExport(this.exportConfirmation).subscribe({
        next: (data) => {
          this.dialogRef.close(true);
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          this.downloadAnchor = document.createElement('a');
          this.downloadAnchor.setAttribute('href', url);
          this.downloadAnchor.href = url;
          this.downloadAnchor.download = 'capital_copilot_account_data.json';
          document.body.appendChild(this.downloadAnchor);
          this.downloadAnchor.click();
        },
        error: (err) => {
          this.dialogRef.close(false);
          this.messageService.error('Failed to export user data: ' + err.message);
        },
      }),
    );
  }
}
