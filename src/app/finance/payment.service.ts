// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { loadStripe } from '@stripe/stripe-js';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map } from 'rxjs';
import { BaseService } from '../base.service';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from '../error-handler.service';
import { UserOrder } from './credit.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService extends BaseService {
  private stripePromise = loadStripe(environment.STRIPE_PUBLIC_KEY);

  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
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
