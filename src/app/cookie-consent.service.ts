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
  getUserCookieConsents: CookieConsent[];
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
    this.loadCookieConsent();
  }

  private GET_USER_COOKIE_CONSENTS = gql`
    query GetUserCookieConsents {
      getUserCookieConsents {
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

  loadCookieConsent(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, not loading cookie consent');
      return;
    }
    this.subscriptions.add(
      this.apollo
        .query<GetUserCookieConsentsResponse>({
          query: this.GET_USER_COOKIE_CONSENTS,
          fetchPolicy: 'network-only',
        })
        .pipe(
          map((result) => result.data.getUserCookieConsents),
          catchError((error) => {
            console.error('GraphQL query error:', error);
            return throwError(() => new Error(`GraphQL Query Error: ${error.message}`));
          }),
        )
        .subscribe({
          next: (consents) => {
            if (consents && consents.length > 0) {
              const latestConsent = consents.find((consent) => consent.version === this.COOKIE_CONSENT_VERSION);
              this.cookieConsentSignal.set(latestConsent || null);
              console.log('User cookie consent loaded:', latestConsent);
            } else {
              console.log('No cookie consent found');
              this.cookieConsentSignal.set(null);
            }
          },
          error: (err) => {
            console.error('Failed to load cookie consent:', err);
            this.cookieConsentSignal.set(null);
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
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, skipping cookie consent update');
      return;
    }
    const version = this.COOKIE_CONSENT_VERSION;
    this.subscriptions.add(
      this.updateCookieConsent(version, accepted).subscribe({
        next: (result) => {
          if (result.success) {
            this.cookieConsentSignal.set({ version, accepted, date: new Date().toISOString() });
            console.log('Cookie consent updated successfully');
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
