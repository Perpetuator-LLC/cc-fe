// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { RelayConnection } from './utils/relay';

export interface Code {
  id: string;
  code: string;
  creditAmount: number;
  creator: {
    id: string;
    username: string;
  };
  consumer: {
    id: string;
    username: string;
  };
  consumedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CodeService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  getCodes(
    active: boolean | null = null,
    after: string | null = null,
    first = 10,
    sort = 'createdAt',
    direction = 'DESC',
  ) {
    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    interface Response {
      codes: RelayConnection<Code>;
    }

    return this.query<Response>({
      query: GET_BONUS_CODES,
      variables: { after, first, orderBy, active },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ codes }) => {
        return {
          codes: codes.edges.map((edge) => edge.node),
          pageInfo: codes.pageInfo,
        };
      }),
    );
  }

  createCode(code: string, creditAmount: number) {
    interface Response {
      createCode: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_BONUS_CODE,
      variables: { code, creditAmount },
    }).pipe(
      map((data) => {
        if (!data.createCode.success) {
          throw new Error(data.createCode.message);
        }
        return data.createCode;
      }),
    );
  }

  redeemCode(code: string) {
    interface Response {
      redeemCode: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: REDEEM_BONUS_CODE,
      variables: { code },
    }).pipe(
      map((data) => {
        if (!data.redeemCode.success) {
          throw new Error(data.redeemCode.message);
        }
        return data.redeemCode;
      }),
    );
  }
}

const GET_BONUS_CODES = gql`
  query GetCodes($first: Int, $after: String, $active: Boolean, $orderBy: String!) {
    codes(first: $first, after: $after, active: $active, orderBy: $orderBy) {
      edges {
        cursor
        node {
          id
          code
          creditAmount
          creator {
            id
            username
          }
          consumer {
            id
            username
          }
          consumedAt
        }
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

const CREATE_BONUS_CODE = gql`
  mutation CreateCode($code: String!, $creditAmount: Int!) {
    createCode(code: $code, creditAmount: $creditAmount) {
      success
      message
    }
  }
`;

const REDEEM_BONUS_CODE = gql`
  mutation RedeemCode($code: String!) {
    redeemCode(code: $code) {
      success
      message
    }
  }
`;
