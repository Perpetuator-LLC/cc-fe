// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import {
  AffiliateService,
  AffiliateProfile,
  AffiliateStats,
  AffiliateCredit,
  AffiliateConversion,
  AffiliateCodeChangeRequest,
  AffiliateEligibility,
  AffiliateConversionUtils,
} from '../affiliate.service';
import { MessageService } from '../../message.service';
import { UserService } from '../../user/user.service';
// eslint-disable-next-line max-len
import { PolicyAcceptanceDialogComponent } from '../../policy/dialogs/policy-acceptance-dialog/policy-acceptance-dialog.component';
import { PolicyService, ActivePoliciesResult } from '../../policy/services/policy.service';
import { ConvertCreditsDialogComponent } from '../../finance/convert-credits-dialog/convert-credits-dialog.component';
// eslint-disable-next-line max-len
import { AffiliateCodeChangeDialogComponent } from '../affiliate-code-change-dialog/affiliate-code-change-dialog.component';
import { AffiliateGraphComponent } from '../affiliate-graph/affiliate-graph.component';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-affiliate-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTabsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    ShareButtonsComponent,
  ],
  templateUrl: './affiliate-dashboard.component.html',
  styleUrls: ['./affiliate-dashboard.component.scss'],
})
export class AffiliateDashboardComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  loading = true;
  checkingEligibility = true;
  eligibility: AffiliateEligibility | null = null;
  profile: AffiliateProfile | null = null;
  stats: AffiliateStats | null = null;
  credits: AffiliateCredit[] = [];
  conversions: AffiliateConversion[] = [];
  pendingCodeChangeRequest: AffiliateCodeChangeRequest | null = null;
  protected readonly Math = Math;

  creditsDisplayedColumns: string[] = ['date', 'from', 'type', 'amount'];
  conversionsDisplayedColumns: string[] = ['date', 'type', 'amount', 'status', 'details'];

  isDragging = false;
  uploadingImage = false;
  imagePreview: string | null = null;
  readonly MAX_FILE_SIZE = 1024 * 1024;
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  constructor(
    private affiliateService: AffiliateService,
    private messageService: MessageService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private userService: UserService,
    private router: Router,
    private policyService: PolicyService,
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

          if (!eligibility.isEligible) {
            this.loading = false;
          } else {
            this.checkTermsAcceptance();
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to verify eligibility: ${err.message || 'Unknown error'}`);
          this.checkingEligibility = false;
          this.loading = false;
        },
      }),
    );
  }

  checkTermsAcceptance(): void {
    this.subscriptions.add(
      this.affiliateService.checkAffiliateTermsAcceptance().subscribe({
        next: (hasAcceptedTerms) => {
          if (!hasAcceptedTerms) {
            this.showTermsDialog();
          } else {
            // Check if Stripe onboarding is needed
            this.checkStripeOnboarding();
          }
        },
        error: (err) => {
          console.error('Error checking terms:', err);
          this.showTermsDialog();
        },
      }),
    );
  }

  checkStripeOnboarding(): void {
    this.subscriptions.add(
      this.affiliateService.getAffiliateProfile().subscribe({
        next: (profile) => {
          if (profile && !profile.stripeOnboardingCompleted) {
            // Stripe onboarding not complete, show dialog or redirect
            this.showStripeOnboardingDialog();
          } else {
            // Everything is complete, load dashboard
            this.loadDashboardData();
          }
        },
        error: () => {
          // On error, try to load dashboard anyway
          this.loadDashboardData();
        },
      }),
    );
  }

  showStripeOnboardingDialog(): void {
    this.messageService.info('You need to complete Stripe account setup to access the affiliate dashboard');
    this.loading = true;

    // Automatically start Stripe onboarding
    this.subscriptions.add(
      this.affiliateService.createStripeConnectAccount().subscribe({
        next: (response) => {
          if (response.onboardingUrl) {
            window.location.href = response.onboardingUrl;
          } else {
            this.messageService.error('Unable to start Stripe onboarding. Please try again later.');
            this.loading = false;
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to start Stripe onboarding: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  showTermsDialog(): void {
    // Get affiliate terms policy and show in unified dialog
    this.subscriptions.add(
      this.policyService.getActivePolicies().subscribe({
        next: (policies: ActivePoliciesResult) => {
          if (!policies.affiliateTerms) {
            this.messageService.error('Affiliate terms are not available at this time');
            this.router.navigate(['/home']);
            return;
          }

          const dialogRef = this.dialog.open(PolicyAcceptanceDialogComponent, {
            width: '800px',
            maxWidth: '90vw',
            disableClose: true,
            data: {
              policies: [policies.affiliateTerms],
              canCancel: true, // User can decline affiliate terms
            },
          });

          dialogRef.afterClosed().subscribe((accepted) => {
            if (accepted) {
              // After accepting affiliate terms, check if Stripe onboarding is needed
              this.checkStripeOnboarding();
            } else {
              this.messageService.warning('You must accept the affiliate terms to access the dashboard');
              this.router.navigate(['/home']);
            }
          });
        },
        error: (err: Error) => {
          console.error('Failed to load affiliate terms:', err);
          this.messageService.error('Failed to load affiliate terms');
          this.router.navigate(['/home']);
        },
      }),
    );
  }

  loadDashboardData(): void {
    this.loading = true;

    this.subscriptions.add(
      forkJoin({
        profile: this.affiliateService.getAffiliateProfile(),
        stats: this.affiliateService.getAffiliateStats(),
        credits: this.affiliateService.getAffiliateCredits(),
        conversions: this.affiliateService.getAffiliateConversions(),
        codeChangeRequests: this.affiliateService.getCodeChangeRequests(),
      }).subscribe({
        next: ({ profile, stats, credits, conversions, codeChangeRequests }) => {
          this.profile = profile;
          this.stats = stats;
          this.credits = credits;
          this.conversions = conversions;
          this.pendingCodeChangeRequest = codeChangeRequests.find((r) => r.status === 'pending') || null;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load dashboard data: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  hasAnyAdminPermission(): boolean {
    const userDetails = this.userService.userDetails();
    return (
      (userDetails?.permissions?.includes('affiliates.change_affiliateprofile') ||
        userDetails?.permissions?.includes('affiliates.change_affiliatecodechangerequest') ||
        userDetails?.permissions?.includes('affiliates.change_affiliatecreditconversion')) ??
      false
    );
  }

  navigateToPurchase(): void {
    this.router.navigate(['/orders']);
  }

  navigateToAdminPanel(): void {
    this.router.navigate(['/affiliate-admin']);
  }

  getAffiliateLink(): string {
    if (!this.profile?.code) return '';
    return `${environment.SITE_URL}/a/${this.profile.code}`;
  }

  copyLink(): void {
    const link = this.getAffiliateLink();
    this.clipboard.copy(link);
    this.messageService.success('Affiliate link copied to clipboard!');
  }

  openConvertDialog(type: 'credits' | 'cash'): void {
    const dialogRef = this.dialog.open(ConvertCreditsDialogComponent, {
      width: '500px',
      data: {
        type,
        availableBalance: this.getAvailableBalance(),
        affiliateProfile: this.profile,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadDashboardData();
      }
    });
  }

  openAffiliateGraph(): void {
    this.dialog.open(AffiliateGraphComponent, {
      width: '90vw',
      maxWidth: '1400px',
      height: '85vh',
      maxHeight: '900px',
    });
  }

  getAvailableBalance(): number {
    if (!this.stats) return 0;
    const totalCompleted = this.conversions
      .filter((c) => c.status === 'completed')
      .reduce((sum, c) => sum + c.affiliateCreditAmount, 0);
    return this.stats.totalAffiliateCredits - totalCompleted;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  /**
   * Convert cents to dollar string (for targetAmount from backend)
   * @param cents - Amount in cents
   * @returns Dollar amount as string (e.g., "21.00")
   */
  centsToDollars(cents: number): string {
    return AffiliateConversionUtils.centsToDollars(cents);
  }

  /**
   * Convert affiliate credits to dollar string
   * @param credits - Number of affiliate credits
   * @returns Dollar amount as string (e.g., "21.00")
   */
  creditsToDollars(credits: number): string {
    return AffiliateConversionUtils.creditsToDollars(credits);
  }

  getTierDescription(tier: number): string {
    return tier === 1 ? 'Tier 1 (10%)' : 'Tier 2 (5%)';
  }

  getConversionTypeDisplay(type: string): string {
    return type === 'to_credits' ? 'Credits' : 'Cash';
  }

  formatStatus(status: string): string {
    // Convert snake_case to uppercase with spaces: under_review -> UNDER REVIEW
    return status.replace(/_/g, ' ').toUpperCase();
  }

  getStatusClass(status: string): string {
    // Convert snake_case to kebab-case for CSS classes: under_review -> under-review
    return status.replace(/_/g, '-');
  }

  getStatusIcon(status?: string | null): string {
    switch (status) {
      case 'active':
        return 'check_circle';
      case 'suspended':
        return 'block';
      case 'under_review':
        return 'pending';
      default:
        return 'help_outline';
    }
  }

  getStatusColor(status?: string | null): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'suspended':
        return 'status-suspended';
      case 'under_review':
        return 'status-under-review';
      default:
        return '';
    }
  }

  getStatusLabel(status?: string | null): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'suspended':
        return 'Suspended';
      case 'under_review':
        return 'Under Review';
      default:
        return 'Unknown';
    }
  }

  isNetworkJoinable(profile: AffiliateProfile | null): boolean {
    if (!profile) return false;
    const isEligible = !profile.eligibilityStatus || profile.eligibilityStatus === 'active';
    return isEligible && profile.isActive;
  }

  getNetworkJoiningMessage(profile: AffiliateProfile | null): string {
    if (!profile) return '';

    if (profile.eligibilityStatus === 'suspended') {
      return 'Your account is suspended. Nobody can join your network right now.';
    }

    if (profile.eligibilityStatus === 'under_review') {
      return 'Your account is under review. Nobody can join your network right now.';
    }

    if (!profile.isActive && (!profile.eligibilityStatus || profile.eligibilityStatus === 'active')) {
      return 'This affiliate network is currently closed. Nobody can join your network right now.';
    }

    return '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  handleFile(file: File): void {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.messageService.error(validation.error || 'Invalid file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.uploadBrandImage(file);
    };
    reader.readAsDataURL(file);
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds 1MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: JPEG, PNG, GIF, WEBP`,
      };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    return { valid: true };
  }

  uploadBrandImage(file: File): void {
    this.uploadingImage = true;
    this.messageService.clearMessages();

    this.subscriptions.add(
      this.affiliateService.updateAffiliateBrandImage(file).subscribe({
        next: (response) => {
          this.uploadingImage = false;
          this.messageService.success('Brand image updated successfully!');
          if (response.affiliateProfile) {
            this.profile = response.affiliateProfile;
          }
          this.imagePreview = null;
        },
        error: (err) => {
          this.uploadingImage = false;
          this.imagePreview = null;
          this.messageService.error(`Failed to upload image: ${err.message}`);
        },
      }),
    );
  }

  deleteBrandImage(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Brand Image',
        message: 'Are you sure you want to delete your brand image?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.uploadingImage = true;
        this.subscriptions.add(
          this.affiliateService.deleteAffiliateBrandImage().subscribe({
            next: (response) => {
              this.uploadingImage = false;
              this.messageService.success('Brand image deleted successfully!');
              if (response.affiliateProfile) {
                this.profile = response.affiliateProfile;
              }
            },
            error: (err) => {
              this.uploadingImage = false;
              this.messageService.error(`Failed to delete image: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  openCodeChangeDialog(): void {
    const dialogRef = this.dialog.open(AffiliateCodeChangeDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.messageService.clearMessages();
        this.loadDashboardData();
      }
    });
  }

  cancelPendingCodeChangeRequest(): void {
    if (!this.pendingCodeChangeRequest) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Code Change Request',
        message: 'Are you sure you want to cancel your pending code change request?',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.pendingCodeChangeRequest) {
        this.messageService.clearMessages();
        this.subscriptions.add(
          this.affiliateService.cancelCodeChangeRequest(this.pendingCodeChangeRequest.uuid).subscribe({
            next: () => {
              this.messageService.success('Code change request canceled successfully');
              this.pendingCodeChangeRequest = null;
            },
            error: (err) => {
              this.messageService.error(`Failed to cancel request: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  onImageError(): void {
    console.error('Failed to load brand image:', this.profile?.brandImageUrl);
    this.messageService.warning('Failed to load brand image. The image may have been deleted or the URL is invalid.');
  }

  startStripeOnboarding(): void {
    this.loading = true;
    this.subscriptions.add(
      this.affiliateService.createStripeConnectAccount().subscribe({
        next: (response) => {
          if (response.onboardingUrl) {
            window.location.href = response.onboardingUrl;
          } else {
            this.messageService.error('Unable to start Stripe onboarding. Please try again later.');
            this.loading = false;
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to start Stripe onboarding: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  continueStripeOnboarding(): void {
    this.startStripeOnboarding();
  }

  skipStripeSetup(): void {
    this.router.navigate(['/']);
  }

  openStripeDashboard(): void {
    this.subscriptions.add(
      this.affiliateService.getStripeDashboardLink().subscribe({
        next: (response) => {
          if (response.dashboardUrl) {
            window.open(response.dashboardUrl, '_blank');
          } else {
            this.messageService.error('Unable to open Stripe dashboard. Please try again later.');
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to open Stripe dashboard: ${err.message}`);
        },
      }),
    );
  }

  shortCredits(value: number): string {
    const absValue = Math.abs(value);
    if (isNaN(absValue)) return `${value}`;

    const units = ['k', 'M', 'B'];
    let unitIndex = -1;
    let displayValue = absValue;

    while (displayValue >= 1000 && unitIndex < units.length - 1) {
      displayValue /= 1000;
      unitIndex++;
    }

    const digitsToShow = 3;
    const digits = displayValue.toFixed(digitsToShow - Math.floor(displayValue).toString().length);
    return unitIndex === -1 ? `${value.toFixed(0)}` : `${digits}${units[unitIndex]}`;
  }
}
