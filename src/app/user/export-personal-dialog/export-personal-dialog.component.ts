// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from '../../message.service';
import { TeamsService } from '../../team/teams.service';

@Component({
  selector: 'app-export-personal-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './export-personal-dialog.component.html',
  styleUrls: ['./export-personal-dialog.component.scss'],
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
