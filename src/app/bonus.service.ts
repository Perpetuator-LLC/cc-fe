// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';

export interface BonusCode {
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
export class BonusService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  getBonusCodes(activeOnly = false, page = 1, pageSize = 10, orderBy = 'createdAt', direction = 'ASC') {
    interface Response {
      getBonusCodes: {
        bonusCodes: BonusCode[];
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    }

    return this.query<Response>({
      query: GET_BONUS_CODES,
      variables: { page, pageSize, orderBy, direction, activeOnly },
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.getBonusCodes));
  }

  createBonusCode(code: string, creditAmount: number) {
    interface Response {
      createBonusCode: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_BONUS_CODE,
      variables: { code, creditAmount },
    }).pipe(
      map((data) => {
        if (!data.createBonusCode.success) {
          throw new Error(data.createBonusCode.message);
        }
        return data.createBonusCode;
      }),
    );
  }

  redeemBonusCode(code: string) {
    interface Response {
      redeemBonusCode: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: REDEEM_BONUS_CODE,
      variables: { code },
    }).pipe(
      map((data) => {
        if (!data.redeemBonusCode.success) {
          throw new Error(data.redeemBonusCode.message);
        }
        return data.redeemBonusCode;
      }),
    );
  }
}

const GET_BONUS_CODES = gql`
  query GetBonusCodes($page: Int!, $pageSize: Int!, $activeOnly: Boolean!) {
    getBonusCodes(page: $page, pageSize: $pageSize, activeOnly: $activeOnly) {
      bonusCodes {
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
      totalRecords
      totalPages
      currentPage
      hasNext
      hasPrevious
    }
  }
`;

const CREATE_BONUS_CODE = gql`
  mutation CreateBonusCode($code: String!, $creditAmount: Int!) {
    createBonusCode(code: $code, creditAmount: $creditAmount) {
      success
      message
    }
  }
`;

const REDEEM_BONUS_CODE = gql`
  mutation RedeemBonusCode($code: String!) {
    redeemBonusCode(code: $code) {
      success
      message
    }
  }
`;
