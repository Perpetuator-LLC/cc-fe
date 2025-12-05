// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AffiliateHttpService, AffiliateLandingData } from '../affiliate-http.service';
import { AffiliateService } from '../affiliate.service';
import { AffiliateStorageService } from '../affiliate-storage.service';
import { AuthService } from '../../core/auth.service';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-affiliate-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './affiliate-landing.component.html',
  styleUrls: ['./affiliate-landing.component.scss'],
})
export class AffiliateLandingComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  loading = true;
  affiliateData: AffiliateLandingData | null = null;
  error: string | null = null;
  isAuthenticated = false;
  hasExistingAffiliate = false;
  existingAffiliateUsername = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private affiliateHttpService: AffiliateHttpService,
    private affiliateService: AffiliateService,
    private affiliateStorageService: AffiliateStorageService,
    private authService: AuthService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isLoggedIn();

    const code = this.route.snapshot.paramMap.get('code');
    if (!code) {
      this.error = 'Invalid affiliate code';
      this.loading = false;
      return;
    }

    this.affiliateStorageService.setAffiliateCode(code);

    this.subscriptions.add(
      this.affiliateHttpService.getAffiliateLanding(code).subscribe({
        next: (data) => {
          this.affiliateData = data;
          this.loading = false;

          if (this.isAuthenticated) {
            this.checkExistingAffiliate();
          }
        },
        error: (err) => {
          this.error = 'Invalid or inactive affiliate code';
          this.loading = false;
          console.error('Error loading affiliate data:', err);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  checkExistingAffiliate(): void {
    if (!this.isAuthenticated) {
      return;
    }

    this.subscriptions.add(
      this.affiliateService.getMyAffiliateRelationship().subscribe({
        next: (relationship) => {
          if (relationship) {
            this.hasExistingAffiliate = true;
            this.existingAffiliateUsername = relationship.affiliate.username;
          }
        },
        error: () => {
          // Silently fail - this is not critical for viewing the landing page
          // User may have an expired token, which is fine on this public page
        },
      }),
    );
  }

  onSignUp(): void {
    this.router.navigate(['/register'], { queryParams: { ref: this.affiliateData?.affiliate_code } });
  }

  onSignIn(): void {
    this.router.navigate(['/login'], { queryParams: { ref: this.affiliateData?.affiliate_code } });
  }

  onJoinNetwork(): void {
    if (!this.affiliateData) return;

    this.loading = true;
    this.messageService.clearMessages();

    this.subscriptions.add(
      this.affiliateService.joinAffiliateProgram(this.affiliateData.affiliate_code).subscribe({
        next: (response) => {
          this.messageService.success(
            `You've joined ${response.relationship?.affiliate.username}'s affiliate network!`,
          );
          this.affiliateStorageService.clearAffiliateCode();
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, 2000);
        },
        error: (err) => {
          this.messageService.error(`Failed to join network: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  getBrandImageUrl(): string | null {
    if (!this.affiliateData?.brand_image_url) return null;
    return this.affiliateData.brand_image_url;
  }
}
