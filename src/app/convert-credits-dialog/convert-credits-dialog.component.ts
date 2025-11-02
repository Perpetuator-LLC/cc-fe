// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { AffiliateService } from '../affiliate.service';
import { MessageService } from '../message.service';

export interface ConvertCreditsDialogData {
  type: 'credits' | 'cash';
  availableBalance: number;
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
  private subscriptions = new Subscription();
  loading = false;
  convertForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<ConvertCreditsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConvertCreditsDialogData,
    private formBuilder: FormBuilder,
    private affiliateService: AffiliateService,
    private messageService: MessageService,
  ) {
    this.convertForm = this.formBuilder.group({
      amount: ['', [Validators.required, Validators.min(1), Validators.max(data.availableBalance)]],
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getTitle(): string {
    return this.data.type === 'credits' ? 'Convert to Credits' : 'Request Cash Payout';
  }

  getDescription(): string {
    if (this.data.type === 'credits') {
      return 'Convert your affiliate credits to regular platform credits that you can use for any service.';
    }
    return (
      'Request a cash payout for your affiliate credits. ' +
      'Payouts are processed manually and may take 5-7 business days.'
    );
  }

  onSubmit(): void {
    if (this.convertForm.invalid) return;

    const amount = this.convertForm.value.amount;
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
            this.messageService.success("Payout request submitted. You'll receive an email when processed.");
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
