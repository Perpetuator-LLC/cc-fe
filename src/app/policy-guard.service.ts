// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter, switchMap, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { PolicyService, PolicyVersion } from './policy.service';
import { AuthService } from './auth.service';
import {
  PolicyAcceptanceDialogComponent,
  PolicyAcceptanceDialogData,
} from './policy-acceptance-dialog/policy-acceptance-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class PolicyGuardService {
  private dialogRef: MatDialogRef<PolicyAcceptanceDialogComponent> | null = null;
  private checkInProgress = false;

  constructor(
    private policyService: PolicyService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
  ) {
    // Check policies after navigation completes
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.checkPoliciesOnNavigation();
    });
  }

  /**
   * Initialize policy checking - call this after user logs in
   */
  initializePolicyCheck(): void {
    if (this.authService.isLoggedIn()) {
      this.checkAndShowPolicyDialog();
    }
  }

  /**
   * Check policies on navigation (only once per navigation)
   */
  private checkPoliciesOnNavigation(): void {
    if (!this.authService.isLoggedIn() || this.dialogRef || this.checkInProgress) {
      return;
    }

    this.checkAndShowPolicyDialog();
  }

  /**
   * Check for missing required policies and show dialog if needed
   */
  private checkAndShowPolicyDialog(): void {
    if (this.checkInProgress || this.dialogRef) {
      return;
    }

    this.checkInProgress = true;

    this.policyService
      .getMissingRequiredPolicies()
      .pipe(
        switchMap((missingPolicies) => {
          console.debug(
            '[PolicyGuard] Missing policies:',
            missingPolicies.map((p) => `${p.policyType} v${p.version}`),
          );

          // Check if user has cookie consent in localStorage that we can link
          const localConsent = localStorage.getItem('cookie_consent');
          console.debug('[PolicyGuard] localStorage cookie_consent:', localConsent);

          if (localConsent && missingPolicies.some((p) => p.policyType === 'COOKIE_POLICY')) {
            try {
              const consent = JSON.parse(localConsent);
              const cookiePolicy = missingPolicies.find((p) => p.policyType === 'COOKIE_POLICY');

              if (cookiePolicy && consent.version === cookiePolicy.version && consent.accepted) {
                console.debug('[PolicyGuard] Linking localStorage cookie consent to user account');
                // User already accepted this version in localStorage, link it to their account
                const signature = `cookie_${consent.version}_${consent.date}`;
                return this.policyService.acceptPolicy(cookiePolicy.id, signature).pipe(
                  switchMap(() => {
                    // Remove cookie policy from missing list since we just accepted it
                    const remainingPolicies = missingPolicies.filter((p) => p.policyType !== 'COOKIE_POLICY');
                    console.debug('[PolicyGuard] Cookie policy linked, remaining policies:', remainingPolicies.length);
                    return of(remainingPolicies);
                  }),
                );
              }
            } catch (e) {
              console.error('Failed to link localStorage cookie consent', e);
            }
          }

          // If cookie policy is NOT missing, it means user already accepted it in DB
          // Update localStorage to reflect this so cookie banner doesn't show
          const cookiePolicyMissing = missingPolicies.some((p) => p.policyType === 'COOKIE_POLICY');
          console.debug('[PolicyGuard] Cookie policy missing:', cookiePolicyMissing);

          if (!cookiePolicyMissing) {
            console.debug('[PolicyGuard] Cookie policy already accepted in DB, syncing to localStorage');
            // User has accepted cookie policy in DB, sync to localStorage
            this.policyService
              .getActivePolicies()
              .pipe(take(1))
              .subscribe((policies) => {
                if (policies.cookiePolicy) {
                  const updatedConsent = {
                    version: policies.cookiePolicy.version,
                    accepted: true,
                    date: new Date().toISOString(),
                  };
                  localStorage.setItem('cookie_consent', JSON.stringify(updatedConsent));
                  console.debug('[PolicyGuard] Synced to localStorage:', updatedConsent);
                }
              });
          }

          return of(missingPolicies);
        }),
        switchMap((missingPolicies) => {
          this.checkInProgress = false;

          if (missingPolicies.length === 0) {
            return of(null);
          }

          // Show dialog with missing policies
          return this.showPolicyAcceptanceDialog(missingPolicies, false);
        }),
      )
      .subscribe({
        next: (accepted) => {
          if (accepted) {
            // Policies accepted successfully - no action needed
            console.debug('Required policies accepted');
          } else if (accepted === false) {
            // User canceled (shouldn't happen if canCancel is false)
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          console.error('Error checking policies:', err);
          this.checkInProgress = false;
        },
      });
  }

  /**
   * Show the policy acceptance dialog
   */
  private showPolicyAcceptanceDialog(policies: PolicyVersion[], canCancel: boolean): Observable<boolean | null> {
    if (this.dialogRef) {
      return of(null); // Dialog already open
    }

    const data: PolicyAcceptanceDialogData = {
      policies,
      canCancel,
    };

    this.dialogRef = this.dialog.open(PolicyAcceptanceDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data,
      disableClose: !canCancel,
    });

    return new Observable((observer) => {
      this.dialogRef!.afterClosed().subscribe({
        next: (result: boolean) => {
          this.dialogRef = null;
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          this.dialogRef = null;
          observer.error(err);
        },
      });
    });
  }

  /**
   * Force check policies now (useful after login)
   */
  checkPoliciesNow(): Observable<boolean> {
    return this.policyService.getMissingRequiredPolicies().pipe(
      switchMap((missingPolicies) => {
        if (missingPolicies.length === 0) {
          return of(true);
        }

        return this.showPolicyAcceptanceDialog(missingPolicies, false).pipe(
          switchMap((accepted) => {
            if (accepted) {
              return of(true);
            } else {
              // User must accept policies
              this.authService.logout();
              this.router.navigate(['/login']);
              return of(false);
            }
          }),
        );
      }),
    );
  }
}
