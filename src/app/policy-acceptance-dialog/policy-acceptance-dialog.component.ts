// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit, OnDestroy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { PolicyService, PolicyVersion, PolicyType } from '../policy.service';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

export interface PolicyAcceptanceDialogData {
  policies: PolicyVersion[];
  canCancel: boolean; // If false, user must accept to continue
}

@Component({
  selector: 'app-policy-acceptance-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButton, MatCheckbox],
  template: `
    <h2 mat-dialog-title>Updated Policies - Your Acceptance Required</h2>
    <mat-dialog-content>
      <div class="policy-intro">
        <p>
          We've updated our policies. Please review and accept the following
          {{ data.policies.length === 1 ? 'policy' : 'policies' }} to continue using our service:
        </p>
        @if (!data.canCancel) {
          <p class="sign-out-note">
            <strong>Note:</strong> You may sign out if you do not wish to accept these policies at this time.
          </p>
        }
      </div>

      @for (policy of data.policies; track policy.id) {
        <div class="policy-section">
          <h3>{{ getPolicyTitle(policy.policyType) }}</h3>
          <p class="policy-meta">Version {{ policy.version }} - Effective {{ formatDate(policy.effectiveDate) }}</p>

          <div class="policy-content" [innerHTML]="renderPolicyContent(policy)"></div>
        </div>
      }

      <div class="acceptance-section">
        <mat-checkbox [(ngModel)]="acceptAll" [required]="true">
          I have read and accept all of the policies listed above
        </mat-checkbox>
      </div>

      @if (error) {
        <div class="error-message">{{ error }}</div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (!data.canCancel) {
        <button mat-button color="warn" (click)="onSignOut()">Sign Out</button>
      }
      @if (data.canCancel) {
        <button mat-button (click)="onCancel()">Cancel</button>
      }
      <button mat-raised-button color="primary" [disabled]="!acceptAll || accepting" (click)="onAccept()">
        {{ accepting ? 'Accepting...' : 'Accept' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .policy-intro {
        margin-bottom: 24px;
        padding: 16px;
        background-color: var(--mat-sys-surface-variant);
        border-radius: 8px;
      }

      .sign-out-note {
        margin-top: 12px;
        font-size: 0.9em;
        color: var(--mat-sys-on-surface-variant);
      }

      .policy-section {
        margin-bottom: 32px;
        padding: 16px;
        background-color: var(--mat-sys-surface-container);
        border: 1px solid var(--border-color);
        border-radius: 8px;
      }

      .policy-section h3 {
        margin-top: 0;
        color: var(--mat-sys-on-surface);
      }

      .policy-meta {
        font-size: 0.9em;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 16px;
      }

      .policy-content {
        max-height: 300px;
        overflow-y: auto;
        padding: 16px;
        background-color: var(--mat-sys-surface);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 0.9em;
        line-height: 1.6;
        color: var(--mat-sys-on-surface);
      }

      .policy-content ::ng-deep {
        h1,
        h2,
        h3 {
          color: var(--mat-sys-on-surface);
          margin-top: 20px;
          margin-bottom: 10px;
        }

        p {
          line-height: 1.6;
          margin-bottom: 16px;
          color: var(--mat-sys-on-surface);
        }

        ul,
        ol {
          margin-bottom: 16px;
          padding-left: 20px;
        }

        li {
          color: var(--mat-sys-on-surface);
        }

        a {
          color: var(--mat-sys-primary);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .acceptance-section {
        padding: 16px;
        background-color: var(--mat-sys-surface-variant);
        border-radius: 8px;
        margin-top: 16px;
      }

      .error-message {
        color: var(--md-sys-color-error);
        padding: 12px;
        margin-top: 16px;
        border: 1px solid var(--md-sys-color-error);
        border-radius: 4px;
        background-color: rgba(255, 0, 0, 0.1);
      }

      mat-checkbox {
        margin-top: 12px;
      }

      mat-dialog-content {
        max-height: 70vh;
        overflow-y: auto;
      }
    `,
  ],
})
export class PolicyAcceptanceDialogComponent implements OnInit, OnDestroy {
  acceptAll = false;
  accepting = false;
  error: string | null = null;
  private subscriptions = new Subscription();

  constructor(
    public dialogRef: MatDialogRef<PolicyAcceptanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PolicyAcceptanceDialogData,
    private policyService: PolicyService,
    private messageService: MessageService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private router: Router,
  ) {
    // Close dialog if user logs out - use effect to monitor signal
    effect(
      () => {
        const isLoggedIn = this.authService.isLoggedIn();
        if (!isLoggedIn) {
          // User logged out, close the dialog
          this.dialogRef.close(false);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    // Prevent closing by clicking outside if canCancel is false
    if (!this.data.canCancel) {
      this.dialogRef.disableClose = true;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getPolicyTitle(policyType: PolicyType): string {
    switch (policyType) {
      case PolicyType.TERMS_OF_SERVICE:
        return 'Terms of Service';
      case PolicyType.PRIVACY_POLICY:
        return 'Privacy Policy';
      case PolicyType.COOKIE_POLICY:
        return 'Cookie Policy';
      case PolicyType.AFFILIATE_TERMS:
        return 'Affiliate Terms';
      default:
        return policyType;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  renderPolicyContent(policy: PolicyVersion): SafeHtml {
    return this.policyService.renderPolicyContent(policy);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onAccept(): void {
    if (!this.acceptAll) {
      this.error = 'Please accept all policies to continue.';
      return;
    }

    this.accepting = true;
    this.error = null;

    // Accept all policies
    const acceptances = this.data.policies.map((policy) => this.policyService.acceptPolicy(policy.id).toPromise());

    Promise.all(acceptances)
      .then(() => {
        // Update localStorage for cookie policy to trigger banner update
        const cookiePolicy = this.data.policies.find((p) => p.policyType === PolicyType.COOKIE_POLICY);
        if (cookiePolicy) {
          const updatedConsent = {
            version: cookiePolicy.version,
            accepted: true,
            date: new Date().toISOString(),
          };
          localStorage.setItem('cookie_consent', JSON.stringify(updatedConsent));
        }

        this.messageService.success('Policies accepted successfully');
        this.dialogRef.close(true);
      })
      .catch((err) => {
        this.error = `Failed to accept policies: ${err.message}`;
        this.accepting = false;
      });
  }

  onSignOut(): void {
    // User chose to sign out instead of accepting policies
    this.authService.logout();
    this.dialogRef.close(false);
    this.router.navigate(['/login']);
  }
}
