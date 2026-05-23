// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AffiliateService, AffiliateCodeChangeInfo, AffiliateCodeChangeRequest } from '../affiliate.service';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-affiliate-code-change-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './affiliate-code-change-dialog.component.html',
  styleUrls: ['./affiliate-code-change-dialog.component.scss'],
})
export class AffiliateCodeChangeDialogComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<AffiliateCodeChangeDialogComponent>>(MatDialogRef);
  private affiliateService = inject(AffiliateService);
  private messageService = inject(MessageService);

  private subscriptions = new Subscription();
  private codeCheckSubject = new Subject<string>();

  codeForm: FormGroup;
  changeInfo: AffiliateCodeChangeInfo | null = null;
  pendingRequests: AffiliateCodeChangeRequest[] = [];

  loading = true;
  checking = false;
  submitting = false;

  availabilityStatus: {
    checked: boolean;
    available: boolean;
    message: string;
    requiresReview: boolean;
  } | null = null;

  constructor() {
    this.codeForm = this.fb.group({
      newCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      reason: [''],
    });
  }

  ngOnInit(): void {
    this.loadChangeInfo();
    this.setupCodeValidation();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadChangeInfo(): void {
    this.loading = true;

    this.subscriptions.add(
      this.affiliateService.getCodeChangeInfo().subscribe({
        next: (info) => {
          this.changeInfo = info;
          this.loadPendingRequests();
        },
        error: (err) => {
          this.messageService.error(`Failed to load change info: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  loadPendingRequests(): void {
    this.subscriptions.add(
      this.affiliateService.getCodeChangeRequests().subscribe({
        next: (requests) => {
          this.pendingRequests = requests.filter((r) => r.status === 'pending');
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load pending requests: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  setupCodeValidation(): void {
    this.subscriptions.add(
      this.codeForm
        .get('newCode')
        ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((code) => {
          if (code && code.length >= 3) {
            this.codeCheckSubject.next(code);
          } else {
            this.availabilityStatus = null;
          }
        }) || new Subscription(),
    );

    this.subscriptions.add(
      this.codeCheckSubject
        .pipe(
          switchMap((code) => {
            this.checking = true;
            this.availabilityStatus = null;
            return this.affiliateService.checkCodeAvailability(code.toUpperCase());
          }),
        )
        .subscribe({
          next: (result) => {
            this.checking = false;
            this.availabilityStatus = {
              checked: true,
              available: result.available,
              message: result.message,
              requiresReview: result.requiresReview,
            };
          },
          error: (err) => {
            this.checking = false;
            this.availabilityStatus = {
              checked: true,
              available: false,
              message: err.message || 'Failed to check availability',
              requiresReview: false,
            };
          },
        }),
    );
  }

  onSubmit(): void {
    if (this.codeForm.invalid || !this.availabilityStatus?.available) {
      return;
    }

    this.submitting = true;
    const { newCode, reason } = this.codeForm.value;

    this.subscriptions.add(
      this.affiliateService.requestCodeChange(newCode.toUpperCase(), reason).subscribe({
        next: (response) => {
          this.submitting = false;

          if (response.requiresReview) {
            this.messageService.info(
              "Code change submitted for review. You'll receive an email when it's processed.",
              5000,
            );
          } else {
            this.messageService.success(`Code changed to ${newCode.toUpperCase()}!`);
          }

          this.dialogRef.close(true);
        },
        error: (err) => {
          this.submitting = false;
          this.messageService.error(`Failed to request code change: ${err.message}`);
        },
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  get canChange(): boolean {
    return this.changeInfo?.canChange ?? false;
  }

  get daysUntilNextChange(): number {
    return this.changeInfo?.daysUntilNextChange ?? 0;
  }

  get isCodeValid(): boolean {
    const code = this.codeForm.get('newCode')?.value;
    return code && code.length >= 3 && code.length <= 50;
  }

  get validationIcon(): string {
    if (!this.availabilityStatus?.checked) {
      return '';
    }
    return this.availabilityStatus.available ? 'check_circle' : 'error';
  }

  get validationClass(): string {
    if (!this.availabilityStatus?.checked) {
      return '';
    }
    return this.availabilityStatus.available ? 'success' : 'error';
  }

  /** True when an availability check has completed and we're not currently re-checking. */
  get availabilityVisible(): boolean {
    return !!this.availabilityStatus?.checked && !this.checking;
  }

  /** Tri-state describing the availability outcome for the inline badge. */
  get availabilityState(): 'success' | 'warning' | 'error' | null {
    if (!this.availabilityVisible || !this.availabilityStatus) {
      return null;
    }
    if (!this.availabilityStatus.available) {
      return 'error';
    }
    return this.availabilityStatus.requiresReview ? 'warning' : 'success';
  }

  /** Material icon name for the availability badge. */
  get availabilityIcon(): string {
    switch (this.availabilityState) {
      case 'warning':
        return 'warning';
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return '';
    }
  }

  /** Primary heading text for the availability badge. */
  get availabilityHeading(): string {
    if (this.availabilityState === 'warning') {
      return 'Available (requires admin review)';
    }
    return this.availabilityStatus?.message ?? '';
  }

  /** Secondary helper text shown only for the warning state. */
  get availabilitySubtext(): string {
    return this.availabilityState === 'warning' ? 'Premium keywords require manual approval' : '';
  }

  /** The first applicable error message for the newCode input, or '' if none. */
  get newCodeErrorMessage(): string {
    const control = this.codeForm.get('newCode');
    if (!control) {
      return '';
    }
    if (control.hasError('required') && control.touched) {
      return 'Code is required';
    }
    if (control.hasError('minlength')) {
      return 'Code must be at least 3 characters';
    }
    if (control.hasError('maxlength')) {
      return 'Code cannot exceed 50 characters';
    }
    return '';
  }

  /** True when the primary submit button should be rendered. */
  get canShowSubmit(): boolean {
    return this.canChange && !this.loading;
  }

  /** Label shown on the submit button (changes while submitting). */
  get submitButtonLabel(): string {
    return this.submitting ? 'Requesting...' : 'Request Change';
  }
}
