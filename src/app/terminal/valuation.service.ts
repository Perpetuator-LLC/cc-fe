// Copyright (c) 2026 Perpetuator LLC
import { inject, Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap, catchError, of } from 'rxjs';

// Valuation model types
export type ValuationModel = 'dcf' | 'ddm';

// GraphQL Query for DDM (Dividend Discount Model) Analysis
const DDM_ANALYSIS_QUERY = gql`
  query DdmAnalysis($ticker: String!, $projectionYears: Int, $highGrowthRate: Float, $highGrowthYears: Int) {
    ddmAnalysis(
      ticker: $ticker
      projectionYears: $projectionYears
      highGrowthRate: $highGrowthRate
      highGrowthYears: $highGrowthYears
    ) {
      success
      isDividendPayer
      symbol
      companyName
      analysisDate

      # Currency fields for ADR handling
      tradingCurrency
      reportingCurrency
      isAdr
      currencyNote
      exchangeRate

      intrinsicValue
      currentPrice
      upsidePercentage
      marginOfSafety
      modelType
      modelDescription
      costOfEquity
      terminalGrowthRate
      historicalGrowthRate
      currentDividendYield
      payoutRatio
      dividendSustainabilityScore
      currentDividendPerShare
      presentValueDividends
      presentValueTerminal
      terminalValue
      historicalDividends {
        date
        dividendPerShare
      }
      projectedDividends {
        date
        dividendPerShare
        discountedDividend
        growthRate
        isProjected
      }
      dividendChartData {
        date
        dividendPerShare
        discountedDividend
        growthRate
        isProjected
      }
      summaryStats {
        yearsOfDividendData
        dividendCagr
        earningsPerShare
      }
    }
  }
`;

// GraphQL Query for DCF Analysis
const DCF_ANALYSIS_QUERY = gql`
  query DcfAnalysis($ticker: String!, $projectionYears: Int) {
    dcfAnalysis(ticker: $ticker, projectionYears: $projectionYears) {
      symbol
      analysisDate
      companyName

      # Currency fields for ADR handling
      tradingCurrency
      reportingCurrency
      isAdr
      currencyNote
      exchangeRate

      historicalFcf {
        date
        value
        operatingCashFlow
      }
      historicalRevenue {
        date
        value
      }
      historicalNetIncome {
        date
        value
      }

      historicalValuation {
        date
        price
        eps
        epsIsNegative
        peRatio
        pbRatio
        psRatio
        bookValuePerShare
        valuationNote
        avgPeRatio
        minPeRatio
        maxPeRatio
        avgPbRatio
      }

      baseCase {
        intrinsicValuePerShare
        currentPrice
        upsidePercentage
        marginOfSafety
        enterpriseValue
        presentValueFcf
        terminalValue
        presentValueTerminal
        netDebt
        equityValue
        sharesOutstanding
        wacc
        costOfEquity
        costOfDebt
        debtWeight
        equityWeight
        terminalGrowthRate
        projectionYears
        projections {
          year
          date
          fcf
          discountedFcf
          growthRate
        }
      }

      bullCase {
        intrinsicValuePerShare
        currentPrice
        upsidePercentage
        marginOfSafety
        enterpriseValue
        presentValueFcf
        terminalValue
        presentValueTerminal
        netDebt
        equityValue
        sharesOutstanding
        wacc
        costOfEquity
        costOfDebt
        debtWeight
        equityWeight
        terminalGrowthRate
        projectionYears
        projections {
          year
          date
          fcf
          discountedFcf
          growthRate
        }
      }

      bearCase {
        intrinsicValuePerShare
        currentPrice
        upsidePercentage
        marginOfSafety
        enterpriseValue
        presentValueFcf
        terminalValue
        presentValueTerminal
        netDebt
        equityValue
        sharesOutstanding
        wacc
        costOfEquity
        costOfDebt
        debtWeight
        equityWeight
        terminalGrowthRate
        projectionYears
        projections {
          year
          date
          fcf
          discountedFcf
          growthRate
        }
      }

      intrinsicValueMin
      intrinsicValueMax
      intrinsicValueMean
      intrinsicValueMedian

      sensitivityGrid {
        discountRate
        terminalGrowth
        intrinsicValue
      }

      projectionChartData {
        date
        type
        fcf
        fcfBase
        fcfBull
        fcfBear
      }

      valuationSummary {
        currentPrice
        intrinsicValueBase
        intrinsicValueBull
        intrinsicValueBear
        upsideBase
        marginOfSafety
        wacc
        terminalGrowth
      }

      assumptions {
        projectionYears
        riskFreeRate
        marketRiskPremium
        beta
        taxRate
        terminalGrowthRate
      }
    }
  }
`;

