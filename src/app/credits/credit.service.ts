// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal, Signal } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { map, Subscription } from 'rxjs';
import gql from 'graphql-tag';
import { BaseService } from '../base.service';
import { mapQueryResult } from '../utils/error-handler';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { ErrorHandlerService } from '../utils/error-handler.service';
import { MessageService } from '../message.service';
import { RelayConnection } from '../utils/relay';

export interface UserOrder {
  id: string;
  uuid: string;
  createdAt: string;
  status: string;
  description: string;
  amount: number;
  balance: number;
  receiptUrl: string;
  sessionUrl: string;
}

/** Transaction type values from backend enum */
export type TransactionTypeValue = 'PURCHASE' | 'DEDUCTION' | 'BONUS' | 'REFUND' | 'COMMAND' | 'JOB' | 'ADJUSTMENT';

/** Breakdown of charges for AI/command transactions */
export interface ChargeBreakdown {
  service: string;
  units: number;
}

/** Command execution that triggered a transaction */
export interface CommandExecutionRef {
  uuid: string;
  parsedCommand: string;
  creditsCharged: number;
}

export interface UserTransaction {
  id: string;
  uuid: string;
  createdAt: string;
  description: string;
  creditAmount: number;
  balance: number;
  /** Type of transaction: PURCHASE, DEDUCTION, BONUS, REFUND, COMMAND, JOB, ADJUSTMENT */
  transactionType: TransactionTypeValue;
  /** Human-readable display name for the transaction type */
  transactionTypeDisplay: string;
  /** Detailed breakdown of charges (tokens, characters, etc.) - JSON parsed */
  chargesBreakdown?: ChargeBreakdown[];
  job?: {
    id: string;
    uuid: string;
    kind: string;
  };
  order?: {
    uuid: string;
    amount: number;
    status: string;
  };
  /** Command execution that triggered this transaction (if any) */
  commandExecution?: CommandExecutionRef;
}

interface GetUserCreditsResponse {
  credits: number;
}

const GET_ORDERS = gql`
  query GetOrders($first: Int!, $after: String, $orderBy: String) {
    orders(first: $first, after: $after, orderBy: $orderBy) {
      edges {
        node {
          id
          uuid
          createdAt
          description
          amount
          receiptUrl
          sessionUrl
          status
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

const GET_TRANSACTIONS = gql`
  query GetTransactions($first: Int!, $after: String, $orderBy: String, $transactionType: String) {
    transactions(first: $first, after: $after, orderBy: $orderBy, transactionType: $transactionType) {
      edges {
        node {
          id
          uuid
          createdAt
          description
          creditAmount
          balance
          transactionType
          transactionTypeDisplay
          chargesBreakdown
          job {
            id
            uuid
            kind
          }
          order {
            uuid
            amount
            status
          }
          commandExecution {
            uuid
            parsedCommand
            creditsCharged
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

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

  getTransactions(
    first = 10,
    after: string | null = null,
    sort = 'createdAt',
    direction = 'DESC',
    transactionType: string | null = null,
  ) {
    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    // Raw response from GraphQL - chargesBreakdown is a JSON string
    interface RawTransaction extends Omit<UserTransaction, 'chargesBreakdown'> {
      chargesBreakdown?: string | ChargeBreakdown[];
    }

    interface Response {
      transactions: RelayConnection<RawTransaction>;
    }

    return this.query<Response>({
      query: GET_TRANSACTIONS,
      variables: { first, after, orderBy, transactionType },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ transactions }) => {
        return {
          transactions: transactions.edges.map((edge) => {
            const node = edge.node;
            // Parse chargesBreakdown JSON if present
            let chargesBreakdown: ChargeBreakdown[] | undefined;
            if (node.chargesBreakdown) {
              try {
                chargesBreakdown =
                  typeof node.chargesBreakdown === 'string' ? JSON.parse(node.chargesBreakdown) : node.chargesBreakdown;
              } catch {
                chargesBreakdown = undefined;
              }
            }
            return {
              ...node,
              chargesBreakdown,
            } as UserTransaction;
          }),
          pageInfo: transactions.pageInfo,
        };
      }),
    );
  }

  getOrders(first = 10, after: string | null = null, sort = 'createdAt', direction = 'DESC') {
    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    interface Response {
      orders: RelayConnection<UserOrder>;
    }

    return this.query<Response>({
      query: GET_ORDERS,
      variables: { first, after, orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        this.userOrdersSignal.set(data.orders.edges.map((edge) => edge.node));
        return {
          orders: data.orders.edges.map((edge) => edge.node),
          pageInfo: {
            hasNextPage: data.orders.pageInfo.hasNextPage,
            hasPreviousPage: data.orders.pageInfo.hasPreviousPage,
            endCursor: data.orders.pageInfo.endCursor,
            startCursor: data.orders.pageInfo.startCursor,
          },
        };
      }),
    );
  }

  refreshUserOrder(orderUuid: string) {
    const REFRESH_USER_ORDER = gql`
      mutation RefreshOrder($orderUuid: UUID!) {
        refreshOrder(orderUuid: $orderUuid) {
          success
          message
          order {
            id
            uuid
            createdAt
            description
            amount
            receiptUrl
            sessionUrl
            status
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
      variables: { orderUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.refreshOrder.success) {
          throw new Error(data.refreshOrder.message);
        }
        this.updateOrder(orderUuid, data.refreshOrder.order);
        return data.refreshOrder;
      }),
    );
  }

  cancelUserOrder(orderUuid: string) {
    const CANCEL_USER_ORDER = gql`
      mutation CancelOrder($orderUuid: UUID!) {
        cancelOrder(orderUuid: $orderUuid) {
          success
          message
          order {
            id
            uuid
            createdAt
            description
            amount
            receiptUrl
            sessionUrl
            status
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
      variables: { orderUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.cancelOrder.success) {
          throw new Error(data.cancelOrder.message);
        }
        this.updateOrder(orderUuid, data.cancelOrder.order);
        return data.cancelOrder;
      }),
    );
  }

  private updateOrder(orderUuid: string, updatedOrder: UserOrder) {
    const orders = this.userOrdersSignal();
    const orderIndex = orders.findIndex((o) => o.id === orderUuid);
    if (orderIndex !== -1) {
      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = { ...orders[orderIndex], ...updatedOrder };
      this.userOrdersSignal.set(updatedOrders);
    }
  }
}
