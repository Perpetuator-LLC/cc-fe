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
            '[PolicyGuard] checkAndShowPolicyDialog - missing policies:',
            missingPolicies.map((p) => `${p.policyType} v${p.version}`),
          );

          // Try to link localStorage cookie consent
          return this.linkLocalStorageCookieConsent(missingPolicies);
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
            console.debug('[PolicyGuard] Required policies accepted');
          } else if (accepted === false) {
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
    console.debug('[PolicyGuard] checkPoliciesNow called');

    return this.policyService.getMissingRequiredPolicies().pipe(
      switchMap((missingPolicies) => {
        console.debug(
          '[PolicyGuard] Missing required policies:',
          missingPolicies.map((p) => `${p.policyType} v${p.version}`),
        );

        // Try to link localStorage cookie consent before showing dialog
        return this.linkLocalStorageCookieConsent(missingPolicies).pipe(
          switchMap((remainingPolicies) => {
            console.debug('[PolicyGuard] After linking localStorage, remaining policies:', remainingPolicies.length);

            if (remainingPolicies.length === 0) {
              console.debug('[PolicyGuard] All policies satisfied');
              return of(true);
            }

            console.debug(
              '[PolicyGuard] Showing policy dialog for:',
              remainingPolicies.map((p) => p.policyType),
            );
            return this.showPolicyAcceptanceDialog(remainingPolicies, false).pipe(
              switchMap((accepted) => {
                if (accepted) {
                  console.debug('[PolicyGuard] User accepted policies');
                  return of(true);
                } else {
                  console.debug('[PolicyGuard] User rejected policies, logging out');
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
    console.debug('[PolicyGuard] Checking localStorage for cookie consent:', localConsent ? 'found' : 'not found');

    if (!localConsent) {
      return of(missingPolicies);
    }

    const cookiePolicy = missingPolicies.find((p) => p.policyType === 'COOKIE_POLICY');
    if (!cookiePolicy) {
      console.debug('[PolicyGuard] Cookie policy not in missing list, syncing localStorage with DB');
      // Cookie policy not missing - sync localStorage with DB
      this.syncCookieConsentToLocalStorage();
      return of(missingPolicies);
    }

    try {
      const consent = JSON.parse(localConsent);
      console.debug('[PolicyGuard] localStorage consent:', {
        version: consent.version,
        accepted: consent.accepted,
        date: consent.date,
      });
      console.debug('[PolicyGuard] Required cookie policy version:', cookiePolicy.version);

      if (consent.version === cookiePolicy.version && consent.accepted) {
        console.debug('[PolicyGuard] ✅ Linking localStorage cookie consent to user account');
        const signature = `cookie_${consent.version}_${consent.date}`;

        return this.policyService.acceptPolicy(cookiePolicy.id, signature).pipe(
          switchMap(() => {
            const remainingPolicies = missingPolicies.filter((p) => p.policyType !== 'COOKIE_POLICY');
            console.debug('[PolicyGuard] ✅ Cookie policy successfully linked, remaining:', remainingPolicies.length);
            return of(remainingPolicies);
          }),
        );
      } else {
        console.debug('[PolicyGuard] ❌ localStorage consent version mismatch or not accepted');
      }
    } catch (e) {
      console.error('[PolicyGuard] Failed to parse localStorage cookie consent:', e);
    }

    return of(missingPolicies);
  }

  /**
   * Sync cookie policy from DB to localStorage
   */
  private syncCookieConsentToLocalStorage(): void {
    this.policyService
      .getActivePolicies()
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
            console.debug('[PolicyGuard] ✅ Synced cookie policy from DB to localStorage:', updatedConsent);
          }
        },
        error: (err) => {
          console.error('[PolicyGuard] Failed to sync cookie consent to localStorage:', err);
        },
      });
  }
}