// Types
export interface HistoricalDataPoint {
  date: string;
  value: number;
  operatingCashFlow?: number;
}

export interface DCFProjection {
  year: number;
  date: string;
  fcf: number;
  discountedFcf: number;
  growthRate: number;
}

export interface DCFResult {
  intrinsicValuePerShare: number;
  currentPrice: number;
  upsidePercentage: number;
  marginOfSafety: number;
  enterpriseValue: number;
  presentValueFcf: number;
  terminalValue: number;
  presentValueTerminal: number;
  netDebt: number;
  equityValue: number;
  sharesOutstanding: number;
  wacc: number;
  costOfEquity: number;
  costOfDebt: number;
  debtWeight: number;
  equityWeight: number;
  terminalGrowthRate: number;
  projectionYears: number;
  projections: DCFProjection[];
}

export interface SensitivityPoint {
  discountRate: number;
  terminalGrowth: number;
  intrinsicValue: number;
}

export interface ProjectionChartPoint {
  date: string;
  type: 'historical' | 'projected';
  fcf: number | null;
  fcfBase: number | null;
  fcfBull: number | null;
  fcfBear: number | null;
}

export interface HistoricalValuationPoint {
  date: string;
  price: number;
  eps: number | null;
  epsIsNegative: boolean | null;
  peRatio: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  bookValuePerShare: number | null;
  valuationNote: string | null;
  avgPeRatio: number | null;
  minPeRatio: number | null;
  maxPeRatio: number | null;
  avgPbRatio: number | null;
}

export interface ValuationSummary {
  currentPrice: number;
  intrinsicValueBase: number;
  intrinsicValueBull: number;
  intrinsicValueBear: number;
  upsideBase: number;
  marginOfSafety: number;
  wacc: number;
  terminalGrowth: number;
}

export interface DCFAssumptions {
  projectionYears: number;
  riskFreeRate: number;
  marketRiskPremium: number;
  beta: number;
  taxRate: number;
  terminalGrowthRate: number;
}

// DDM Types
export interface DDMDividendPoint {
  date: string;
  dividendPerShare: number;
  discountedDividend?: number;
  growthRate?: number;
  isProjected?: boolean;
}

export interface DDMSummaryStats {
  yearsOfDividendData: number;
  dividendCagr: number;
  earningsPerShare: number;
}

export interface DDMAnalysisData {
  success: boolean;
  isDividendPayer: boolean;
  symbol: string;
  companyName: string;
  analysisDate: string;
  // Currency fields for ADR handling
  tradingCurrency: string;
  reportingCurrency: string;
  isAdr: boolean;
  currencyNote: string | null;
  exchangeRate: number | null; // Exchange rate used to convert financials to USD
  intrinsicValue: number;
  currentPrice: number;
  upsidePercentage: number;
  marginOfSafety: number;
  modelType: string; // 'gordon', 'two_stage', 'h_model'
  modelDescription: string;
  costOfEquity: number;
  terminalGrowthRate: number;
  historicalGrowthRate: number;
  currentDividendYield: number;
  payoutRatio: number;
  dividendSustainabilityScore: number;
  currentDividendPerShare: number;
  presentValueDividends: number;
  presentValueTerminal: number;
  terminalValue: number;
  historicalDividends: DDMDividendPoint[];
  projectedDividends: DDMDividendPoint[];
  dividendChartData: DDMDividendPoint[];
  summaryStats: DDMSummaryStats;
}

