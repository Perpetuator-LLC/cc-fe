// Copyright (c) 2026 Perpetuator LLC
import { Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of, catchError, map, tap } from 'rxjs';

/**
 * Financial hierarchy node from BE50 API
 */
export interface FinancialNode {
  id: string;
  name: string;
  value: number | null;
  previousValue: number | null;
  yoyChange: number | null;
  percentageOfParent: number | null;
  percentageOfTotal: number | null;
  level: number;
  flags: string[];
  children: FinancialNode[];
}

/**
 * Alert for significant changes (M&A, etc.)
 */
export interface FinancialAlert {
  type: string;
  severity: string;
  message: string;
  affectedNodes: string[];
}

/**
 * Financial hierarchy response
 */
export interface FinancialHierarchyData {
  symbol: string;
  reportType: string;
  fiscalDateEnding: string;
  previousFiscalDate: string | null;
  root: FinancialNode;
  alerts: FinancialAlert[];
}

/**
 * Time series data point for a financial node
 */
export interface FinancialTimeSeriesPoint {
  fiscalDateEnding: string;
  value: number | null;
  percentageOfTotal: number | null;
  yoyChange: number | null;
}

// GraphQL Queries
const FINANCIAL_HIERARCHY_QUERY = gql`
  query FinancialHierarchy($ticker: String!, $reportType: String!, $fiscalYear: Int, $isAnnual: Boolean) {
    financialHierarchy(ticker: $ticker, reportType: $reportType, fiscalYear: $fiscalYear, isAnnual: $isAnnual) {
      symbol
      reportType
      fiscalDateEnding
      previousFiscalDate
      root {
        id
        name
        value
        previousValue
        yoyChange
        percentageOfParent
        percentageOfTotal
        level
        flags
        children {
          id
          name
          value
          previousValue
          yoyChange
          percentageOfParent
          percentageOfTotal
          level
          flags
          children {
            id
            name
            value
            previousValue
            yoyChange
            percentageOfParent
            percentageOfTotal
            level
            flags
            children {
              id
              name
              value
              yoyChange
              percentageOfParent
              level
              flags
            }
          }
        }
      }
      alerts {
        type
        severity
        message
        affectedNodes
      }
    }
  }
`;

const FINANCIAL_NODE_TIME_SERIES_QUERY = gql`
  query FinancialNodeTimeSeries($ticker: String!, $nodeId: String!, $isAnnual: Boolean, $periods: Int) {
    financialNodeTimeSeries(ticker: $ticker, nodeId: $nodeId, isAnnual: $isAnnual, periods: $periods) {
      fiscalDateEnding
      value
      percentageOfTotal
      yoyChange
    }
  }
`;

interface HierarchyResponse {
  financialHierarchy: FinancialHierarchyData | null;
}

interface TimeSeriesResponse {
  financialNodeTimeSeries: FinancialTimeSeriesPoint[];
}

/**
 * Service for drill-down financial analysis (BE50)
 *
 * Provides hierarchical financial data with:
 * - Multi-level breakdown (assets → current → cash, etc.)
 * - Year-over-year comparisons
 * - M&A detection alerts
 * - Time series for specific nodes
 */
@Injectable({
  providedIn: 'root',
})
export class FinancialHierarchyService {
  // State signals
  loading = signal(false);
  error = signal<string | null>(null);
  currentSymbol = signal<string | null>(null);

  // Cached data
  hierarchyData = signal<FinancialHierarchyData | null>(null);

  constructor(private apollo: Apollo) {}

  /**
   * Load financial hierarchy for a symbol and report type
   */
  loadHierarchy(
    ticker: string,
    reportType: 'balance_sheet' | 'income_statement' | 'cash_flow',
    fiscalYear?: number,
    isAnnual = true,
  ): Observable<FinancialHierarchyData | null> {
    this.loading.set(true);
    this.error.set(null);
    this.currentSymbol.set(ticker);

    return this.apollo
      .query<HierarchyResponse>({
        query: FINANCIAL_HIERARCHY_QUERY,
        variables: { ticker, reportType, fiscalYear, isAnnual },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.financialHierarchy),
        tap((data) => {
          this.hierarchyData.set(data);
          this.loading.set(false);
          if (!data) {
            this.error.set('No financial hierarchy data available.');
          }
        }),
        catchError((err) => {
          console.error('[FinancialHierarchyService] Error loading hierarchy:', err);
          this.error.set(err.message || 'Failed to load financial hierarchy');
          this.loading.set(false);
          return of(null);
        }),
      );
  }

  /**
   * Load time series for a specific financial node
   * Useful for drill-down charts showing trends over time
   */
  loadNodeTimeSeries(
    ticker: string,
    nodeId: string,
    isAnnual = true,
    periods = 10,
  ): Observable<FinancialTimeSeriesPoint[]> {
    return this.apollo
      .query<TimeSeriesResponse>({
        query: FINANCIAL_NODE_TIME_SERIES_QUERY,
        variables: { ticker, nodeId, isAnnual, periods },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.financialNodeTimeSeries || []),
        catchError((err) => {
          console.error('[FinancialHierarchyService] Error loading time series:', err);
          return of([]);
        }),
      );
  }

  /**
   * Find a node by ID in the hierarchy tree
   */
  findNode(root: FinancialNode, nodeId: string): FinancialNode | null {
    if (root.id === nodeId) return root;

    for (const child of root.children || []) {
      const found = this.findNode(child, nodeId);
      if (found) return found;
    }

    return null;
  }

  /**
   * Get all nodes with a specific flag (e.g., 'm&a_indicator')
   */
  getNodesWithFlag(root: FinancialNode, flag: string): FinancialNode[] {
    const result: FinancialNode[] = [];

    const traverse = (node: FinancialNode) => {
      if (node.flags?.includes(flag)) {
        result.push(node);
      }
      for (const child of node.children || []) {
        traverse(child);
      }
    };

    traverse(root);
    return result;
  }

  /**
   * Format a value as currency (billions/millions)
   */
  formatValue(value: number | null): string {
    if (value === null) return 'N/A';

    const absValue = Math.abs(value);
    if (absValue >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  }

  /**
   * Format percentage change
   */
  formatChange(change: number | null): string {
    if (change === null) return 'N/A';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }
}
