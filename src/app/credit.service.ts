// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal, Signal } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { map, Subscription } from 'rxjs';
import gql from 'graphql-tag';
import { BaseService } from './base.service';
import { mapQueryResult } from './utils/error-handler';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { ErrorHandlerService } from './error-handler.service';
import { MessageService } from './message.service';

export interface UserOrder {
  id: string;
  createdAt: string;
  status: string;
  description: string;
  amount: number;
  balance: number;
  receiptUrl: string;
  sessionUrl: string;
}

export interface UserTransaction {
  id: string;
  createdAt: string;
  description: string;
  creditAmount: number;
  balance: number;
  job: {
    id: string;
    kind: string;
  };
}

interface GetUserCreditsResponse {
  credits: number;
}

@Injectable({
  providedIn: 'root',
})
export class CreditService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private userCreditSubscription: Subscription | undefined;
  private userCreditsSignal: WritableSignal<number> = signal(0);
  private userOrdersSignal: WritableSignal<UserOrder[]> = signal([]);
  private queryRef!: QueryRef<GetUserCreditsResponse>;

  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
    private authService: AuthService,
    private messageService: MessageService,
  ) {
    super(apollo, errorHandler);
    this.initializeUserCreditsQuery();
    // When the user logs in, fetch the user credits
    this.subscriptions.add(
      toObservable(this.authService.isLoggedIn).subscribe({
        next: (isLoggedIn) => {
          if (isLoggedIn) {
            this.initializeUserCreditsQuery();
            return;
          }
          if (this.userCreditSubscription) {
            this.userCreditSubscription.unsubscribe();
          }
        },
        error: (error) => {
          this.messageService.error(`Failed to load credit service after login signal: ${error.message}`);
        },
      }),
    );
  }

  private initializeUserCreditsQuery() {
    const GET_USER_CREDITS = gql`
      query GetUserCredits {
        credits
      }
    `;

    this.queryRef = this.watchQuery<GetUserCreditsResponse>({
      query: GET_USER_CREDITS,
    });

    this.userCreditSubscription = this.queryRef.valueChanges
      .pipe(
        map(mapQueryResult),
        map((data) => data.credits),
        catchError((error) => this.errorHandler.handleError(error)),
      )
      .subscribe({
        next: (credits) => {
          this.userCreditsSignal.set(credits);
        },
        error: (err) => {
          console.error('Failed to fetch user credits:', err);
        },
      });
    this.subscriptions.add(this.userCreditSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get userCredits(): WritableSignal<number> {
    return this.userCreditsSignal;
  }

  get userOrders(): Signal<UserOrder[]> {
    return this.userOrdersSignal.asReadonly();
  }

  refetchUserCredits() {
    this.queryRef.refetch();
  }

  transactions(page = 1, pageSize = 10, orderBy = 'createdAt', direction = 'DESC') {
    const GET_USER_TRANSACTIONS = gql`
      query GetUserTransactions($page: Int!, $pageSize: Int!, $orderBy: String, $direction: SortDirection) {
        transactions(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction) {
          totalRecords
          totalPages
          currentPage
          hasNext
          hasPrevious
          transactions {
            id
            createdAt
            description
            creditAmount
            balance
            job {
              id
              kind
            }
          }
        }
      }
    `;

    interface Response {
      transactions: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
        transactions: UserTransaction[];
      };
    }

    return this.query<Response>({
      query: GET_USER_TRANSACTIONS,
      variables: { page, pageSize, orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.transactions));
  }

  orders(page = 1, pageSize = 10, orderBy = 'createdAt', direction = 'DESC') {
    const GET_USER_ORDERS = gql`
      query GetUserOrders($page: Int!, $pageSize: Int!, $orderBy: String, $direction: SortDirection) {
        orders(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction) {
          totalRecords
          totalPages
          currentPage
          hasNext
          hasPrevious
          orders {
            id
            createdAt
            description
            amount
            receiptUrl
            sessionUrl
            status
            createdAt
            transactions {
              id
              createdAt
              description
              creditAmount
              balance
              job {
                id
                kind
              }
            }
          }
        }
      }
    `;

    interface Response {
      orders: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
        orders: UserOrder[];
      };
    }

    return this.query<Response>({
      query: GET_USER_ORDERS,
      variables: { page, pageSize, orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        this.userOrdersSignal.set(data.orders.orders);
        return data.orders;
      }),
    );
  }

  refreshUserOrder(orderId: string) {
    const REFRESH_USER_ORDER = gql`
      mutation RefreshOrder($orderId: String!) {
        refreshOrder(orderId: $orderId) {
          success
          message
          order {
            id
            createdAt
            description
            amount
            receiptUrl
            sessionUrl
            status
            createdAt
            transactions {
              id
              createdAt
              description
              creditAmount
              balance
              job {
                id
                kind
              }
            }
          }
        }
      }
    `;

    interface Response {
      refreshOrder: {
        success: boolean;
        message: string;
        order: UserOrder;
      };
    }

    return this.mutate<Response>({
      mutation: REFRESH_USER_ORDER,
      variables: { orderId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.refreshOrder.success) {
          throw new Error(data.refreshOrder.message);
        }
        this.updateOrder(orderId, data.refreshOrder.order);
        return data.refreshOrder;
      }),
    );
  }

  cancelUserOrder(orderId: string) {
    const CANCEL_USER_ORDER = gql`
      mutation CancelOrder($orderId: String!) {
        cancelOrder(orderId: $orderId) {
          success
          message
          order {
            id
            createdAt
            description
            amount
            receiptUrl
            sessionUrl
            status
            createdAt
            transactions {
              id
              createdAt
              description
              creditAmount
              balance
              job {
                id
                kind
              }
            }
          }
        }
      }
    `;

    interface Response {
      cancelOrder: {
        success: boolean;
        message: string;
        order: UserOrder;
      };
    }

    return this.mutate<Response>({
      mutation: CANCEL_USER_ORDER,
      variables: { orderId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.cancelOrder.success) {
          throw new Error(data.cancelOrder.message);
        }
        this.updateOrder(orderId, data.cancelOrder.order);
        return data.cancelOrder;
      }),
    );
  }

  private updateOrder(orderId: string, updatedOrder: UserOrder) {
    const orders = this.userOrdersSignal();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex !== -1) {
      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = { ...orders[orderIndex], ...updatedOrder };
      this.userOrdersSignal.set(updatedOrders);
    }
  }
}
