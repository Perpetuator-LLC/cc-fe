// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { AffiliateService } from '../../affiliate/affiliate.service';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-stripe-onboarding-return',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule, MatCardModule, MatButtonModule],
  templateUrl: './stripe-onboarding-return.component.html',
  styleUrls: ['./stripe-onboarding-return.component.scss'],
})
export class StripeOnboardingReturnComponent implements OnInit, OnDestroy {
  private affiliateService = inject(AffiliateService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  private subscriptions = new Subscription();
  loading = true;
  success = false;
  error: string | null = null;
  onboardingCompleted = false;

  ngOnInit(): void {
    this.refreshStripeStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  refreshStripeStatus(): void {
    this.loading = true;
    this.error = null;

    this.subscriptions.add(
      this.affiliateService.refreshStripeAccountStatus().subscribe({
        next: (response) => {
          this.loading = false;
          this.success = true;
          this.onboardingCompleted = response.affiliateProfile?.stripeOnboardingCompleted ?? false;

          if (this.onboardingCompleted) {
            this.messageService.success('Stripe account setup completed successfully!');
            // Navigate to dashboard after short delay
            setTimeout(() => {
              this.router.navigate(['/affiliate']);
            }, 2000);
          } else {
            this.error = 'Stripe onboarding is not yet complete. Please finish the setup process.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.success = false;
          this.error = err.message || 'Failed to verify Stripe account status';
          if (this.error) {
            this.messageService.error(this.error);
          }
        },
      }),
    );
  }

  navigateToDashboard(): void {
    this.router.navigate(['/affiliate']);
  }

  retryOnboarding(): void {
    this.loading = true;
    this.subscriptions.add(
      this.affiliateService.createStripeConnectAccount().subscribe({
        next: (response) => {
          if (response.onboardingUrl) {
            window.location.href = response.onboardingUrl;
          } else {
            this.loading = false;
            this.error = 'Unable to restart onboarding. Please contact support.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.message || 'Failed to restart onboarding';
        },
      }),
    );
  }

  skipSetup(): void {
    this.router.navigate(['/']);
  }
}
