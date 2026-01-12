// Copyright (c) 2026 Perpetuator LLC
import { Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';

// GraphQL Queries for dividend analysis
const CASH_FLOWS_QUERY = gql`
  query CashFlowsForDividends($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
    cashFlows(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
      fiscalDateEnding
      operatingCashFlow
      dividendPayout
    }
  }
`;

const INCOME_STATEMENTS_QUERY = gql`
  query IncomeStatementsForDividends($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
    incomeStatements(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
      fiscalDateEnding
      netIncome
    }
  }
`;

// Query for current quote data (for yield calculation)
const QUOTE_QUERY = gql`
  query QuoteForDividends($symbol: String!) {
    quote(symbol: $symbol) {
      price
      change
      changePercent
    }
  }
`;

// Types
export interface CashFlowData {
  fiscalDateEnding: string;
  operatingCashFlow: number | null;
  dividendPayout: number | null;
}

export interface IncomeData {
  fiscalDateEnding: string;
  netIncome: number | null;
}

export interface DividendYearData {
  year: string;
  fiscalDateEnding: string;
  dividendPayout: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null; // Calculated or from backend
  netIncome: number | null;
  fcfPayoutRatio: number | null; // dividendPayout / freeCashFlow
  netIncomePayoutRatio: number | null; // dividendPayout / netIncome
}

export interface DividendMetrics {
  currentPrice: number;
  // These would need backend support or calculation
  dividendYield: number | null; // Annual dividend / price
  annualDividend: number | null; // Most recent annual dividend per share
  ttmPayoutRatio: number | null; // TTM dividends / TTM net income
  ttmFcfPayoutRatio: number | null; // TTM dividends / TTM FCF
  dividendCagr5Year: number | null;
  dividendCagr10Year: number | null;
  fcfCagr5Year: number | null;
  fcfCagr10Year: number | null;
}

export interface DividendAnalysisData {
  symbol: string;
  metrics: DividendMetrics;
  yearlyData: DividendYearData[];
}

interface CashFlowsResponse {
  cashFlows: CashFlowData[];
}

interface IncomeStatementsResponse {
  incomeStatements: IncomeData[];
}

interface QuoteResponse {
  quote: {
    price: number;
    change: number;
    changePercent: number;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class DividendService {
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private apollo: Apollo) {}

  /**
   * Load dividend analysis data for a symbol
   */
  loadDividendAnalysis(symbol: string, isAnnual = true): Observable<DividendAnalysisData | null> {
    this.loading.set(true);
    this.error.set(null);

    return forkJoin({
      cashFlows: this.apollo
        .query<CashFlowsResponse>({
          query: CASH_FLOWS_QUERY,
          variables: { ticker: symbol, isAnnual, limit: 15 },
          fetchPolicy: 'network-only',
        })
        .pipe(
          map((result) => result.data.cashFlows),
          catchError(() => of([] as CashFlowData[])),
        ),
      incomeStatements: this.apollo
        .query<IncomeStatementsResponse>({
          query: INCOME_STATEMENTS_QUERY,
          variables: { ticker: symbol, isAnnual, limit: 15 },
          fetchPolicy: 'network-only',
        })
        .pipe(
          map((result) => result.data.incomeStatements),
          catchError(() => of([] as IncomeData[])),
        ),
      quote: this.apollo
        .query<QuoteResponse>({
          query: QUOTE_QUERY,
          variables: { symbol },
          fetchPolicy: 'network-only',
        })
        .pipe(
          map((result) => result.data.quote),
          catchError(() => of(null)),
        ),
    }).pipe(
      map(({ cashFlows, incomeStatements, quote }) => {
        this.loading.set(false);

        if (!cashFlows.length) {
          this.error.set('No cash flow data available for dividend analysis');
          return null;
        }

        // Build yearly data by merging cash flows and income statements
        const yearlyData = this.buildYearlyData(cashFlows, incomeStatements);

        // Calculate metrics
        const metrics = this.calculateMetrics(yearlyData, quote?.price || 0);

        return {
          symbol,
          metrics,
          yearlyData,
        };
      }),
      catchError((err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load dividend data');
        return of(null);
      }),
    );
  }

  /**
   * Build yearly data by merging cash flows and income statements
   */
  private buildYearlyData(cashFlows: CashFlowData[], incomeStatements: IncomeData[]): DividendYearData[] {
    // Create a map of income statements by fiscal date
    const incomeMap = new Map<string, IncomeData>();
    incomeStatements.forEach((inc) => {
      incomeMap.set(inc.fiscalDateEnding, inc);
    });

    // Build yearly data
    return cashFlows
      .map((cf) => {
        const income = incomeMap.get(cf.fiscalDateEnding);
        const year = new Date(cf.fiscalDateEnding).getFullYear().toString();

        // Estimate FCF as Operating Cash Flow (ideally we'd have CapEx too)
        // For now, use operating cash flow as a proxy
        const freeCashFlow = cf.operatingCashFlow;

        // Calculate payout ratios
        const fcfPayoutRatio =
          freeCashFlow && cf.dividendPayout ? Math.abs(cf.dividendPayout) / Math.abs(freeCashFlow) : null;

        const netIncomePayoutRatio =
          income?.netIncome && cf.dividendPayout ? Math.abs(cf.dividendPayout) / Math.abs(income.netIncome) : null;

        return {
          year,
          fiscalDateEnding: cf.fiscalDateEnding,
          dividendPayout: cf.dividendPayout,
          operatingCashFlow: cf.operatingCashFlow,
          freeCashFlow,
          netIncome: income?.netIncome || null,
          fcfPayoutRatio,
          netIncomePayoutRatio,
        };
      })
      .sort((a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime());
  }

  /**
   * Calculate dividend metrics from yearly data
   */
  private calculateMetrics(yearlyData: DividendYearData[], currentPrice: number): DividendMetrics {
    // Get most recent year's dividend for yield calculation
    const recentYear = yearlyData[yearlyData.length - 1];
    const annualDividend = recentYear?.dividendPayout ? Math.abs(recentYear.dividendPayout) : null;

    // Calculate dividend yield (dividend / price)
    const dividendYield = annualDividend && currentPrice > 0 ? (annualDividend / currentPrice) * 100 : null;

    // TTM payout ratios (using most recent year as proxy)
    const ttmPayoutRatio = recentYear?.netIncomePayoutRatio ? recentYear.netIncomePayoutRatio * 100 : null;
    const ttmFcfPayoutRatio = recentYear?.fcfPayoutRatio ? recentYear.fcfPayoutRatio * 100 : null;

    // Calculate CAGRs
    const dividendCagr5Year = this.calculateCagr(yearlyData, 'dividendPayout', 5);
    const dividendCagr10Year = this.calculateCagr(yearlyData, 'dividendPayout', 10);
    const fcfCagr5Year = this.calculateCagr(yearlyData, 'freeCashFlow', 5);
    const fcfCagr10Year = this.calculateCagr(yearlyData, 'freeCashFlow', 10);

    return {
      currentPrice,
      dividendYield,
      annualDividend,
      ttmPayoutRatio,
      ttmFcfPayoutRatio,
      dividendCagr5Year,
      dividendCagr10Year,
      fcfCagr5Year,
      fcfCagr10Year,
    };
  }

  /**
   * Calculate Compound Annual Growth Rate
   */
  private calculateCagr(
    data: DividendYearData[],
    field: 'dividendPayout' | 'freeCashFlow',
    years: number,
  ): number | null {
    if (data.length < years + 1) {
      return null;
    }

    const endIndex = data.length - 1;
    const startIndex = endIndex - years;

    const endValue = Math.abs(data[endIndex][field] || 0);
    const startValue = Math.abs(data[startIndex][field] || 0);

    if (startValue <= 0 || endValue <= 0) {
      return null;
    }

    // CAGR = (End Value / Start Value)^(1/years) - 1
    const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    return cagr;
  }
}
