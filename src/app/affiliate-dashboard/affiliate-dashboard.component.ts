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
  AffiliateTermsConsent,
  AffiliateCodeChangeRequest,
  PendingCodeChangeRequest,
  AffiliateEligibility,
  AffiliateUserSearchResult,
  PayoutConversion,
  PlatformFinancialStats,
} from '../affiliate.service';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { AffiliateTermsDialogComponent } from '../affiliate-terms-dialog/affiliate-terms-dialog.component';
import { ConvertCreditsDialogComponent } from '../convert-credits-dialog/convert-credits-dialog.component';
// eslint-disable-next-line max-len
import { AffiliateCodeChangeDialogComponent } from '../affiliate-code-change-dialog/affiliate-code-change-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { environment } from '../../environments/environment';

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
  termsConsents: AffiliateTermsConsent[] = [];
  pendingCodeChangeRequest: AffiliateCodeChangeRequest | null = null;
  adminPendingRequests: PendingCodeChangeRequest[] = [];
  loadingAdminRequests = false;
  pendingPayoutRequests: PayoutConversion[] = [];
  loadingPayoutRequests = false;
  programSettings: { isEnabled: boolean; disabledMessage: string } | null = null;
  loadingProgramSettings = false;
  updatingProgramSettings = false;
  searchUsername = '';
  searchedUsers: AffiliateUserSearchResult[] = [];
  searchingUser = false;
  updatingUserEligibility = false;
  platformFinancialStats: PlatformFinancialStats | null = null;
  loadingFinancialStats = false;
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
  ) {}

  ngOnInit(): void {
    // Load admin settings first if user is admin (regardless of eligibility)
    if (this.isAdmin()) {
      this.loadAffiliateProgramSettings();
      this.loadPlatformFinancialStats();
    }

    if (this.canApproveCodeChanges()) {
      this.loadAdminPendingRequests();
    }

    if (this.canManagePayouts()) {
      this.loadPendingPayoutRequests();
    }

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
          console.log('=== ELIGIBILITY DEBUG ===');
          console.log('Full eligibility object:', eligibility);
          console.log('isEligible:', eligibility.isEligible);
          console.log('hasPaidOrder:', eligibility.hasPaidOrder);
          console.log('reason:', eligibility.reason);
          console.log('typeof hasPaidOrder:', typeof eligibility.hasPaidOrder);
          console.log('=========================');

          this.eligibility = eligibility;
          this.checkingEligibility = false;

          if (!eligibility.isEligible) {
            this.loading = false;
            // Even if not eligible, load admin settings for admins
            // This allows them to re-enable the program if it's disabled
            if (this.isAdmin()) {
              this.loadAffiliateProgramSettings();
            }
            if (this.canApproveCodeChanges()) {
              this.loadAdminPendingRequests();
            }
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
      this.affiliateService.getAffiliateTermsConsents().subscribe({
        next: (consents) => {
          this.termsConsents = consents;
          const hasAcceptedTerms = consents.some((c) => c.accepted && c.version === '1.0');

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
    const dialogRef = this.dialog.open(AffiliateTermsDialogComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((accepted) => {
      if (accepted) {
        this.loadDashboardData();
      } else {
        this.messageService.warning('You must accept the affiliate terms to access the dashboard');
        this.router.navigate(['/home']);
      }
    });
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

          if (this.canApproveCodeChanges()) {
            this.loadAdminPendingRequests();
          }

          if (this.isAdmin()) {
            this.loadAffiliateProgramSettings();
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to load dashboard data: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  canApproveCodeChanges(): boolean {
    const userDetails = this.userService.userDetails();
    return userDetails?.permissions?.includes('affiliates.change_affiliatecodechangerequest') ?? false;
  }

  canManagePayouts(): boolean {
    const userDetails = this.userService.userDetails();
    return (
      (userDetails?.permissions?.includes('affiliates.change_affiliatecreditconversion') ||
        userDetails?.permissions?.includes('is_staff')) ??
      false
    );
  }

  isAdmin(): boolean {
    const userDetails = this.userService.userDetails();
    return (
      (userDetails?.permissions?.includes('is_staff') ||
        userDetails?.permissions?.includes('affiliates.change_affiliateprofile')) ??
      false
    );
  }

  navigateToPurchase(): void {
    this.router.navigate(['/orders']);
  }

  loadAdminPendingRequests(): void {
    this.loadingAdminRequests = true;
    this.subscriptions.add(
      this.affiliateService.getPendingCodeChangeRequests().subscribe({
        next: (requests) => {
          this.adminPendingRequests = requests;
          this.loadingAdminRequests = false;
        },
        error: () => {
          this.loadingAdminRequests = false;
        },
      }),
    );
  }

  loadPendingPayoutRequests(): void {
    this.loadingPayoutRequests = true;
    this.subscriptions.add(
      this.affiliateService.getAllPayoutConversions('under_review', 'to_cash', 100).subscribe({
        next: (requests) => {
          this.pendingPayoutRequests = requests;
          this.loadingPayoutRequests = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load payout requests: ${err.message}`);
          this.loadingPayoutRequests = false;
        },
      }),
    );
  }

  loadPlatformFinancialStats(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.loadingFinancialStats = true;
    this.subscriptions.add(
      this.affiliateService.getPlatformFinancialStats().subscribe({
        next: (stats) => {
          this.platformFinancialStats = stats;
          this.loadingFinancialStats = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load platform financial stats: ${err.message}`);
          this.loadingFinancialStats = false;
        },
      }),
    );
  }

  loadAffiliateProgramSettings(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.loadingProgramSettings = true;
    this.subscriptions.add(
      this.affiliateService.getAffiliateProgramSettings().subscribe({
        next: (settings) => {
          this.programSettings = settings;
          this.loadingProgramSettings = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load program settings: ${err.message}`);
          this.loadingProgramSettings = false;
        },
      }),
    );
  }

  toggleAffiliateProgramEnabled(): void {
    if (!this.programSettings || this.updatingProgramSettings) {
      return;
    }

    const newState = !this.programSettings.isEnabled;
    const action = newState ? 'enable' : 'disable';
    const impactMessage = newState
      ? 'Users will be able to join and earn commissions.'
      : 'New signups will be blocked and existing affiliates will not be able to access the dashboard.';

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: `${action === 'enable' ? 'Enable' : 'Disable'} Affiliate Program`,
        message: `Are you sure you want to ${action} the entire affiliate program? ${impactMessage}`,
        confirmText: action === 'enable' ? 'Enable' : 'Disable',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        let disabledMessage: string | undefined;
        const reason: string | undefined =
          prompt('Enter internal admin reason (optional, for audit trail):') || undefined;

        if (!newState) {
          // When disabling, prompt for message
          disabledMessage =
            prompt('Enter message to display to users when program is disabled (optional):') || undefined;
          if (disabledMessage === null) return; // User cancelled
        }

        if (reason === null) return; // User cancelled

        this.updatingProgramSettings = true;
        this.subscriptions.add(
          this.affiliateService.updateAffiliateProgramEnabled(newState, disabledMessage, reason).subscribe({
            next: (response) => {
              this.messageService.success(response.message);
              if (this.programSettings) {
                this.programSettings.isEnabled = newState;
                if (disabledMessage) {
                  this.programSettings.disabledMessage = disabledMessage;
                }
              }
              this.updatingProgramSettings = false;
            },
            error: (err) => {
              this.messageService.error(`Failed to ${action} program: ${err.message}`);
              this.updatingProgramSettings = false;
            },
          }),
        );
      }
    });
  }

  searchUser(): void {
    const query = this.searchUsername.trim();

    if (query.length < 3) {
      this.messageService.error('Please enter at least 3 characters to search');
      return;
    }

    this.searchingUser = true;
    this.searchedUsers = [];

    this.subscriptions.add(
      this.affiliateService.searchAffiliateUsers(query).subscribe({
        next: (users) => {
          this.searchedUsers = users;
          this.searchingUser = false;

          if (users.length === 0) {
            this.messageService.info('No users found matching your search');
          }
        },
        error: (err) => {
          this.messageService.error(`Search failed: ${err.message}`);
          this.searchingUser = false;
          this.searchedUsers = [];
        },
      }),
    );
  }

  lockUserAccount(userId: string, username: string): void {
    // Prompt admin to choose between suspend and under review
    const statusChoice = prompt(
      `Choose action for ${username}:\n` +
        `1 = Suspend (permanent, requires admin restore)\n` +
        `2 = Under Review (temporary, being investigated)\n\n` +
        `Enter 1 or 2:`,
    );

    if (statusChoice === null) return; // User cancelled

    let newStatus: string;
    let defaultMessage: string;
    let actionLabel: string;

    if (statusChoice === '1') {
      newStatus = 'suspended';
      defaultMessage = 'Your affiliate account has been suspended. Please contact support.';
      actionLabel = 'Suspend';
    } else if (statusChoice === '2') {
      newStatus = 'under_review';
      defaultMessage = 'Your affiliate account is under review. We will contact you once the review is complete.';
      actionLabel = 'Place Under Review';
    } else {
      this.messageService.error('Invalid choice. Please enter 1 or 2.');
      return;
    }

    const message =
      `Are you sure you want to ${actionLabel.toLowerCase()} the affiliate account for ${username}? ` +
      `They will not be able to access the affiliate dashboard until restored.`;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: `${actionLabel} User Account`,
        message,
        confirmText: actionLabel,
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const customMessage = prompt(`Enter message to display to user (optional, default: "${defaultMessage}"):`);
        if (customMessage === null) return; // User cancelled

        const adminReason = prompt('Enter internal admin reason (optional, for audit trail):');
        if (adminReason === null) return; // User cancelled

        this.updatingUserEligibility = true;
        this.subscriptions.add(
          this.affiliateService
            .updateAffiliateEligibility(userId, newStatus, customMessage || defaultMessage, adminReason || undefined)
            .subscribe({
              next: () => {
                this.messageService.success(`Account for ${username} has been ${actionLabel.toLowerCase()}ed`);
                this.updatingUserEligibility = false;
                // Refresh search results
                this.searchUser();
              },
              error: (err) => {
                this.messageService.error(`Failed to ${actionLabel.toLowerCase()} account: ${err.message}`);
                this.updatingUserEligibility = false;
              },
            }),
        );
      }
    });
  }

  restoreUserAccount(userId: string, username: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Restore User Account',
        message: `Are you sure you want to restore affiliate access for ${username}?`,
        confirmText: 'Restore Access',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const adminReason = prompt('Enter internal admin reason (optional, for audit trail):');
        if (adminReason === null) return; // User cancelled

        this.updatingUserEligibility = true;
        this.subscriptions.add(
          this.affiliateService
            .updateAffiliateEligibility(
              userId,
              'active',
              '', // Clear any previous message
              adminReason || undefined,
            )
            .subscribe({
              next: () => {
                this.messageService.success(`Account for ${username} has been restored`);
                this.updatingUserEligibility = false;
                // Refresh search results
                this.searchUser();
              },
              error: (err) => {
                this.messageService.error(`Failed to restore account: ${err.message}`);
                this.updatingUserEligibility = false;
              },
            }),
        );
      }
    });
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
    // Network is joinable if eligibility is active (or null/undefined, meaning no restriction)
    // AND the network is open (isActive = true)
    const isEligible = !profile.eligibilityStatus || profile.eligibilityStatus === 'active';
    return isEligible && profile.isActive;
  }

  getNetworkJoiningMessage(profile: AffiliateProfile | null): string {
    if (!profile) return '';

    // Check specific restriction statuses first
    if (profile.eligibilityStatus === 'suspended') {
      return 'Your account is suspended. Nobody can join your network right now.';
    }

    if (profile.eligibilityStatus === 'under_review') {
      return 'Your account is under review. Nobody can join your network right now.';
    }

    // Only show network closed message if isActive is explicitly false
    // and there's no eligibility restriction
    if (!profile.isActive && (!profile.eligibilityStatus || profile.eligibilityStatus === 'active')) {
      return 'This affiliate network is currently closed. Nobody can join your network right now.';
    }

    // No restrictions
    return '';
  }

  toggleNetworkStatus(userId: string, username: string, currentIsActive: boolean): void {
    const newStatus = !currentIsActive;
    const action = newStatus ? 'open' : 'close';

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: `${action === 'open' ? 'Open' : 'Close'} Affiliate Network`,
        message: `Are you sure you want to ${action} the affiliate network for ${username}? ${
          newStatus ? 'Users will be able to join their network.' : 'Users will NOT be able to join their network.'
        }`,
        confirmText: action === 'open' ? 'Open Network' : 'Close Network',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const reasonInput = prompt('Enter internal admin reason (optional, for audit trail):');
        if (reasonInput === null) return;
        const reason = reasonInput || undefined;

        this.updatingUserEligibility = true;
        this.subscriptions.add(
          this.affiliateService.updateAffiliateNetworkStatus(userId, newStatus, reason).subscribe({
            next: () => {
              this.messageService.success(`Network ${action}ed for ${username}`);
              this.updatingUserEligibility = false;
              this.searchUser();
            },
            error: (err) => {
              this.messageService.error(`Failed to ${action} network: ${err.message}`);
              this.updatingUserEligibility = false;
            },
          }),
        );
      }
    });
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

  approveCodeChangeRequest(requestId: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Approve Code Change Request',
        message: 'Are you sure you want to approve this code change request?',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.messageService.clearMessages();
        this.subscriptions.add(
          this.affiliateService.approveCodeChangeRequest(requestId).subscribe({
            next: () => {
              this.messageService.success('Code change request approved successfully');
              this.loadAdminPendingRequests();
            },
            error: (err) => {
              this.messageService.error(`Failed to approve request: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  rejectCodeChangeRequest(requestId: string): void {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;

    this.messageService.clearMessages();
    this.subscriptions.add(
      this.affiliateService.rejectCodeChangeRequest(requestId, reason || undefined).subscribe({
        next: () => {
          this.messageService.success('Code change request rejected');
          this.loadAdminPendingRequests();
        },
        error: (err) => {
          this.messageService.error(`Failed to reject request: ${err.message}`);
        },
      }),
    );
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

  viewPayoutDetails(conversionId: string): void {
    this.subscriptions.add(
      this.affiliateService.getPayoutConversionById(conversionId).subscribe({
        next: (payout) => {
          if (!payout) {
            this.messageService.error('Payout request not found');
            return;
          }

          this.dialog.open(ConfirmationDialogComponent, {
            width: '600px',
            data: {
              title: 'Payout Request Details',
              message: this.formatPayoutDetails(payout),
              confirmText: 'Close',
              cancelText: null,
            },
          });
        },
        error: (err) => {
          this.messageService.error(`Failed to load payout details: ${err.message}`);
        },
      }),
    );
  }

  formatPayoutDetails(payout: PayoutConversion): string {
    const details = [
      `Affiliate: ${payout.affiliate.username}`,
      `User ID: ${payout.affiliate.uuid}`,
      `Credits: ${payout.affiliateCreditAmount.toLocaleString()}`,
      `Amount: $${(payout.targetAmount / 1000).toFixed(2)} USD`,
      `Requested: ${new Date(payout.createdAt).toLocaleString()}`,
      `Status: ${payout.status}`,
    ];

    if (payout.affiliate.affiliateProfile) {
      const profile = payout.affiliate.affiliateProfile;
      details.push('');
      details.push('Stripe Account Status:');
      details.push(`- Onboarding: ${profile.stripeOnboardingCompleted ? '✓ Complete' : '✗ Incomplete'}`);
      details.push(`- Payouts: ${profile.stripePayoutsEnabled ? '✓ Enabled' : '✗ Disabled'}`);
      details.push(`- Country: ${profile.stripeCountry || 'N/A'}`);
    }

    return details.join('\n');
  }

  approvePayoutRequest(conversionId: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Approve Payout Request',
        message:
          'Are you sure you want to approve this payout? ' +
          "This will immediately transfer funds to the affiliate's Stripe account.",
        confirmText: 'Approve Payout',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const adminNotes = prompt('Admin notes (optional, internal only):');
        if (adminNotes === null) return;

        this.messageService.clearMessages();
        this.subscriptions.add(
          this.affiliateService.approvePayoutRequest(conversionId, adminNotes || undefined).subscribe({
            next: () => {
              this.messageService.success('Payout approved and processed successfully!');
              this.loadPendingPayoutRequests();
            },
            error: (err) => {
              this.messageService.error(`Failed to approve payout: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  rejectPayoutRequest(conversionId: string): void {
    const rejectionReason = prompt(
      'Enter rejection reason (will be shown to affiliate):\n\n' +
        'Example: "Please complete your Stripe account verification before requesting payouts."',
    );

    if (!rejectionReason) {
      if (rejectionReason === '') {
        this.messageService.warning('Rejection reason is required');
      }
      return;
    }

    const adminNotes = prompt('Internal admin notes (optional, not shown to affiliate):');
    if (adminNotes === null) return;

    this.messageService.clearMessages();
    this.subscriptions.add(
      this.affiliateService.rejectPayoutRequest(conversionId, rejectionReason, adminNotes || undefined).subscribe({
        next: () => {
          this.messageService.success('Payout rejected. Affiliate has been notified.');
          this.loadPendingPayoutRequests();
        },
        error: (err) => {
          this.messageService.error(`Failed to reject payout: ${err.message}`);
        },
      }),
    );
  }

  formatCentsAsDollars(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  getFinancialDifference(): number {
    if (!this.platformFinancialStats) return 0;
    return this.platformFinancialStats.stripeTotalBalanceCents - this.platformFinancialStats.totalAffiliateCreditsCents;
  }

  getFinancialDifferenceLabel(): string {
    const diff = this.getFinancialDifference();
    if (diff > 0) {
      return `Surplus: $${this.formatCentsAsDollars(diff)}`;
    } else if (diff < 0) {
      return `Deficit: -$${this.formatCentsAsDollars(Math.abs(diff))}`;
    }
    return 'Balanced: $0.00';
  }

  isFinancialHealthGood(): boolean {
    return this.platformFinancialStats?.canCoverAllOutstanding ?? false;
  }
}
