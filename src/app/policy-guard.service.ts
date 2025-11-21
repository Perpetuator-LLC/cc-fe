// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter, switchMap, take, debounceTime, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { PolicyService, PolicyVersion } from './policy.service';
import { AuthService } from './auth.service';
import { CookieConsentService } from './cookie-consent.service';
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
    private cookieConsentService: CookieConsentService,
  ) {
    // Check policies after navigation completes (debounced to prevent rapid checks)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        debounceTime(500), // Wait 500ms after last navigation event
      )
      .subscribe(() => {
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
          // Try to link localStorage cookie consent
          return this.linkLocalStorageCookieConsent(missingPolicies);
        }),
        switchMap((missingPolicies) => {
          this.checkInProgress = false;

          if (missingPolicies.length === 0) {
            return of(null);
          }

          // Fetch full content for missing policies before showing dialog
          return this.policyService.getActivePolicies().pipe(
            take(1),
            switchMap((fullPolicies) => {
              // Map missing policies to their full content versions
              const missingWithContent: PolicyVersion[] = [];

              missingPolicies.forEach((missingPolicy) => {
                let fullPolicy: PolicyVersion | null = null;

                switch (missingPolicy.policyType) {
                  case 'TERMS_OF_SERVICE':
                    fullPolicy = fullPolicies.termsOfService;
                    break;
                  case 'PRIVACY_POLICY':
                    fullPolicy = fullPolicies.privacyPolicy;
                    break;
                  case 'COOKIE_POLICY':
                    fullPolicy = fullPolicies.cookiePolicy;
                    break;
                  case 'AFFILIATE_TERMS':
                    fullPolicy = fullPolicies.affiliateTerms;
                    break;
                }

                if (fullPolicy) {
                  missingWithContent.push(fullPolicy);
                }
              });

              // Show dialog with full content
              return this.showPolicyAcceptanceDialog(missingWithContent, false);
            }),
          );
        }),
      )
      .subscribe({
        next: (accepted) => {
          if (accepted === false) {
            // User canceled (shouldn't happen if canCancel is false)
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          console.error('[PolicyGuard] Error checking policies:', err);
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
      take(1), // Complete after first emission to prevent loops
      switchMap((missingPolicies) => {
        // Try to link localStorage cookie consent before showing dialog
        return this.linkLocalStorageCookieConsent(missingPolicies).pipe(
          switchMap((remainingPolicies) => {
            // Always sync cookie consent to localStorage to ensure version is up-to-date
            // This covers the case where user registered with acceptTerms=true
            this.syncCookieConsentToLocalStorage();

            if (remainingPolicies.length === 0) {
              return of(true);
            }

            return this.showPolicyAcceptanceDialog(remainingPolicies, false).pipe(
              switchMap((accepted) => {
                if (accepted) {
                  // Sync again after dialog acceptance
                  this.syncCookieConsentToLocalStorage();
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
      }),
    );
  }

  /**
   * Try to link localStorage cookie consent to user account
   * Returns the remaining policies that still need to be accepted
   */
  private linkLocalStorageCookieConsent(missingPolicies: PolicyVersion[]): Observable<PolicyVersion[]> {
    const localConsent = localStorage.getItem('cookie_consent');

    if (!localConsent) {
      return of(missingPolicies);
    }

    const cookiePolicy = missingPolicies.find((p) => p.policyType === 'COOKIE_POLICY');
    if (!cookiePolicy) {
      // Cookie policy not missing - user already accepted or doesn't need to
      // Still sync localStorage to ensure it has the correct server version
      return of(missingPolicies);
    }

    try {
      const consent = JSON.parse(localConsent);

      // Accept if user previously accepted (version matches OR is placeholder from registration)
      if (consent.accepted) {
        const signature = `cookie_${consent.version}_${consent.date}`;

        return this.policyService.acceptPolicy(cookiePolicy.id, signature).pipe(
          switchMap(() => {
            const remainingPolicies = missingPolicies.filter((p) => p.policyType !== 'COOKIE_POLICY');
            return of(remainingPolicies);
          }),
          catchError((err) => {
            console.error('[PolicyGuard] Failed to link cookie consent:', err);
            // On error, keep cookie policy in missing list so user can accept via dialog
            return of(missingPolicies);
          }),
        );
      }
    } catch (e) {
      console.error('[PolicyGuard] Failed to parse localStorage cookie consent:', e);
      // Clear invalid localStorage entry
      localStorage.removeItem('cookie_consent');
    }

    return of(missingPolicies);
  }

  /**
   * Sync cookie policy from DB to localStorage and CookieConsentService
   */
  private syncCookieConsentToLocalStorage(): void {
    this.policyService
      .getActivePoliciesMetadata()
      .pipe(take(1))
      .subscribe({
        next: (policies) => {
          if (policies.cookiePolicy) {
            const updatedConsent = {
              version: policies.cookiePolicy.version,
              accepted: true,
              date: new Date().toISOString(),
            };
            localStorage.setItem('cookie_consent', JSON.stringify(updatedConsent));
            // Update the CookieConsentService signal to trigger banner update
            this.cookieConsentService.cookieConsent.set(updatedConsent);
          }
        },
        error: (err) => {
          console.error('[PolicyGuard] Failed to sync cookie consent to localStorage:', err);
        },
      });
  }
}
