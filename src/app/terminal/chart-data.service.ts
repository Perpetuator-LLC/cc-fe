// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, BehaviorSubject, Subscription, interval, of, Subject } from 'rxjs';
import { map, tap, catchError, switchMap, filter, takeUntil } from 'rxjs/operators';

// ============================================================================
// GraphQL Queries - Relay-style cursor pagination
// ============================================================================

const STOCK_PRICE_CONNECTION = gql`
  query StockPriceConnection(
    $symbol: String!
    $interval: StockPriceInterval
    $before: String
    $after: String
    $first: Int
    $fqn: String
  ) {
    stockPriceConnection(
      symbol: $symbol
      interval: $interval
      before: $before
      after: $after
      first: $first
      fqn: $fqn
    ) {
      edges {
        node {
          id
          date
          open
          high
          low
          close
          volume
          adjustedClose
        }
        cursor
      }
      pageInfo {
        hasOlderData
        hasNewerData
        oldestDate
        newestDate
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

const QUOTE_QUERY = gql`
  query Quote($symbol: String!, $fqn: String) {
    quote(symbol: $symbol, fqn: $fqn) {
      symbol
      price
      open
      high
      low
      previousClose
      volume
      timestamp
      changePercent
    }
  }
`;

const CHART_DATA_AVAILABILITY = gql`
  query ChartDataAvailability($symbol: String!, $interval: StockPriceInterval) {
    chartDataAvailability(symbol: $symbol, interval: $interval) {
      symbol
      interval
      oldestDate
      newestDate
      totalRecords
      lastUpdated
    }
  }
