// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AffiliateService, AffiliateEligibility } from '../affiliate/affiliate.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-eligibility-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './eligibility-banner.component.html',
  styleUrls: ['./eligibility-banner.component.scss'],
})
export class EligibilityBannerComponent implements OnInit, OnDestroy {
  @Input() blockInteraction = false; // If true, overlays the content
  @Input() showPurchaseButton = true;

  private subscriptions = new Subscription();
  checking = true;
  eligibility: AffiliateEligibility | null = null;

  constructor(
    private affiliateService: AffiliateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.checkEligibility();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  checkEligibility(): void {
    this.checking = true;
    this.subscriptions.add(
      this.affiliateService.checkAffiliateProgramEligibility().subscribe({
        next: (eligibility) => {
          this.eligibility = eligibility;
          this.checking = false;
        },
        error: () => {
          this.checking = false;
          // Silently fail - user might not be in affiliate program
          this.eligibility = null;
        },
      }),
    );
  }

  onPurchase(): void {
    this.router.navigate(['/orders']);
  }

  get shouldDisplay(): boolean {
    return !this.checking && this.eligibility !== null && !this.eligibility.isEligible;
  }

  get requiresPurchase(): boolean {
    return this.eligibility !== null && !this.eligibility.hasPaidOrder;
  }
}
