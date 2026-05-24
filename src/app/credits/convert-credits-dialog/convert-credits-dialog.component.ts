// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import {
  AffiliateService,
  AffiliateProfile,
  AffiliateConversionUtils,
  MIN_CASH_PAYOUT_CREDITS,
} from '../../affiliate/affiliate.service';
import { MessageService } from '../../message.service';

export interface ConvertCreditsDialogData {
  type: 'credits' | 'cash';
  availableBalance: number;
  affiliateProfile?: AffiliateProfile | null;
}

@Component({
  selector: 'app-convert-credits-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './convert-credits-dialog.component.html',
  styleUrls: ['./convert-credits-dialog.component.scss'],
})
export class ConvertCreditsDialogComponent implements OnDestroy {
  private dialogRef = inject<MatDialogRef<ConvertCreditsDialogComponent>>(MatDialogRef);
  data = inject<ConvertCreditsDialogData>(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);
  private affiliateService = inject(AffiliateService);
  private messageService = inject(MessageService);

  private subscriptions = new Subscription();
  loading = false;
  convertForm: FormGroup;
  readonly MIN_CASH_PAYOUT = MIN_CASH_PAYOUT_CREDITS;
  /** Pre-computed display values for static template bindings. */
  readonly MIN_CASH_PAYOUT_FORMATTED = MIN_CASH_PAYOUT_CREDITS.toLocaleString();
  readonly MIN_CASH_PAYOUT_DOLLARS = AffiliateConversionUtils.creditsToDollars(MIN_CASH_PAYOUT_CREDITS);
  /** Available balance pre-formatted with thousands separators. */
  readonly availableBalanceFormatted: string;

  constructor() {
    const data = this.data;

    const minAmount = this.data.type === 'cash' ? this.MIN_CASH_PAYOUT : 1;
    this.convertForm = this.formBuilder.group({
      amount: ['', [Validators.required, Validators.min(minAmount), Validators.max(data.availableBalance)]],
    });
    this.availableBalanceFormatted = data.availableBalance.toLocaleString();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Convert affiliate credits to dollar string for display
   */
  creditsToDollars(credits: number): string {
    return AffiliateConversionUtils.creditsToDollars(credits);
  }

  /**
   * Get the current conversion amount based on form input
   */
  get conversionAmount(): string {
    const amount = this.convertForm.get('amount')?.value;
    if (!amount || isNaN(amount) || amount <= 0) {
      return '0.00';
    }
    return AffiliateConversionUtils.creditsToDollars(amount);
  }

  /**
   * Check if the conversion amount is valid for display
   */
  get hasValidConversionAmount(): boolean {
    const amount = this.convertForm.get('amount')?.value;
    return !!(amount && !isNaN(amount) && amount > 0);
  }

  get canRequestPayout(): boolean {
    if (this.data.type !== 'cash') return true;

    const profile = this.data.affiliateProfile;
    if (!profile) return false;

    return !!(profile.stripeOnboardingCompleted && profile.stripePayoutsEnabled && profile.stripeCountry === 'US');
  }

  get stripeRequirementMessage(): string | null {
    if (this.data.type !== 'cash') return null;

    const profile = this.data.affiliateProfile;
    if (!profile) return 'Affiliate profile not loaded';

    if (!profile.stripeAccountId) {
      return 'You must setup a Stripe payment account before requesting cash payouts';
    }

    if (!profile.stripeOnboardingCompleted) {
      return 'Please complete your Stripe account setup before requesting cash payouts';
    }

    if (!profile.stripePayoutsEnabled) {
      return 'Your Stripe account is not yet enabled for payouts. Please check your Stripe dashboard';
    }

    if (profile.stripeCountry !== 'US') {
      return 'Cash payouts are only available for US-based affiliates';
    }

    return null;
  }

  get title(): string {
    return this.data.type === 'credits' ? 'Convert to Credits' : 'Request Cash Payout';
  }

  get description(): string {
    if (this.data.type === 'credits') {
      return 'Convert your affiliate credits to regular platform credits that you can use for any service.';
    }
    const minCredits = this.MIN_CASH_PAYOUT.toLocaleString();
    const minDollars = AffiliateConversionUtils.creditsToDollars(this.MIN_CASH_PAYOUT);
    const minAmount = `${minCredits} credits ($${minDollars})`;
    return (
      `Request a cash payout for your affiliate credits. Minimum payout is ${minAmount}. ` +
      'Payouts are reviewed by admins and typically processed within 5-7 business days.'
    );
  }

  onSubmit(): void {
    if (this.convertForm.invalid) return;

    // Additional validation for cash payouts
    if (this.data.type === 'cash' && !this.canRequestPayout) {
      const message = this.stripeRequirementMessage;
      if (message) {
        this.messageService.error(message);
        return;
      }
    }

    const amount = this.convertForm.value.amount;

    // Check minimum for cash payout
    if (this.data.type === 'cash' && amount < this.MIN_CASH_PAYOUT) {
      const minCredits = this.MIN_CASH_PAYOUT.toLocaleString();
      const minDollars = AffiliateConversionUtils.creditsToDollars(this.MIN_CASH_PAYOUT);
      this.messageService.error(`Minimum cash payout is ${minCredits} credits ($${minDollars})`);
      return;
    }

    const conversionType = this.data.type === 'credits' ? 'to_credits' : 'to_cash';

    this.loading = true;
    this.messageService.clearMessages();

    this.subscriptions.add(
      this.affiliateService.convertAffiliateCredits(conversionType, amount).subscribe({
        next: (response) => {
          if (this.data.type === 'credits') {
            this.messageService.success(
              `${amount} affiliate credits converted to ${response.conversion?.targetAmount} regular credits!`,
            );
          } else {
            this.messageService.success(
              'Payout request submitted for admin review. You will receive an email when it is processed.',
            );
          }
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.messageService.error(`Conversion failed: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
