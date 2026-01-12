// Copyright (c) 2026 Perpetuator LLC
import { Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap, catchError, of } from 'rxjs';

// GraphQL Query for DCF Analysis
const DCF_ANALYSIS_QUERY = gql`
  query DcfAnalysis($ticker: String!, $projectionYears: Int) {
    dcfAnalysis(ticker: $ticker, projectionYears: $projectionYears) {
      symbol
      analysisDate
      companyName

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

export interface DCFAnalysisData {
  symbol: string;
  analysisDate: string;
  companyName: string;
  historicalFcf: HistoricalDataPoint[];
  historicalRevenue: HistoricalDataPoint[];
  historicalNetIncome: HistoricalDataPoint[];
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

@Injectable({
  providedIn: 'root',
})
export class ValuationService {
  // State signals
  loading = signal(false);
  error = signal<string | null>(null);
  currentSymbol = signal<string | null>(null);
  valuationData = signal<DCFAnalysisData | null>(null);

  constructor(private apollo: Apollo) {}

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
        map((result) => result.data.dcfAnalysis),
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
   * Clear current valuation data
   */
  clear(): void {
    this.valuationData.set(null);
    this.currentSymbol.set(null);
    this.error.set(null);
    this.loading.set(false);
  }
}
