// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, Subscription, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

interface CookieConsent {
  version: string;
  accepted: boolean;
  date: string;
}

interface GetUserCookieConsentsResponse {
  userCookieConsents: CookieConsent[];
}

interface UpdateCookieConsentResponse {
  updateCookieConsent: {
    success: boolean;
    message: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CookieConsentService implements OnDestroy {
  private subscriptions = new Subscription();
  public readonly COOKIE_CONSENT_VERSION = '2024-08-09';
  private cookieConsentSignal: WritableSignal<CookieConsent | null> = signal(null);

  get cookieConsent(): WritableSignal<CookieConsent | null> {
    return this.cookieConsentSignal;
  }

  constructor(
    private apollo: Apollo,
    private authService: AuthService,
  ) {
    const localConsent = this.loadConsentFromLocalStorage();
    if (localConsent && localConsent.version === this.COOKIE_CONSENT_VERSION) {
      this.cookieConsentSignal.set(localConsent);
    }
    this.loadCookieConsent();
  }

  private GET_USER_COOKIE_CONSENTS = gql`
    query GetUserCookieConsents {
      userCookieConsents {
        version
        accepted
        date
      }
    }
  `;

  private UPDATE_COOKIE_CONSENT = gql`
    mutation UpdateCookieConsent($version: String!, $accepted: Boolean!) {
      updateCookieConsent(version: $version, accepted: $accepted) {
        success
        message
      }
    }
  `;

  private loadConsentFromLocalStorage(): CookieConsent | null {
    const storedConsent = localStorage.getItem('cookieConsent');
    if (!storedConsent) {
      return null;
    }
    try {
      return JSON.parse(storedConsent);
    } catch (e) {
      console.error('Invalid JSON stored in localStorage:', e);
      localStorage.removeItem('cookieConsent');
      return null;
    }
  }

  private saveConsentToLocalStorage(consent: CookieConsent | null): void {
    if (consent) {
      localStorage.setItem('cookieConsent', JSON.stringify(consent));
    } else {
      localStorage.removeItem('cookieConsent');
    }
  }

  loadCookieConsent(): void {
    if (!this.authService.isLoggedIn()) {
      return; // User not logged in, not loading cookie consent
    }
    this.subscriptions.add(
      this.apollo
        .query<GetUserCookieConsentsResponse>({
          query: this.GET_USER_COOKIE_CONSENTS,
          fetchPolicy: 'network-only',
        })
        .pipe(
          map((result) => result.data.userCookieConsents),
          catchError((error) => {
            console.error('GraphQL query error:', error);
            return throwError(() => new Error(`GraphQL Query Error: ${error.message}`));
          }),
        )
        .subscribe({
          next: (consents) => {
            if (consents && consents.length > 0) {
              const latestConsent = consents.find((consent) => consent.version === this.COOKIE_CONSENT_VERSION);
              if (latestConsent === undefined) {
                console.warn('User has not signed latest cookie consent, clearing...');
                this.cookieConsentSignal.set(null);
                this.saveConsentToLocalStorage(null);
                return;
              }
              this.cookieConsentSignal.set(latestConsent);
              this.saveConsentToLocalStorage(latestConsent);
            }
          },
          error: (err) => {
            console.error('Failed to load cookie consent:', err);
          },
        }),
    );
  }

  updateCookieConsent(
    version: string,
    accepted: boolean,
  ): Observable<UpdateCookieConsentResponse['updateCookieConsent']> {
    return this.apollo
      .mutate<UpdateCookieConsentResponse>({
        mutation: this.UPDATE_COOKIE_CONSENT,
        variables: { version, accepted },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          (result) =>
            result.data?.updateCookieConsent || { success: false, message: 'Failed to update cookie consent' },
        ),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }

  setCookieConsent(accepted: boolean): void {
    const version = this.COOKIE_CONSENT_VERSION;
    const updatedConsent = { version, accepted, date: new Date().toISOString() };
    if (!this.authService.isLoggedIn()) {
      this.cookieConsentSignal.set(updatedConsent);
      this.saveConsentToLocalStorage(updatedConsent);
      return; // User not logged in, skipping cookie consent update in DB
    }
    this.subscriptions.add(
      this.updateCookieConsent(version, accepted).subscribe({
        next: (result) => {
          if (result.success) {
            this.cookieConsentSignal.set(updatedConsent);
            this.saveConsentToLocalStorage(updatedConsent);
          } else {
            console.error('Failed to update cookie consent:', result.message);
          }
        },
        error: (err) => {
          console.error('Error updating cookie consent:', err);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
