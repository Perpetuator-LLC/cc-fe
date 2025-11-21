// Copyright (c) 2025 Perpetuator LLC
import { Component, computed, OnInit, OnDestroy, signal, WritableSignal, effect } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardFooter } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../cookie-consent.service';
import { PolicyService, PolicyType, ActivePoliciesResult } from '../policy.service';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [MatButton, MatCardFooter, RouterLink],
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.scss'],
})
export class CookieBannerComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  private serverCookiePolicyVersion: WritableSignal<string | null> = signal(null);
  private hasCheckedOnLogin = false; // Prevent repeated checks on login

  showBanner = computed(() => {
    const serverVersion = this.serverCookiePolicyVersion();
    const isLoggedIn = this.authService.isLoggedIn();
    const consent = this.cookieConsentService.cookieConsent();

    // Never show banner for logged-in users - the policy system handles that
    if (isLoggedIn) {
      return false;
    }

    // For logged-out users, show banner only if they haven't accepted in localStorage
    if (!consent) {
      return true;
    }

    // If server version is available, compare against it
    if (serverVersion) {
      return consent.version !== serverVersion;
    }

    // If server version not yet loaded, don't show banner yet (prevent flickering)
    return false;
  });

  private cookiePolicyAccepted = signal(false);

  constructor(
    private cookieConsentService: CookieConsentService,
    private policyService: PolicyService,
    private authService: AuthService,
  ) {
    // Watch for login state changes and recheck cookie policy acceptance
    effect(
      () => {
        const isLoggedIn = this.authService.isLoggedIn();

        if (isLoggedIn) {
          // Only check once per login session
          if (this.hasCheckedOnLogin) {
            return;
          }
          this.hasCheckedOnLogin = true;

          // User just logged in - be optimistic to prevent banner flash
          // If localStorage consent exists, assume accepted until backend confirms
          const localConsent = this.cookieConsentService.cookieConsent();
          if (localConsent && localConsent.accepted) {
            this.cookiePolicyAccepted.set(true);
          }

          // Recheck cookie policy acceptance from backend
          // Add a small delay to allow PolicyGuardService to run first
          setTimeout(() => {
            this.checkCookiePolicyAcceptance();
          }, 500);
        } else {
          // User logged out, reset state
          this.cookiePolicyAccepted.set(false);
          this.hasCheckedOnLogin = false; // Reset for next login
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    // Only fetch public policy version if NOT logged in
    // Logged-in users get policies through PolicyGuardService and the effect()
    if (!this.authService.isLoggedIn()) {
      this.fetchServerCookiePolicyVersion();
    }
    // Note: For logged-in users, checkCookiePolicyAcceptance() is called by the effect()
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private fetchServerCookiePolicyVersion(): void {
    // Use metadata query to avoid fetching full policy content
    this.subscriptions.add(
      this.policyService
        .getActivePoliciesMetadata()
        .pipe(take(1)) // Complete after first emission
        .subscribe({
          next: (policies) => {
            if (policies.cookiePolicy) {
              this.serverCookiePolicyVersion.set(policies.cookiePolicy.version);
            }
          },
          error: (err) => {
            console.error('[CookieBanner] Failed to fetch cookie policy version:', err);
          },
        }),
    );
  }

  private checkCookiePolicyAcceptance(): void {
    this.subscriptions.add(
      this.policyService
        .hasPolicyBeenAccepted(PolicyType.COOKIE_POLICY)
        .pipe(take(1)) // Complete after first emission
        .subscribe({
          next: (accepted) => {
            this.cookiePolicyAccepted.set(accepted);

            // If user has accepted, sync to localStorage
            // Note: We don't need to fetch the policy again since hasPolicyBeenAccepted
            // already checked it and the version is in Apollo cache
            if (accepted) {
              // Get version from cache (already fetched by hasPolicyBeenAccepted)
              const localConsent = localStorage.getItem('cookie_consent');
              if (localConsent) {
                try {
                  const consent = JSON.parse(localConsent);
                  this.cookieConsentService.cookieConsent.set(consent);
                } catch (e) {
                  console.error('[CookieBanner] Failed to parse localStorage cookie consent:', e);
                }
              }
            }
          },
          error: (err) => {
            console.error('[CookieBanner] Failed to check cookie policy acceptance:', err);
          },
        }),
    );
  }

  acceptCookies(): void {
    if (this.authService.isLoggedIn()) {
      // User is logged in - accept via backend using new policy system
      this.subscriptions.add(
        this.policyService
          .getActivePoliciesMetadata()
          .pipe(take(1)) // Complete after first emission
          .subscribe({
            next: (policies) => {
              if (policies.cookiePolicy) {
                // Check if there's a signature in localStorage from pre-login acceptance
                const localConsent = localStorage.getItem('cookie_consent');
                let signature: string | undefined;

                if (localConsent) {
                  try {
                    const consent = JSON.parse(localConsent);
                    // Generate a signature based on the localStorage data
                    signature = `cookie_${consent.version}_${consent.date}`;
                  } catch (e) {
                    console.error('[CookieBanner] Failed to parse localStorage cookie consent:', e);
                  }
                }

                this.subscriptions.add(
                  this.policyService.acceptPolicy(policies.cookiePolicy.id, signature).subscribe({
                    next: () => {
                      // Update localStorage with server version
                      const updatedConsent = {
                        version: policies.cookiePolicy!.version,
                        accepted: true,
                        date: new Date().toISOString(),
                      };
                      this.cookieConsentService.cookieConsent.set(updatedConsent);
                      localStorage.setItem('cookie_consent', JSON.stringify(updatedConsent));
                      this.cookiePolicyAccepted.set(true);
                    },
                    error: (err) => {
                      console.error('[CookieBanner] Failed to accept cookie policy:', err);
                    },
                  }),
                );
              }
            },
            error: (err) => {
              console.error('[CookieBanner] Failed to load cookie policy:', err);
            },
          }),
      );
    } else {
      // User not logged in - save to localStorage only
      this.subscriptions.add(
        this.policyService
          .getActivePoliciesMetadata()
          .pipe(take(1)) // Complete after first emission
          .subscribe({
            next: (policies: ActivePoliciesResult) => {
              if (policies.cookiePolicy) {
                const updatedConsent = {
                  version: policies.cookiePolicy.version,
                  accepted: true,
                  date: new Date().toISOString(),
                };
                this.cookieConsentService.cookieConsent.set(updatedConsent);
                localStorage.setItem('cookie_consent', JSON.stringify(updatedConsent));
                // Update server version signal to prevent banner from reappearing
                this.serverCookiePolicyVersion.set(policies.cookiePolicy.version);
              }
            },
            error: (err: Error) => {
              console.error('[CookieBanner] Failed to load cookie policy for acceptance:', err);
              // Fallback: use server version if already fetched
              const version = this.serverCookiePolicyVersion();
              if (version) {
                const updatedConsent = {
                  version,
                  accepted: true,
                  date: new Date().toISOString(),
                };
                this.cookieConsentService.cookieConsent.set(updatedConsent);
                localStorage.setItem('cookie_consent', JSON.stringify(updatedConsent));
              }
            },
          }),
      );
    }
  }
}
