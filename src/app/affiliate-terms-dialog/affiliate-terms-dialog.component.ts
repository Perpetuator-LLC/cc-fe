// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AffiliateService, AffiliateEligibility } from '../affiliate.service';
import { MessageService } from '../message.service';
import { PolicyService, PolicyVersion } from '../policy/services/policy.service';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

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
  policy: PolicyVersion | null = null;
  policyContent: SafeHtml | null = null;
  loadingPolicy = true;

  constructor(
    private dialogRef: MatDialogRef<AffiliateTermsDialogComponent>,
    private affiliateService: AffiliateService,
    private messageService: MessageService,
    private policyService: PolicyService,
    private router: Router,
    private authService: AuthService,
  ) {
    // Close dialog if user logs out - use effect to monitor signal
    effect(
      () => {
        const isLoggedIn = this.authService.isLoggedIn();
        if (!isLoggedIn) {
          // User logged out, close the dialog
          this.dialogRef.close(false);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    this.checkEligibility();
    this.loadPolicy();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPolicy(): void {
    this.loadingPolicy = true;
    this.subscriptions.add(
      this.policyService.getActivePolicies().subscribe({
        next: (policies) => {
          this.policy = policies.affiliateTerms;
          if (this.policy) {
            this.policyContent = this.policyService.renderPolicyContent(this.policy);
          }
          this.loadingPolicy = false;
        },
        error: (err) => {
          console.error('Failed to load affiliate terms:', err);
          this.loadingPolicy = false;
        },
      }),
    );
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
    this.router.navigate(['/orders']);
  }

  onAccept(): void {
    // Check if policy is loaded
    if (!this.policy || !this.policy.id) {
      this.messageService.error('Policy not loaded. Please try again.');
      return;
    }

    this.loading = true;
    this.messageService.clearMessages();

    // Use the new acceptPolicy mutation with the policy ID
    this.subscriptions.add(
      this.policyService.acceptPolicy(this.policy.id).subscribe({
        next: () => {
          this.messageService.success('Affiliate terms accepted successfully!');
          // After accepting terms, create Stripe Connect account
          this.createStripeAccount();
        },
        error: (err) => {
          this.messageService.error(`Failed to accept terms: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  createStripeAccount(): void {
    this.subscriptions.add(
      this.affiliateService.createStripeConnectAccount().subscribe({
        next: (response) => {
          if (response.onboardingUrl) {
            // Redirect to Stripe onboarding
            window.location.href = response.onboardingUrl;
          } else {
            // If no URL, something went wrong but accept was successful
            this.messageService.warning('Stripe setup incomplete. Please complete setup from your dashboard.');
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to setup payment account: ${err.message}`);
          this.loading = false;
          // Still close dialog as terms were accepted
          this.dialogRef.close(true);
        },
      }),
    );
  }

  onDecline(): void {
    this.dialogRef.close(false);
  }
}