export interface DCFAnalysisData {
  symbol: string;
  analysisDate: string;
  companyName: string;
  // Currency fields for ADR handling
  tradingCurrency: string;
  reportingCurrency: string;
  isAdr: boolean;
  currencyNote: string | null;
  exchangeRate: number | null; // Exchange rate used to convert financials to USD
  historicalFcf: HistoricalDataPoint[];
  historicalRevenue: HistoricalDataPoint[];
  historicalNetIncome: HistoricalDataPoint[];
  historicalValuation: HistoricalValuationPoint[];
  baseCase: DCFResult;
  bullCase: DCFResult;
  bearCase: DCFResult;
  intrinsicValueMin: number;
  intrinsicValueMax: number;
  intrinsicValueMean: number;
  intrinsicValueMedian: number;
  sensitivityGrid: SensitivityPoint[];
  projectionChartData: ProjectionChartPoint[];
  valuationSummary: ValuationSummary;
  assumptions: DCFAssumptions;
}

interface DcfAnalysisResponse {
  dcfAnalysis: DCFAnalysisData | null;
}

interface DdmAnalysisResponse {
  ddmAnalysis: DDMAnalysisData | null;
}

@Injectable({
  providedIn: 'root',
})
export class ValuationService {
  // State signals
  loading = signal(false);
  error = signal<string | null>(null);
  currentSymbol = signal<string | null>(null);
  valuationData = signal<DCFAnalysisData | null>(null);
  ddmData = signal<DDMAnalysisData | null>(null);
  selectedModel = signal<ValuationModel>('dcf');

  private readonly apollo = inject(Apollo);

  /**
   * Load DCF valuation analysis for a symbol
   */
  loadValuation(symbol: string, projectionYears = 5): Observable<DCFAnalysisData | null> {
    this.loading.set(true);
    this.error.set(null);
    this.currentSymbol.set(symbol);

    return this.apollo
      .query<DcfAnalysisResponse>({
        query: DCF_ANALYSIS_QUERY,
        variables: { ticker: symbol, projectionYears },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data!.dcfAnalysis),
        tap((data) => {
          this.valuationData.set(data);
          this.loading.set(false);
          if (!data) {
            this.error.set('No valuation data available. Fundamental data may need to be fetched first.');
          }
        }),
        catchError((error) => {
          console.error('[ValuationService] Error loading DCF analysis:', error);
          // Check if this is a schema error (API not yet available)
          const errorMsg = error.message || '';
          if (errorMsg.includes('Cannot query field') || errorMsg.includes('status code 400')) {
            this.error.set(
              'DCF Valuation API is not yet available. The backend needs to implement the dcfAnalysis query.',
            );
          } else {
            this.error.set(error.message || 'Failed to load valuation data');
          }
          this.loading.set(false);
          return of(null);
        }),
      );
  }

  /**
   * Load DDM (Dividend Discount Model) valuation analysis for a symbol
   */
  loadDDM(symbol: string, projectionYears = 10): Observable<DDMAnalysisData | null> {
    this.loading.set(true);
    this.error.set(null);
    this.currentSymbol.set(symbol);
    this.selectedModel.set('ddm');

    return this.apollo
      .query<DdmAnalysisResponse>({
        query: DDM_ANALYSIS_QUERY,
        variables: { ticker: symbol, projectionYears },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data!.ddmAnalysis),
        tap((data) => {
          this.ddmData.set(data);
          this.loading.set(false);
          if (!data) {
            this.error.set('No DDM data available. This company may not pay dividends.');
          } else if (!data.isDividendPayer) {
            this.error.set('This company does not pay dividends. DDM valuation is not applicable.');
          }
        }),
        catchError((error) => {
          console.error('[ValuationService] Error loading DDM analysis:', error);
          const errorMsg = error.message || '';
          if (errorMsg.includes('Cannot query field') || errorMsg.includes('status code 400')) {
            this.error.set('DDM Valuation API is not yet available.');
          } else {
            this.error.set(error.message || 'Failed to load DDM valuation data');
          }
          this.loading.set(false);
          return of(null);
        }),
      );
  }

  /**
   * Set the selected valuation model
   */
  setModel(model: ValuationModel): void {
    this.selectedModel.set(model);
  }

  /**
   * Clear current valuation data
   */
  clear(): void {
    this.valuationData.set(null);
    this.ddmData.set(null);
    this.currentSymbol.set(null);
    this.error.set(null);
    this.loading.set(false);
  }
}
