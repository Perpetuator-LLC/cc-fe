// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit, OnDestroy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { PolicyService, PolicyVersion, PolicyType } from '../../services/policy.service';
import { Subscription } from 'rxjs';
import { MessageService } from '../../../message.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';

export interface PolicyAcceptanceDialogData {
  policies: PolicyVersion[];
  canCancel: boolean; // If false, user must accept to continue
}

@Component({
  selector: 'app-policy-acceptance-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButton, MatCheckbox],
  templateUrl: './policy-acceptance-dialog.component.html',
  styleUrl: './policy-acceptance-dialog.component.scss',
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
    effect(() => {
      const isLoggedIn = this.authService.isLoggedIn();
      if (!isLoggedIn) {
        // User logged out, close the dialog
        this.dialogRef.close(false);
      }
    });
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