`;

// Query for fetching data by date range (recommended for progressive loading on zoom out)
const CHART_DATA_RANGE = gql`
  query ChartDataRange(
    $symbol: String!
    $startDate: DateTime!
    $endDate: DateTime!
    $interval: StockPriceInterval
    $fqn: String
  ) {
    chartDataRange(symbol: $symbol, startDate: $startDate, endDate: $endDate, interval: $interval, fqn: $fqn) {
      edges {
        node {
          id
          date
          open
          high
          low
          close
          volume
          adjustedClose
        }
        cursor
      }
      pageInfo {
        hasOlderData
        hasNewerData
        oldestDate
        newestDate
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

// ============================================================================
// Types - matches StockPriceInterval enum from schema
// ============================================================================

// Schema uses MIN_1, MIN_5, etc. but frontend may use different names
export type ChartInterval = 'MIN_1' | 'MIN_5' | 'MIN_15' | 'MIN_30' | 'MIN_60' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

// Alias for backwards compatibility
export type StockPriceInterval = ChartInterval;

export interface ChartCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface PageInfo {
  hasOlderData: boolean;
  hasNewerData: boolean;
  oldestDate: string | null;
  newestDate: string | null;
  startCursor: string | null;
  endCursor: string | null;
}

export interface ChartDataResult {
  candles: ChartCandle[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface QuoteUpdate {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  timestamp: string;
  changePercent: number;
}

export interface ChartDataAvailability {
  symbol: string;
  interval: ChartInterval;
  oldestDate: string | null;
  newestDate: string | null;
  totalRecords: number;
  lastUpdated: string | null;
}

interface StockPriceNode {
  id: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number | null;
}

interface StockPriceEdge {
  node: StockPriceNode;
  cursor: string;
}

interface StockPriceConnection {
  edges: StockPriceEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

// Default candle counts per interval
export const DEFAULT_CANDLE_COUNT: Record<ChartInterval, number> = {
  MIN_1: 390, // 1 trading day
  MIN_5: 390, // 5 trading days
  MIN_15: 104, // 2 trading days
  MIN_30: 260, // 5 trading days
  MIN_60: 168, // ~1 month
  DAILY: 252, // 1 year
  WEEKLY: 104, // 2 years
  MONTHLY: 60, // 5 years
};

@Injectable({
  providedIn: 'root',
})
export class ChartDataService implements OnDestroy {
  private subscriptions = new Subscription();

  // Current symbol being tracked for quote updates
  private currentSymbol$ = new BehaviorSubject<string | null>(null);
  private stopQuotePolling$ = new Subject<void>();

  // Loading state
  private isLoading$ = new BehaviorSubject<boolean>(false);

  // Quote refresh interval (5 seconds during market hours)
  private readonly quoteRefreshInterval = 5000;

  // Cached chart data per symbol+interval
  private chartDataCache = new Map<string, ChartDataResult>();

  // Current quote data
  readonly currentQuote: WritableSignal<QuoteUpdate | null> = signal(null);

  constructor(private apollo: Apollo) {}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopQuotePolling$.next();
    this.stopQuotePolling$.complete();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Check if currently loading data
   */
  get isLoading(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  /**
   * Load initial chart data for a symbol
   * Uses Relay cursor pagination to fetch the most recent candles first
   */
  loadChartData(
    symbol: string,
    interval: ChartInterval = 'DAILY',
    count?: number,
    fqn?: string,
  ): Observable<ChartDataResult> {
    const candleCount = count ?? DEFAULT_CANDLE_COUNT[interval];
    this.currentSymbol$.next(symbol);
    this.isLoading$.next(true);

    return this.apollo
      .query<{ stockPriceConnection: StockPriceConnection }>({
        query: STOCK_PRICE_CONNECTION,
        variables: { symbol, interval, first: candleCount, fqn },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => this.transformToChartData(result.data.stockPriceConnection)),
        tap((data) => {
          this.isLoading$.next(false);
          this.cacheChartData(symbol, interval, data);
        }),
        catchError((error) => {
          console.error('[ChartDataService] Failed to load chart data:', error);
          this.isLoading$.next(false);
          return of<ChartDataResult>({ candles: [], pageInfo: this.emptyPageInfo(), totalCount: 0 });
        }),
      );
  }

  /**
   * Load older historical data (when user zooms out)
   * Uses the endCursor from pageInfo to fetch data BEFORE the oldest loaded candle
   */
  loadOlderData(
    symbol: string,
    interval: ChartInterval,
    beforeCursor: string,
    count?: number,
    fqn?: string,
  ): Observable<ChartDataResult> {
    const candleCount = count ?? DEFAULT_CANDLE_COUNT[interval];
    this.isLoading$.next(true);

    return this.apollo
      .query<{ stockPriceConnection: StockPriceConnection }>({
        query: STOCK_PRICE_CONNECTION,
        variables: { symbol, interval, before: beforeCursor, first: candleCount, fqn },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => this.transformToChartData(result.data.stockPriceConnection)),
        tap((data) => {
          this.isLoading$.next(false);
          // Merge with existing cache
          this.appendOlderData(symbol, interval, data);
        }),
        catchError((error) => {
          console.error('[ChartDataService] Failed to load older data:', error);
          this.isLoading$.next(false);
          return of<ChartDataResult>({ candles: [], pageInfo: this.emptyPageInfo(), totalCount: 0 });
        }),
      );
  }

  /**
   * Load newer data (for intraday updates or real-time)
   * Uses afterCursor to fetch data AFTER the newest loaded candle
   */
  loadNewerData(
    symbol: string,
    interval: ChartInterval,
    afterCursor: string,
    count?: number,
    fqn?: string,
  ): Observable<ChartDataResult> {
    const candleCount = count ?? DEFAULT_CANDLE_COUNT[interval];
    this.isLoading$.next(true);

    return this.apollo
      .query<{ stockPriceConnection: StockPriceConnection }>({
        query: STOCK_PRICE_CONNECTION,
        variables: { symbol, interval, after: afterCursor, first: candleCount, fqn },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => this.transformToChartData(result.data.stockPriceConnection)),
        tap((data) => {
          this.isLoading$.next(false);
          // Merge with existing cache
          this.prependNewerData(symbol, interval, data);
        }),
        catchError((error) => {
          console.error('[ChartDataService] Failed to load newer data:', error);
          this.isLoading$.next(false);
          return of<ChartDataResult>({ candles: [], pageInfo: this.emptyPageInfo(), totalCount: 0 });
        }),
      );
  }

  /**
   * Load chart data for a specific date range (recommended for progressive loading on zoom out)
   * This is simpler than cursor pagination when you know the date range you need.
   */
  loadDataByRange(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: ChartInterval = 'DAILY',
    fqn?: string,
  ): Observable<ChartDataResult> {
    this.isLoading$.next(true);

    // Map frontend interval names to backend enum values
    const backendInterval = this.mapIntervalToBackend(interval);

    return this.apollo
      .query<{ chartDataRange: StockPriceConnection }>({
        query: CHART_DATA_RANGE,
        variables: {
          symbol,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          interval: backendInterval,
          fqn,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => this.transformToChartData(result.data.chartDataRange)),
        tap(() => {
          this.isLoading$.next(false);
        }),
        catchError((error) => {
          console.error('[ChartDataService] Failed to load data by range:', error);
          this.isLoading$.next(false);
          return of<ChartDataResult>({ candles: [], pageInfo: this.emptyPageInfo(), totalCount: 0 });
        }),
      );
  }

  /**
   * Map frontend interval names to backend StockPriceInterval enum values
   */
  private mapIntervalToBackend(interval: ChartInterval | string): ChartInterval {
    const intervalMap: Record<string, ChartInterval> = {
      ONE_MINUTE: 'MIN_1',
      FIVE_MINUTE: 'MIN_5',
      FIFTEEN_MINUTE: 'MIN_15',
      THIRTY_MINUTE: 'MIN_30',
      HOURLY: 'MIN_60',
      '60min': 'MIN_60',
      '1min': 'MIN_1',
      '5min': 'MIN_5',
      '15min': 'MIN_15',
      '30min': 'MIN_30',
      DAILY: 'DAILY',
      daily: 'DAILY',
      WEEKLY: 'WEEKLY',
      weekly: 'WEEKLY',
      MONTHLY: 'MONTHLY',
      monthly: 'MONTHLY',
    };
    return intervalMap[interval] || 'DAILY';
  }

  /**
   * Get current quote for real-time candle update
   */
  getQuote(symbol: string, fqn?: string): Observable<QuoteUpdate | null> {
    return this.apollo
      .query<{ quote: QuoteUpdate }>({
        query: QUOTE_QUERY,
        variables: { symbol, fqn },
        fetchPolicy: 'network-only', // Always fresh
      })
      .pipe(
        map((result) => result.data.quote),
        tap((quote) => this.currentQuote.set(quote)),
        catchError((error) => {
          console.error('[ChartDataService] Failed to get quote:', error);
          return of(null);
        }),
      );
  }

  /**
   * Start real-time quote polling during market hours
   */
  startQuotePolling(symbol: string, fqn?: string): Observable<QuoteUpdate | null> {
    this.stopQuotePolling$.next(); // Stop any existing polling

    return interval(this.quoteRefreshInterval).pipe(
      filter(() => this.isMarketOpen()),
      switchMap(() => this.getQuote(symbol, fqn)),
      takeUntil(this.stopQuotePolling$),
    );
  }

  /**
   * Stop quote polling
   */
  stopQuotePolling(): void {
    this.stopQuotePolling$.next();
  }

  /**
   * Check data availability for a symbol/interval without fetching
   */
  checkDataAvailability(symbol: string, interval: ChartInterval): Observable<ChartDataAvailability | null> {
    return this.apollo
      .query<{ chartDataAvailability: ChartDataAvailability }>({
        query: CHART_DATA_AVAILABILITY,
        variables: { symbol, interval },
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.chartDataAvailability),
        catchError((error) => {
          console.error('[ChartDataService] Failed to check data availability:', error);
          return of(null);
        }),
      );
  }

  /**
   * Get cached chart data for a symbol/interval
   */
  getCachedData(symbol: string, interval: ChartInterval): ChartDataResult | undefined {
    return this.chartDataCache.get(this.getCacheKey(symbol, interval));
  }

  /**
   * Clear cache for a symbol/interval or all cache
   */
  clearCache(symbol?: string, interval?: ChartInterval): void {
    if (symbol && interval) {
      this.chartDataCache.delete(this.getCacheKey(symbol, interval));
    } else {
      this.chartDataCache.clear();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Check if US stock market is open
   */
  private isMarketOpen(): boolean {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = nyTime.getDay();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Weekday check (Mon-Fri)
    if (day === 0 || day === 6) return false;

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = hour > 9 || (hour === 9 && minute >= 30);
    const marketClose = hour < 16;

    return marketOpen && marketClose;
  }

  /**
   * Transform GraphQL response to ChartDataResult
   * Backend returns data newest-first for pagination efficiency,
   * but charts need oldest-first ordering.
   */
  private transformToChartData(connection: StockPriceConnection): ChartDataResult {
    const candles = connection.edges.map((edge) => ({
      date: new Date(edge.node.date),
      open: edge.node.open,
      high: edge.node.high,
      low: edge.node.low,
      close: edge.node.close,
      volume: edge.node.volume,
      adjustedClose: edge.node.adjustedClose ?? undefined,
    }));

    // Sort candles chronologically (oldest first) for chart rendering
    candles.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      candles,
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount,
    };
  }

  /**
   * Create an empty PageInfo object
   */
  private emptyPageInfo(): PageInfo {
    return {
      hasOlderData: false,
      hasNewerData: false,
      oldestDate: null,
      newestDate: null,
      startCursor: null,
      endCursor: null,
    };
  }

  /**
   * Generate cache key for symbol+interval
   */
  private getCacheKey(symbol: string, interval: ChartInterval): string {
    return `${symbol.toUpperCase()}:${interval}`;
  }

  /**
   * Cache chart data
   */
  private cacheChartData(symbol: string, interval: ChartInterval, data: ChartDataResult): void {
    this.chartDataCache.set(this.getCacheKey(symbol, interval), data);
  }

  /**
   * Append older data to existing cache
   */
  private appendOlderData(symbol: string, interval: ChartInterval, newData: ChartDataResult): void {
    const key = this.getCacheKey(symbol, interval);
    const existing = this.chartDataCache.get(key);

    if (existing) {
      const merged: ChartDataResult = {
        candles: [...existing.candles, ...newData.candles],
        pageInfo: {
          ...existing.pageInfo,
          hasOlderData: newData.pageInfo.hasOlderData,
          oldestDate: newData.pageInfo.oldestDate,
          endCursor: newData.pageInfo.endCursor,
        },
        totalCount: existing.totalCount,
      };
      this.chartDataCache.set(key, merged);
    } else {
      this.chartDataCache.set(key, newData);
    }
  }

  /**
   * Prepend newer data to existing cache
   */
  private prependNewerData(symbol: string, interval: ChartInterval, newData: ChartDataResult): void {
    const key = this.getCacheKey(symbol, interval);
    const existing = this.chartDataCache.get(key);

    if (existing) {
      const merged: ChartDataResult = {
        candles: [...newData.candles, ...existing.candles],
        pageInfo: {
          ...existing.pageInfo,
          hasNewerData: newData.pageInfo.hasNewerData,
          newestDate: newData.pageInfo.newestDate,
          startCursor: newData.pageInfo.startCursor,
        },
        totalCount: existing.totalCount,
      };
      this.chartDataCache.set(key, merged);
    } else {
      this.chartDataCache.set(key, newData);
    }
  }
}
