// Copyright (c) 2025 Perpetuator LLC
import { Component, computed, OnInit, OnDestroy, signal, WritableSignal, effect } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardFooter } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../cookie-consent.service';
import { PolicyService, PolicyType } from '../policy.service';
import { PublicPolicyHttpService } from '../public-policy-http.service';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

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

  showBanner = computed(() => {
    const serverVersion = this.serverCookiePolicyVersion();
    const isLoggedIn = this.authService.isLoggedIn();

    console.debug('[CookieBanner] Checking if should show banner:', {
      isLoggedIn,
      serverVersion,
    });

    // Show banner if user is not logged in and hasn't accepted in localStorage
    if (!isLoggedIn) {
      const consent = this.cookieConsentService.cookieConsent();

      console.debug('[CookieBanner] Not logged in, localStorage consent:', consent);

      // If no consent exists, show banner
      if (!consent) {
        console.debug('[CookieBanner] No consent found, showing banner');
        return true;
      }

      // If server version is available, compare against it
      if (serverVersion) {
        const mismatch = consent.version !== serverVersion;
        console.debug('[CookieBanner] Version check:', {
          localVersion: consent.version,
          serverVersion,
          mismatch,
        });
        return mismatch;
      }

      // If server version not yet loaded, don't show banner yet (prevent flickering)
      // The banner will update once server version is fetched
      console.debug('[CookieBanner] Server version not loaded yet, hiding banner');
      return false;
    }

    // If logged in, show banner if cookie policy hasn't been accepted
    const accepted = this.cookiePolicyAccepted();
    console.debug('[CookieBanner] Logged in, policy accepted:', accepted);
    return !accepted;
  });

  private cookiePolicyAccepted = signal(false);

  constructor(
    private cookieConsentService: CookieConsentService,
    private policyService: PolicyService,
    private publicPolicyService: PublicPolicyHttpService,
    private authService: AuthService,
  ) {
    // Watch for login state changes and recheck cookie policy acceptance
    effect(
      () => {
        const isLoggedIn = this.authService.isLoggedIn();
        console.debug('[CookieBanner] Effect: isLoggedIn changed to:', isLoggedIn);

        if (isLoggedIn) {
          // User just logged in - be optimistic to prevent banner flash
          // If localStorage consent exists, assume accepted until backend confirms
          const localConsent = this.cookieConsentService.cookieConsent();
          if (localConsent && localConsent.accepted) {
            console.debug('[CookieBanner] User logged in with localStorage consent, optimistically setting accepted');
            this.cookiePolicyAccepted.set(true);
          }

          // Recheck cookie policy acceptance from backend
          // Add a small delay to allow PolicyGuardService to run first
          setTimeout(() => {
            console.debug('[CookieBanner] User logged in, rechecking cookie policy acceptance from backend');
            this.checkCookiePolicyAcceptance();
          }, 500);
        } else {
          // User logged out, reset acceptance state
          console.debug('[CookieBanner] User logged out, resetting acceptance state');
          this.cookiePolicyAccepted.set(false);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    // Fetch the latest cookie policy version from server
    this.fetchServerCookiePolicyVersion();

    // Check cookie policy acceptance status if logged in
    if (this.authService.isLoggedIn()) {
      this.checkCookiePolicyAcceptance();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private fetchServerCookiePolicyVersion(): void {
    // Use getActivePolicies instead of getLatestCookiePolicyVersion for consistency
    this.subscriptions.add(
      this.publicPolicyService.getActivePolicies().subscribe({
        next: (policies) => {
          if (policies.cookiePolicy) {
            this.serverCookiePolicyVersion.set(policies.cookiePolicy.version);
            console.debug('[CookieBanner] Fetched server cookie policy version:', policies.cookiePolicy.version);
          }
        },
        error: (err) => {
          console.error('Failed to fetch cookie policy version:', err);
        },
      }),
    );
  }

  private checkCookiePolicyAcceptance(): void {
    this.subscriptions.add(
      this.policyService.hasPolicyBeenAccepted(PolicyType.COOKIE_POLICY).subscribe({
        next: (accepted) => {
          this.cookiePolicyAccepted.set(accepted);
          // Don't call setCookieConsent here - it uses hardcoded version
        },
        error: (err) => {
          console.error('Failed to check cookie policy acceptance:', err);
        },
      }),
    );
  }

  acceptCookies(): void {
    console.debug('[CookieBanner] Accept clicked');

    if (this.authService.isLoggedIn()) {
      console.debug('[CookieBanner] User is logged in, accepting via backend');
      // User is logged in - accept via backend using new policy system
      this.subscriptions.add(
        this.policyService.getActivePolicies().subscribe({
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
                  console.debug('[CookieBanner] Found existing localStorage consent, using signature:', signature);
                } catch (e) {
                  console.error('Failed to parse localStorage cookie consent', e);
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
                    console.debug('[CookieBanner] Accepted and saved to localStorage:', updatedConsent);
                  },
                  error: (err) => {
                    console.error('Failed to accept cookie policy:', err);
                  },
                }),
              );
            }
          },
          error: (err) => {
            console.error('Failed to load cookie policy:', err);
          },
        }),
      );
    } else {
      console.debug('[CookieBanner] User not logged in, fetching policy to get version');
      // User not logged in - fetch the cookie policy to get the actual version
      this.subscriptions.add(
        this.publicPolicyService.getActivePolicies().subscribe({
          next: (policies) => {
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
              console.debug('[CookieBanner] Saved to localStorage (not logged in):', updatedConsent);
            }
          },
          error: (err) => {
            console.error('Failed to load cookie policy for acceptance:', err);
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
              console.debug('[CookieBanner] Fallback: saved to localStorage with server version:', updatedConsent);
            }
          },
        }),
      );
    }
  }
}
