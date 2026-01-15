// Copyright (c) 2026 Perpetuator LLC
/* Copyright (c) 2026 Perpetuator LLC */
import { Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap, catchError, of, forkJoin } from 'rxjs';

// GraphQL Queries - using only fields available in schema
const BALANCE_SHEETS_QUERY = gql`
  query BalanceSheets($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
    balanceSheets(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
      fiscalDateEnding
      reportedCurrency
      totalAssets
      totalLiabilities
      totalEquity
      shortTermDebt
      longTermDebt
    }
  }
`;

const INCOME_STATEMENTS_QUERY = gql`
  query IncomeStatements($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
    incomeStatements(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
      fiscalDateEnding
      reportedCurrency
      totalRevenue
      costOfRevenue
      grossProfit
      operatingIncome
      ebitda
      netIncome
      epsReported
      grossProfitRatio
      operatingMargin
      netIncomeRatio
    }
  }
`;

const CASH_FLOWS_QUERY = gql`
  query CashFlows($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
    cashFlows(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
      fiscalDateEnding
      reportedCurrency
      operatingCashFlow
      dividendPayout
    }
  }
`;

// Mutations to fetch data from Alpha Vantage
const FETCH_BALANCE_SHEET = gql`
  mutation FetchBalanceSheet($symbol: String!) {
    fetchBalanceSheet(symbol: $symbol) {
      success
      message
      job {
        uuid
      }
    }
  }
`;

const FETCH_INCOME_STATEMENT = gql`
  mutation FetchIncomeStatement($symbol: String!) {
    fetchIncomeStatement(symbol: $symbol) {
      success
      message
      job {
        uuid
      }
    }
  }
`;

const FETCH_CASH_FLOW = gql`
  mutation FetchCashFlow($symbol: String!) {
    fetchCashFlow(symbol: $symbol) {
      success
      message
      job {
        uuid
      }
    }
  }
`;

// Types - matching actual schema fields
export interface BalanceSheet {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
}

export interface IncomeStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netIncome: number | null;
  epsReported: number | null;
  grossProfitRatio: number | null;
  operatingMargin: number | null;
  netIncomeRatio: number | null;
}

export interface CashFlow {
  fiscalDateEnding: string;
  reportedCurrency: string;
  operatingCashFlow: number | null;
  dividendPayout: number | null;
}

