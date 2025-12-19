// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AffiliateService, AffiliateLanding } from '../affiliate.service';
import { AffiliateStorageService } from '../affiliate-storage.service';
import { AuthService } from '../../auth/auth.service';
import { MessageService } from '../../message.service';
import { TraceService } from '../../traces/trace.service';
import { SeoService } from '../../seo.service';
import { environment } from '../../../environments/environment';

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
  affiliateData: AffiliateLanding | null = null;
  error: string | null = null;
  isAuthenticated = false;
  hasExistingAffiliate = false;
  existingAffiliateUsername = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private affiliateService: AffiliateService,
    private affiliateStorageService: AffiliateStorageService,
    private authService: AuthService,
    private messageService: MessageService,
    private traceService: TraceService,
    private seoService: SeoService,
  ) {
    // Check for resolved data (from SSR resolver)
    const resolvedData = this.route.snapshot.data['affiliateData'] as AffiliateLanding | null;
    if (resolvedData) {
      this.affiliateData = resolvedData;
      this.loading = false;
      const code = this.route.snapshot.paramMap.get('code');
      if (code) {
        this.updateSeoTags(code);
      }
    }
  }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isLoggedIn();

    const code = this.route.snapshot.paramMap.get('code');
    if (!code) {
      this.error = 'Invalid affiliate code';
      this.loading = false;
      return;
    }

    this.affiliateStorageService.setAffiliateCode(code);

    // If we already have data from resolver, just check existing affiliate
    if (this.affiliateData) {
      if (this.isAuthenticated) {
        this.checkExistingAffiliate();
      }
      return;
    }

    // Fallback: fetch data if resolver didn't provide it (client-side navigation)
    this.subscriptions.add(
      this.affiliateService.getAffiliateLanding(code).subscribe({
        next: (data) => {
          this.affiliateData = data;
          this.loading = false;
          this.updateSeoTags(code);

          if (this.isAuthenticated) {
            this.checkExistingAffiliate();
          }
        },
        error: (err) => {
          this.error = 'Invalid or inactive affiliate code';
          this.loading = false;

          // Record trace for GraphQL error
          this.traceService.trackGraphQLError('getAffiliateLanding', err, { affiliateCode: code }).subscribe();
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
    this.router.navigate(['/register'], { queryParams: { ref: this.affiliateData?.affiliateCode } });
  }

  onSignIn(): void {
    this.router.navigate(['/login'], { queryParams: { ref: this.affiliateData?.affiliateCode } });
  }

  onJoinNetwork(): void {
    if (!this.affiliateData) return;

    this.loading = true;
    this.messageService.clearMessages();

    this.subscriptions.add(
      this.affiliateService.joinAffiliateProgram(this.affiliateData.affiliateCode).subscribe({
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
    if (!this.affiliateData?.brandImageUrl) return null;
    return this.affiliateData.brandImageUrl;
  }

  private updateSeoTags(code: string): void {
    if (!this.affiliateData) return;

    const shareUrl = `${environment.SITE_URL}/a/${code}`;
    const title = `Join ${this.affiliateData.affiliateUsername}'s Network | Capital Copilot`;
    const description =
      `Start your journey with Capital Copilot and become part of ` +
      `${this.affiliateData.affiliateUsername}'s affiliate network.`;

    this.seoService.updateTags({
      title,
      description,
      image: this.affiliateData.brandImageUrl || undefined,
      url: shareUrl,
      type: 'website',
      twitterCard: 'summary_large_image',
    });
  }
}
