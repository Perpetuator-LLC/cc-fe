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
      capitalExpenditures
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

// Query for shares outstanding (to calculate per-share dividend)
const BALANCE_SHEET_QUERY = gql`
  query BalanceSheetForDividends($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
    balanceSheets(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
      fiscalDateEnding
      commonStockSharesOutstanding
    }
  }
`;

// Types
export interface CashFlowData {
  fiscalDateEnding: string;
  operatingCashFlow: number | null;
  capitalExpenditures: number | null;
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

interface BalanceSheetData {
  fiscalDateEnding: string;
  commonStockSharesOutstanding: number | null;
}

interface BalanceSheetResponse {
  balanceSheets: BalanceSheetData[];
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
      balanceSheets: this.apollo
        .query<BalanceSheetResponse>({
          query: BALANCE_SHEET_QUERY,
          variables: { ticker: symbol, isAnnual, limit: 1 },
          fetchPolicy: 'network-only',
        })
        .pipe(
          map((result) => result.data.balanceSheets),
          catchError(() => of([] as BalanceSheetData[])),
        ),
    }).pipe(
      map(({ cashFlows, incomeStatements, quote, balanceSheets }) => {
        this.loading.set(false);

        if (!cashFlows.length) {
          this.error.set('No cash flow data available for dividend analysis');
          return null;
        }

        // Get shares outstanding from most recent balance sheet
        const sharesOutstanding = balanceSheets[0]?.commonStockSharesOutstanding || null;

        // Build yearly data by merging cash flows and income statements
        const yearlyData = this.buildYearlyData(cashFlows, incomeStatements);

        // Calculate metrics (pass shares outstanding for per-share calculation)
        const metrics = this.calculateMetrics(yearlyData, quote?.price || 0, sharesOutstanding);

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

        // Calculate Free Cash Flow = Operating Cash Flow - Capital Expenditures
        // Note: CapEx is typically negative in accounting, so we use absolute value
        let freeCashFlow: number | null = null;
        if (cf.operatingCashFlow !== null) {
          if (cf.capitalExpenditures !== null) {
            // Real FCF calculation using CapEx
            freeCashFlow = cf.operatingCashFlow - Math.abs(cf.capitalExpenditures);
          } else {
            // Fallback: Use OCF as proxy if CapEx not available
            freeCashFlow = cf.operatingCashFlow;
          }
        }

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
  private calculateMetrics(
    yearlyData: DividendYearData[],
    currentPrice: number,
    sharesOutstanding: number | null,
  ): DividendMetrics {
    // Get most recent year's total dividend payout
    const recentYear = yearlyData[yearlyData.length - 1];
    const totalDividendPayout = recentYear?.dividendPayout ? Math.abs(recentYear.dividendPayout) : null;

    // Calculate per-share dividend (total payout / shares outstanding)
    let annualDividendPerShare: number | null = null;
    if (totalDividendPayout && sharesOutstanding && sharesOutstanding > 0) {
      annualDividendPerShare = totalDividendPayout / sharesOutstanding;
    }

    // Calculate dividend yield (per-share dividend / price) * 100
    const dividendYield =
      annualDividendPerShare && currentPrice > 0 ? (annualDividendPerShare / currentPrice) * 100 : null;

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
      annualDividend: annualDividendPerShare,
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