export interface FundamentalsData {
  balanceSheets: BalanceSheet[];
  incomeStatements: IncomeStatement[];
  cashFlows: CashFlow[];
  symbol: string;
  isAnnual: boolean;
  /** Reporting currency (e.g., USD, TWD) - derived from first income statement */
  reportedCurrency?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FundamentalsService {
  // State
  loading = signal(false);
  error = signal<string | null>(null);
  currentSymbol = signal<string | null>(null);
  isAnnual = signal(true);
  fundamentalsData = signal<FundamentalsData | null>(null);

  constructor(private apollo: Apollo) {}

  /**
   * Load all fundamentals data for a symbol
   */
  loadFundamentals(symbol: string, isAnnual = true, limit = 10): Observable<FundamentalsData> {
    this.loading.set(true);
    this.error.set(null);
    this.currentSymbol.set(symbol);
    this.isAnnual.set(isAnnual);

    return forkJoin({
      balanceSheets: this.queryBalanceSheets(symbol, isAnnual, limit),
      incomeStatements: this.queryIncomeStatements(symbol, isAnnual, limit),
      cashFlows: this.queryCashFlows(symbol, isAnnual, limit),
    }).pipe(
      map((result) => {
        // Get reported currency from first income statement (most reliable source)
        const reportedCurrency = result.incomeStatements[0]?.reportedCurrency || 'USD';
        return {
          ...result,
          symbol,
          isAnnual,
          reportedCurrency,
        };
      }),
      tap((data) => {
        this.fundamentalsData.set(data);
        this.loading.set(false);
      }),
      catchError((err) => {
        console.error('[FundamentalsService] Error loading fundamentals:', err);
        this.error.set(err.message || 'Failed to load fundamentals');
        this.loading.set(false);
        return of({
          balanceSheets: [],
          incomeStatements: [],
          cashFlows: [],
          symbol,
          isAnnual,
        });
      }),
    );
  }

  /**
   * Query balance sheets from cache/database
   */
  private queryBalanceSheets(ticker: string, isAnnual: boolean, limit: number): Observable<BalanceSheet[]> {
    return this.apollo
      .query<{ balanceSheets: BalanceSheet[] }>({
        query: BALANCE_SHEETS_QUERY,
        variables: { ticker, isAnnual, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.balanceSheets || []),
        catchError(() => of([])),
      );
  }

  /**
   * Query income statements from cache/database
   */
  private queryIncomeStatements(ticker: string, isAnnual: boolean, limit: number): Observable<IncomeStatement[]> {
    return this.apollo
      .query<{ incomeStatements: IncomeStatement[] }>({
        query: INCOME_STATEMENTS_QUERY,
        variables: { ticker, isAnnual, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.incomeStatements || []),
        catchError(() => of([])),
      );
  }

  /**
   * Query cash flows from cache/database
   */
  private queryCashFlows(ticker: string, isAnnual: boolean, limit: number): Observable<CashFlow[]> {
    return this.apollo
      .query<{ cashFlows: CashFlow[] }>({
        query: CASH_FLOWS_QUERY,
        variables: { ticker, isAnnual, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.cashFlows || []),
        catchError(() => of([])),
      );
  }

  /**
   * Trigger fetch from Alpha Vantage if data doesn't exist
   */
  fetchFundamentalsFromProvider(symbol: string): Observable<{ success: boolean; jobIds: string[] }> {
    return forkJoin({
      balanceSheet: this.apollo.mutate<{ fetchBalanceSheet: { success: boolean; job?: { uuid: string } } }>({
        mutation: FETCH_BALANCE_SHEET,
        variables: { symbol },
      }),
      incomeStatement: this.apollo.mutate<{ fetchIncomeStatement: { success: boolean; job?: { uuid: string } } }>({
        mutation: FETCH_INCOME_STATEMENT,
        variables: { symbol },
      }),
      cashFlow: this.apollo.mutate<{ fetchCashFlow: { success: boolean; job?: { uuid: string } } }>({
        mutation: FETCH_CASH_FLOW,
        variables: { symbol },
      }),
    }).pipe(
      map((results) => ({
        success:
          results.balanceSheet.data?.fetchBalanceSheet.success ||
          results.incomeStatement.data?.fetchIncomeStatement.success ||
          results.cashFlow.data?.fetchCashFlow.success ||
          false,
        jobIds: [
          results.balanceSheet.data?.fetchBalanceSheet.job?.uuid,
          results.incomeStatement.data?.fetchIncomeStatement.job?.uuid,
          results.cashFlow.data?.fetchCashFlow.job?.uuid,
        ].filter((id): id is string => !!id),
      })),
    );
  }

  /**
   * Check if fundamentals data exists for a symbol
   */
  hasFundamentalsData(): boolean {
    const data = this.fundamentalsData();
    return !!(data && (data.balanceSheets.length > 0 || data.incomeStatements.length > 0 || data.cashFlows.length > 0));
  }

  /**
   * Toggle between annual and quarterly data
   */
  togglePeriod(): void {
    const symbol = this.currentSymbol();
    if (symbol) {
      this.loadFundamentals(symbol, !this.isAnnual()).subscribe();
    }
  }

  /**
   * Format large numbers for display (e.g., 1.5B, 250M)
   */
  formatLargeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e12) {
      return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
      return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
    } else if (absValue >= 1e3) {
      return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
    }
    return `${sign}$${absValue.toFixed(0)}`;
  }
}
