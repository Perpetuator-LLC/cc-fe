// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terms-and-conditions-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      Terms and Conditions <button mat-button (click)="close()"><mat-icon>close</mat-icon></button>
    </h2>
    <mat-dialog-content>
      <div class="privacy-policy-modal-content" style="max-height: 60vh; overflow: auto;">
        <div *ngIf="termsHtml" [innerHTML]="termsHtml"></div>
      </div>
    </mat-dialog-content>
  `,
})
export class TermsAndConditionsModalComponent {
  termsHtml = '';
  constructor(private dialogRef: MatDialogRef<TermsAndConditionsModalComponent>) {
    fetch('/terms-and-conditions.html')
      .then((res) => res.text())
      .then((html) => (this.termsHtml = html));
  }
  close() {
    this.dialogRef.close();
  }
}
