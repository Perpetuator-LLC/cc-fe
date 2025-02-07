import { Injectable, OnDestroy } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable, Subscription } from 'rxjs';
import gql from 'graphql-tag';
import { BaseService } from './base.service';

export interface UserTransaction {
  id: string;
  createdAt: string;
  description: string;
  amount: number;
  balance: number;
}

@Injectable({
  providedIn: 'root',
})
export class CreditService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();

  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  getUserCredits(): Observable<number> {
    const GET_USER_CREDITS = gql`
      query GetUserCredits {
        getUserCredits
      }
    `;

    interface Response {
      getUserCredits: number;
    }

    return this.query<Response>({
      query: GET_USER_CREDITS,
    }).pipe(map((data) => data.getUserCredits));
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
            amount
            balance
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
