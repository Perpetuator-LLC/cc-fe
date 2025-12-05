// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
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

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AffiliateCodeChangeDialogComponent>,
    private affiliateService: AffiliateService,
    private messageService: MessageService,
  ) {
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

  getValidationIcon(): string {
    if (!this.availabilityStatus?.checked) {
      return '';
    }
    return this.availabilityStatus.available ? 'check_circle' : 'error';
  }

  getValidationClass(): string {
    if (!this.availabilityStatus?.checked) {
      return '';
    }
    return this.availabilityStatus.available ? 'success' : 'error';
  }
}
