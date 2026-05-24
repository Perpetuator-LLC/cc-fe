// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import gql from 'graphql-tag';
import { map } from 'rxjs';
import { BaseService } from '../base.service';
import { AppConfigService } from '../core/app-config.service';
import { UserOrder } from './credit.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService extends BaseService {
  private appConfig = inject(AppConfigService);
  // Lazy — first access triggers Stripe.js download with the runtime publishable key.
  // Cached after first call so we don't re-load Stripe.js for subsequent checkouts.
  private _stripePromise: Promise<Stripe | null> | null = null;

  private get stripePromise(): Promise<Stripe | null> {
    if (!this._stripePromise) {
      this._stripePromise = loadStripe(this.appConfig.config.STRIPE_PUBLIC_KEY);
    }
    return this._stripePromise;
  }

  createCheckoutSession(amount: number) {
    const CREATE_STRIPE_CHECKOUT_SESSION = gql`
      mutation CreateStripeCheckoutSession($amount: Int!) {
        createStripeCheckoutSession(amount: $amount) {
          success
          message
          order {
            id
            sessionId
            sessionUrl
          }
        }
      }
    `;

    interface Response {
      createStripeCheckoutSession: {
        success: boolean;
        message: string;
        order: UserOrder;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_STRIPE_CHECKOUT_SESSION,
      variables: { amount },
    }).pipe(
      map((data) => {
        if (!data.createStripeCheckoutSession.success) {
          throw new Error(data.createStripeCheckoutSession.message);
        }
        return data.createStripeCheckoutSession;
      }),
    );
  }

  async redirectToCheckout(sessionUrl: string) {
    window.location.href = sessionUrl;
  }
}
