// Copyright (c) 2025 Perpetuator LLC

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  AffiliateService,
  PendingCodeChangeRequest,
  AffiliateUserSearchResult,
  PayoutConversion,
  PlatformFinancialStats,
  AffiliateConversionUtils,
} from '../affiliate.service';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-affiliate-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './affiliate-admin.component.html',
  styleUrls: ['./affiliate-admin.component.scss'],
})
export class AffiliateAdminComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  loading = true;
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

  constructor(
    private affiliateService: AffiliateService,
    private messageService: MessageService,
    private dialog: MatDialog,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadAdminData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadAdminData(): void {
    this.loading = true;

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

    this.loading = false;
  }

  canApproveCodeChanges(): boolean {
    const userDetails = this.userService.userDetails();
    return userDetails?.permissions?.includes('affiliates.change_affiliatecodechangerequest') ?? false;
  }

  canManagePayouts(): boolean {
    const userDetails = this.userService.userDetails();
    return userDetails?.permissions?.includes('affiliates.change_affiliatecreditconversion') ?? false;
  }

  isAdmin(): boolean {
    const userDetails = this.userService.userDetails();
    return userDetails?.permissions?.includes('affiliates.change_affiliateprofile') ?? false;
  }

  hasAnyAdminPermission(): boolean {
    return this.isAdmin() || this.canApproveCodeChanges() || this.canManagePayouts();
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
        this.updatingProgramSettings = true;

        const disabledMessage = newState
          ? ''
          : prompt('Enter custom message to show users (optional):') || 'The affiliate program is currently disabled.';
        const reason = prompt('Enter internal admin reason (optional, for audit trail):') || undefined;

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
    const statusChoice = prompt(
      `Choose action for ${username}:\n` +
        `1 = Suspend (permanent, requires admin restore)\n` +
        `2 = Under Review (temporary, being investigated)\n\n` +
        `Enter 1 or 2:`,
    );

    if (statusChoice === null) return;

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
        if (customMessage === null) return;

        const adminReason = prompt('Enter internal admin reason (optional, for audit trail):');
        if (adminReason === null) return;

        this.updatingUserEligibility = true;
        this.subscriptions.add(
          this.affiliateService
            .updateAffiliateEligibility(userId, newStatus, customMessage || defaultMessage, adminReason || undefined)
            .subscribe({
              next: () => {
                this.messageService.success(`Account for ${username} has been ${actionLabel.toLowerCase()}ed`);
                this.updatingUserEligibility = false;
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
        if (adminReason === null) return;

        this.updatingUserEligibility = true;
        this.subscriptions.add(
          this.affiliateService.updateAffiliateEligibility(userId, 'active', '', adminReason || undefined).subscribe({
            next: () => {
              this.messageService.success(`Account for ${username} has been restored`);
              this.updatingUserEligibility = false;
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
      `Amount: $${AffiliateConversionUtils.centsToDollars(payout.targetAmount)} USD`,
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  centsToDollars(cents: number): string {
    return AffiliateConversionUtils.centsToDollars(cents);
  }

  formatCentsAsDollars(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  getFinancialDifference(): number {
    if (!this.platformFinancialStats) return 0;
    return this.platformFinancialStats.stripeTotalBalanceCents - this.platformFinancialStats.totalAffiliateCreditsCents;
  }

  isFinancialHealthGood(): boolean {
    return this.platformFinancialStats?.canCoverAllOutstanding ?? false;
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

  openAffiliateGraph(): void {
    this.messageService.info('Opening affiliate network graph...');
  }
}
