// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AffiliateProfile } from '../../affiliate.service';

/** Display state needed by the account-status card. Pre-computed by the parent. */
export interface AccountStatusDisplay {
  profileStatusIcon: string;
  profileStatusColor: string;
  profileStatusLabel: string;
  isNetworkJoinable: boolean;
  networkMessage: string;
}

/**
 * Account-status card extracted from AffiliateDashboard so the parent template
 * stays below the cyclomatic-complexity threshold.
 */
@Component({
  selector: 'app-account-status-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './account-status-card.component.html',
  styleUrls: ['./account-status-card.component.scss'],
})
export class AccountStatusCardComponent {
  @Input({ required: true }) profile!: AffiliateProfile;
  @Input({ required: true }) display!: AccountStatusDisplay;

  get showEligibilityStatus(): boolean {
    const status = this.profile.eligibilityStatus;
    return !!status && status !== 'active';
  }

  get networkStatusIconClass(): string {
    return this.profile.isActive ? 'status-active' : 'status-inactive';
  }

  get networkStatusIcon(): string {
    return this.profile.isActive ? 'group' : 'group_remove';
  }

  get networkStatusLabel(): string {
    return this.profile.isActive ? 'Accepting Members' : 'Closed';
  }

  get showNetworkWarning(): boolean {
    return !this.display.isNetworkJoinable && !!this.display.networkMessage;
  }

  get warningIcon(): string {
    return this.display.profileStatusIcon || 'block';
  }

  get isSuspended(): boolean {
    return this.profile.eligibilityStatus === 'suspended';
  }

  get isUnderReview(): boolean {
    return this.profile.eligibilityStatus === 'under_review';
  }

  get isNetworkClosed(): boolean {
    const status = this.profile.eligibilityStatus;
    const noBlockingStatus = !status || status === 'active';
    return !this.profile.isActive && noBlockingStatus;
  }
}
