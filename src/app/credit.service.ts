import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { map, Subscription } from 'rxjs';
import gql from 'graphql-tag';
import { BaseService } from './base.service';
import { handleApolloError, mapQueryResult } from './utils/error-handler';
import { catchError } from 'rxjs/operators';

export interface UserOrders {
  id: string;
  createdAt: string;
  description: string;
  amount: number;
  balance: number;
  invoiceUrl: string;
}

export interface UserTransaction {
  id: string;
  createdAt: string;
  description: string;
  creditAmount: number;
  balance: number;
  job: {
    id: string;
    jobType: string;
  };
}

interface GetUserCreditsResponse {
  getUserCredits: number;
}

@Injectable({
  providedIn: 'root',
})
export class CreditService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private userCreditsSignal: WritableSignal<number> = signal(0);
  private queryRef: QueryRef<GetUserCreditsResponse>;

  constructor(protected override apollo: Apollo) {
    super(apollo);
    const GET_USER_CREDITS = gql`
      query GetUserCredits {
        getUserCredits
      }
    `;

    this.queryRef = this.watchQuery<GetUserCreditsResponse>({
      query: GET_USER_CREDITS,
    });

    this.queryRef.valueChanges
      .pipe(
        map(mapQueryResult),
        map((data) => data.getUserCredits),
        catchError(handleApolloError),
      )
      .subscribe({
        next: (credits) => {
          this.userCreditsSignal.set(credits);
        },
        error: (err) => {
          console.error('Failed to fetch user credits:', err);
        },
      });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get userCredits(): WritableSignal<number> {
    return this.userCreditsSignal;
  }

  refetchUserCredits() {
    this.queryRef.refetch();
  }

  getUserTransactions(page = 1, pageSize = 10, orderBy = 'createdAt', direction = 'DESC') {
    const GET_USER_TRANSACTIONS = gql`
      query GetUserTransactions($page: Int!, $pageSize: Int!, $orderBy: String, $direction: SortDirection) {
        getUserTransactions(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction) {
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
              jobType
            }
          }
        }
      }
    `;

    interface Response {
      getUserTransactions: {
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
    }).pipe(map((data) => data.getUserTransactions));
  }

  getUserOrders(page = 1, pageSize = 10, orderBy = 'createdAt', direction = 'DESC') {
    const GET_USER_ORDERS = gql`
      query GetUserOrders($page: Int!, $pageSize: Int!, $orderBy: String, $direction: SortDirection) {
        getUserOrders(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction) {
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
            invoiceUrl
            status
            createdAt
            creditTransactions {
              id
              createdAt
              description
              creditAmount
              balance
              job {
                id
                jobType
              }
            }
          }
        }
      }
    `;

    interface Response {
      getUserOrders: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
        orders: UserOrders[];
      };
    }

    return this.query<Response>({
      query: GET_USER_ORDERS,
      variables: { page, pageSize, orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.getUserOrders));
  }
}
