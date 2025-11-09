// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { AffiliateService, AffiliateEligibility } from '../affiliate.service';
import { MessageService } from '../message.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-affiliate-terms-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './affiliate-terms-dialog.component.html',
  styleUrls: ['./affiliate-terms-dialog.component.scss'],
})
export class AffiliateTermsDialogComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  loading = false;
  checkingEligibility = true;
  eligibility: AffiliateEligibility | null = null;

  constructor(
    private dialogRef: MatDialogRef<AffiliateTermsDialogComponent>,
    private affiliateService: AffiliateService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.checkEligibility();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  checkEligibility(): void {
    this.checkingEligibility = true;
    this.subscriptions.add(
      this.affiliateService.checkAffiliateProgramEligibility().subscribe({
        next: (eligibility) => {
          this.eligibility = eligibility;
          this.checkingEligibility = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to check eligibility: ${err.message || 'Unknown error'}`);
          this.checkingEligibility = false;
          this.eligibility = {
            isEligible: false,
            reason: 'Unable to verify eligibility at this time',
            hasPaidOrder: false,
          };
        },
      }),
    );
  }

  onPurchase(): void {
    this.dialogRef.close(false);
    this.router.navigate(['/purchase']);
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
