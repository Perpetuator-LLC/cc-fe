// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AffiliateService } from '../affiliate.service';
import { MessageService } from '../message.service';

@Component({
  selector: 'app-affiliate-terms-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './affiliate-terms-dialog.component.html',
  styleUrls: ['./affiliate-terms-dialog.component.scss'],
})
export class AffiliateTermsDialogComponent implements OnDestroy {
  private subscriptions = new Subscription();
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<AffiliateTermsDialogComponent>,
    private affiliateService: AffiliateService,
    private messageService: MessageService,
  ) {}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onAccept(): void {
    this.loading = true;
    this.messageService.clearMessages();

    this.subscriptions.add(
      this.affiliateService.acceptAffiliateTerms('1.0').subscribe({
        next: () => {
          this.messageService.success('Affiliate terms accepted successfully!');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.messageService.error(`Failed to accept terms: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  onDecline(): void {
    this.dialogRef.close(false);
  }
}
