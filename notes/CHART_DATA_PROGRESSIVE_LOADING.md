# Chart Data Progressive Loading Architecture

**Created:** January 1, 2026\
**Status:** Backend Implemented, Frontend Integration Ready

______________________________________________________________________

## Implementation Status

### ✅ Completed (Backend)

**GraphQL Types & Queries:**

- `StockPriceConnection` - Relay-style connection type
- `StockPriceNode` - Individual candle data type
- `StockPriceEdge` - Edge with cursor
- `StockPricePageInfo` - Pagination info with `hasOlderData`, `hasNewerData`
- `QuoteType` - Real-time quote data type
- `ChartDataAvailability` - Data availability check
- `stockPriceConnection` query with cursor pagination
- `quote` query for current price (with live Alpha Vantage fallback)
- `chartDataAvailability` query

**Real-Time Quote Infrastructure:**

- `RealTimeDataProvider` interface (`data/providers/realtime.py`)
- `AlphaVantageQuoteProvider` - Polling-based implementation (`data/providers/alpha_vantage_quotes.py`)
- `QuoteBroadcaster` - WebSocket broadcasting service (`data/services/quote_broadcaster.py`)
- Quote subscription via WebSocket (`subscribe_symbols` action)
- Celery Beat schedule for quote refresh every 5 seconds during market hours

**Celery Beat Tasks:**

- `refresh_active_quotes` - Every 5 seconds during market hours
- `nightly_candle_refresh` - 2 AM daily
- `weekly_stock_metadata_refresh` - Sunday 3 AM
- `daily_duplicate_cleanup` - 4 AM daily

### Frontend Integration Required

- Apollo Client cache configuration for pagination merging
- ChartDataService implementation
- Zoom/scroll event handlers with preloading
- Real-time quote subscription via WebSocket

______________________________________________________________________

## Available Backend APIs

### 1. chartDataRange Query (NEW - Recommended for Zoom)

Fetch chart data for a specific date range. This is the **recommended API** for progressive loading when the user zooms out.

```graphql
query ChartDataRange($symbol: String!, $startDate: DateTime!, $endDate: DateTime!, $interval: StockPriceInterval) {
  chartDataRange(
    symbol: $symbol
    startDate: $startDate
    endDate: $endDate
    interval: $interval
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
      }
      cursor
    }
    pageInfo {
      hasOlderData
      hasNewerData
      oldestDate
      newestDate
    }
    totalCount
  }
}
```

**Usage:** When user zooms out and `dataZoomEnd` approaches 0%, calculate the needed date range and fetch:

```typescript
// Example: User zoomed out, need data from 2023-01-01 to 2024-01-01
this.apollo.query({
  query: CHART_DATA_RANGE,
  variables: {
    symbol: 'AAPL',
    startDate: '2023-01-01T00:00:00Z',
    endDate: '2024-01-01T00:00:00Z',
    interval: 'DAILY'
  }
}).subscribe(result => {
  // Append to existing data
  this.candles = [...this.candles, ...result.data.chartDataRange.edges.map(e => e.node)];
});
```

### 2. stockPriceConnection Query (Cursor-based)

Relay-style cursor pagination for infinite scroll patterns.

```graphql
query StockPriceConnection($symbol: String!, $interval: StockPriceInterval, $before: String, $first: Int) {
  stockPriceConnection(
    symbol: $symbol
    interval: $interval
    before: $before  # Cursor from previous pageInfo.endCursor
    first: $first    # Default: 252 (1 year of daily data)
  ) {
    edges { ... }
    pageInfo {
      hasOlderData
      endCursor  # Use this for next "before" parameter
    }
  }
}
```

### 3. WebSocket Quote Subscription

Real-time price updates during market hours via the terminal WebSocket.

**Subscribe:**
```typescript
terminalWebSocket.send({
  action: 'subscribe_symbols',
  symbols: ['AAPL', 'MSFT']
});
```

**Receive updates:**
```typescript
terminalWebSocket.messages$.pipe(
  filter(msg => msg.type === 'symbol.update')
).subscribe(quote => {
  // Update current candle
  this.updateCurrentCandle(quote);
});
```

**Quote update format:**
```typescript
interface SymbolUpdate {
  type: 'symbol.update';
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
}
```

### 4. quote Query (Fallback)

One-time quote fetch when WebSocket isn't available:

```graphql
query Quote($symbol: String!) {
  quote(symbol: $symbol) {
    symbol
    price
    open
    high
    low
    volume
    timestamp
    change
    changePercent
  }
}
```

______________________________________________________________________

## Overview

This document describes the architecture for progressive loading of chart data using Relay-style cursor pagination. The
system enables smooth zooming and scrolling by:

1. **Loading data on-demand** - Start with recent data, fetch older data as user zooms out
2. **Interval-based organization** - Data is organized by interval (daily, hourly, etc.)
3. **Real-time updates** - Current candle updated via quote API during market hours
4. **Intelligent caching** - Data loaded once doesn't need re-fetching
5. **Preloading** - Next data chunk prefetched before user reaches it

______________________________________________________________________

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ Chart View  │  │ Zoom/Scroll │  │ Quote Subscription          │ │
│  │             │◄─┤ Controller  │  │ (WebSocket /ws/graphql/)    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬──────────────┘ │
│         │                │                         │                 │
│         ▼                ▼                         ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Apollo Client Cache                             │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │   │
│  │  │ AAPL:daily   │ │ AAPL:hourly  │ │ MSFT:daily   │  ...    │   │
│  │  │ [2024-2025]  │ │ [last 30d]   │ │ [2024-2025]  │         │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ GraphQL over WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Backend                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   GraphQL Schema                             │   │
│  │  stockPriceConnection(symbol, interval, before, first)      │   │
│  │  subscribeQuote(symbols) → real-time quote stream           │   │
│  └──────────────────────────────┬──────────────────────────────┘   │
│                                 │                                    │
│  ┌──────────────────────────────▼──────────────────────────────┐   │
│  │                  ChartDataService                            │   │
│  │  1. Check cache (StockPrice model)                          │   │
│  │  2. Identify gaps                                            │   │
│  │  3. Fetch missing from Alpha Vantage                        │   │
│  │  4. Trigger preload of next chunk                           │   │
│  └──────────────────────────────┬──────────────────────────────┘   │
│                                 │                                    │
│  ┌──────────────────────────────▼──────────────────────────────┐   │
│  │                  Data Layer                                  │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │   │
│  │  │ StockPrice DB │  │ Redis Cache   │  │ Alpha Vantage  │  │   │
│  │  │ (historical)  │  │ (hot quotes)  │  │ Adapter        │  │   │
│  │  └───────────────┘  └───────────────┘  └────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Celery Beat Tasks                           │   │
│  │  • Nightly: Refresh yesterday's candle (2 AM)               │   │
│  │  • Market hours: Quote refresh every 5 sec                  │   │
│  │  • Weekly: Prefetch popular symbols                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

______________________________________________________________________

## Data Flow

### Initial Load (Daily Interval)

```
User opens chart for AAPL
    │
    ▼
Frontend: Query stockPriceConnection(symbol: "AAPL", interval: DAILY, first: 252)
    │
    ▼
Backend: Check StockPrice for last 252 trading days
    │
    ├─► Data exists → Return immediately
    │
    └─► Data missing → Fetch from Alpha Vantage → Store → Return
    │
    ▼
Frontend receives:
{
  "stockPriceConnection": {
    "edges": [
      { "node": { "date": "2025-01-01", "open": 150, "high": 152, ... }, "cursor": "MjAyNS0wMS0wMQ==" },
      ...
    ],
    "pageInfo": {
      "hasOlderData": true,
      "oldestDate": "2024-01-02",
      "newestDate": "2025-01-01",
      "endCursor": "MjAyNC0wMS0wMg=="
    }
  }
}
```

### Zoom Out (Fetch Older Data)

```
User zooms out, needs data before 2024-01-02
    │
    ▼
Frontend: Query stockPriceConnection(
  symbol: "AAPL", 
  interval: DAILY, 
  before: "MjAyNC0wMS0wMg==",  // cursor for 2024-01-02
  first: 252                    // next year of data
)
    │
    ▼
Backend: Fetch data from 2023-01-01 to 2024-01-01
    │
    ▼
Frontend: Append to existing cache, update chart
```

### Real-time Quote Updates

```
WebSocket Connection established
    │
    ▼
Frontend: Subscribe to AAPL quotes
    │
    ▼
Every 5 seconds during market hours:
    │
    ▼
Backend broadcasts:
{
  "type": "quote.update",
  "symbol": "AAPL", 
  "price": 152.35,
  "open": 151.00,
  "high": 153.20,
  "low": 150.80,
  "volume": 12345678,
  "timestamp": "2025-01-01T14:30:00Z"
}
    │
    ▼
Frontend: Update current candle in chart
```

______________________________________________________________________

## GraphQL Schema

### Types

```graphql
enum ChartInterval {
  ONE_MINUTE
  FIVE_MINUTE
  FIFTEEN_MINUTE
  THIRTY_MINUTE
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
}

type StockPriceNode implements Node {
  id: ID!                    # Relay global ID
  symbol: String!
  date: DateTime!
  interval: ChartInterval!
  open: Float!
  high: Float!
  low: Float!
  close: Float!
  volume: Float!
  adjustedClose: Float
}

type StockPriceEdge {
  node: StockPriceNode!
  cursor: String!            # Base64-encoded date
}

type StockPricePageInfo {
  hasOlderData: Boolean!     # More historical data available
  hasNewerData: Boolean!     # More recent data available (for intraday)
  oldestDate: DateTime       # Oldest date in current result
  newestDate: DateTime       # Newest date in current result
  startCursor: String        # Cursor for newest
  endCursor: String          # Cursor for oldest
}

type StockPriceConnection {
  edges: [StockPriceEdge!]!
  pageInfo: StockPricePageInfo!
  totalCount: Int            # Total available for this symbol/interval
}

type QuoteUpdate {
  symbol: String!
  price: Float!
  open: Float!
  high: Float!
  low: Float!
  previousClose: Float!
  volume: Float!
  timestamp: DateTime!
  changePercent: Float!
}
```

### Queries

```graphql
type Query {
  # Main chart data query with cursor pagination
  stockPriceConnection(
    symbol: String!
    interval: ChartInterval!
    before: String           # Cursor: fetch data BEFORE this date
    after: String            # Cursor: fetch data AFTER this date
    first: Int               # Number of records (default: 252 for daily)
    fqn: String              # Optional: FQN for disambiguation
  ): StockPriceConnection!
  
  # Quick quote for current price
  quote(symbol: String!, fqn: String): QuoteUpdate
  
  # Check data availability without fetching
  chartDataAvailability(
    symbol: String!
    interval: ChartInterval!
  ): ChartDataAvailability!
}

type ChartDataAvailability {
  symbol: String!
  interval: ChartInterval!
  oldestDate: DateTime
  newestDate: DateTime
  totalRecords: Int!
  lastUpdated: DateTime
  gaps: [DateRange!]         # Any gaps in the data
}

type DateRange {
  start: DateTime!
  end: DateTime!
}
```

### Subscriptions (Future)

```graphql
type Subscription {
  quoteUpdates(symbols: [String!]!): QuoteUpdate!
}
```

______________________________________________________________________

## Frontend Integration Guide

### Installation

```bash
npm install @apollo/client graphql graphql-ws date-fns
```

### Apollo Client Setup for Chart Data

```typescript
// src/app/graphql/chart-cache.ts
import { InMemoryCache } from '@apollo/client';

export const chartCache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        stockPriceConnection: {
          // Unique cache key per symbol + interval
          keyArgs: ['symbol', 'interval'],
          
          // Merge new data with existing
          merge(existing, incoming, { args }) {
            if (!existing) return incoming;
            
            // If fetching older data (before cursor), append to end
            if (args?.before) {
              return {
                ...incoming,
                edges: [...existing.edges, ...incoming.edges],
                pageInfo: {
                  ...incoming.pageInfo,
                  newestDate: existing.pageInfo.newestDate,
                  startCursor: existing.pageInfo.startCursor,
                }
              };
            }
            
            // If fetching newer data (after cursor), prepend
            if (args?.after) {
              return {
                ...incoming,
                edges: [...incoming.edges, ...existing.edges],
                pageInfo: {
                  ...incoming.pageInfo,
                  oldestDate: existing.pageInfo.oldestDate,
                  endCursor: existing.pageInfo.endCursor,
                }
              };
            }
            
            return incoming;
          }
        }
      }
    }
  }
});
```

### Chart Data Service

```typescript
// src/app/chart/chart-data.service.ts
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, filter, switchMap, takeUntil } from 'rxjs/operators';

// GraphQL Queries
const STOCK_PRICE_CONNECTION = gql`
  query StockPriceConnection(
    $symbol: String!
    $interval: ChartInterval!
    $before: String
    $first: Int
  ) {
    stockPriceConnection(
      symbol: $symbol
      interval: $interval
      before: $before
      first: $first
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
  query Quote($symbol: String!) {
    quote(symbol: $symbol) {
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

export interface ChartCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartInterval = 
  | 'ONE_MINUTE' 
  | 'FIVE_MINUTE' 
  | 'FIFTEEN_MINUTE'
  | 'THIRTY_MINUTE'
  | 'HOURLY' 
  | 'DAILY' 
  | 'WEEKLY' 
  | 'MONTHLY';

@Injectable({ providedIn: 'root' })
export class ChartDataService {
  private currentSymbol$ = new BehaviorSubject<string | null>(null);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private quoteRefreshInterval = 5000; // 5 seconds

  constructor(private apollo: Apollo) {}

  /**
   * Load initial chart data for a symbol
   */
  loadChartData(
    symbol: string, 
    interval: ChartInterval = 'DAILY',
    count: number = 252  // ~1 year of trading days
  ): Observable<ChartDataResult> {
    this.currentSymbol$.next(symbol);
    this.isLoading$.next(true);

    return this.apollo.query<{ stockPriceConnection: StockPriceConnection }>({
      query: STOCK_PRICE_CONNECTION,
      variables: { symbol, interval, first: count }
    }).pipe(
      map(result => this.transformToChartData(result.data.stockPriceConnection)),
      tap(() => this.isLoading$.next(false))
    );
  }

  /**
   * Load older historical data (when user zooms out)
   * @param beforeCursor - Cursor from pageInfo.endCursor
   */
  loadOlderData(
    symbol: string,
    interval: ChartInterval,
    beforeCursor: string,
    count: number = 252
  ): Observable<ChartDataResult> {
    return this.apollo.query<{ stockPriceConnection: StockPriceConnection }>({
      query: STOCK_PRICE_CONNECTION,
      variables: { symbol, interval, before: beforeCursor, first: count }
    }).pipe(
      map(result => this.transformToChartData(result.data.stockPriceConnection))
    );
  }

  /**
   * Get current quote for real-time candle update
   */
  getQuote(symbol: string): Observable<QuoteUpdate> {
    return this.apollo.query<{ quote: QuoteUpdate }>({
      query: QUOTE_QUERY,
      variables: { symbol },
      fetchPolicy: 'network-only'  // Always fresh
    }).pipe(
      map(result => result.data.quote)
    );
  }

  /**
   * Start real-time quote polling during market hours
   */
  startQuotePolling(symbol: string): Observable<QuoteUpdate> {
    return interval(this.quoteRefreshInterval).pipe(
      filter(() => this.isMarketOpen()),
      switchMap(() => this.getQuote(symbol)),
      takeUntil(this.currentSymbol$.pipe(filter(s => s !== symbol)))
    );
  }

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

  private transformToChartData(connection: StockPriceConnection): ChartDataResult {
    return {
      candles: connection.edges.map(edge => ({
        date: new Date(edge.node.date),
        open: edge.node.open,
        high: edge.node.high,
        low: edge.node.low,
        close: edge.node.close,
        volume: edge.node.volume,
      })),
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount
    };
  }
}

// Types
interface StockPriceConnection {
  edges: Array<{
    node: {
      id: string;
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      adjustedClose: number;
    };
    cursor: string;
  }>;
  pageInfo: PageInfo;
  totalCount: number;
}

interface PageInfo {
  hasOlderData: boolean;
  hasNewerData: boolean;
  oldestDate: string;
  newestDate: string;
  startCursor: string;
  endCursor: string;
}

interface ChartDataResult {
  candles: ChartCandle[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface QuoteUpdate {
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
```

### Chart Component with Zoom/Scroll

```typescript
// src/app/chart/chart.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { ChartDataService, ChartCandle, ChartInterval } from './chart-data.service';

@Component({
  selector: 'app-chart',
  template: `
    <div class="chart-container" #chartContainer>
      <div class="chart-controls">
        <select [(ngModel)]="currentInterval" (change)="onIntervalChange()">
          <option value="DAILY">Daily</option>
          <option value="HOURLY">Hourly</option>
          <option value="FIFTEEN_MINUTE">15 Min</option>
        </select>
      </div>
      
      <div class="chart-canvas" 
           (wheel)="onWheel($event)"
           (mousedown)="onDragStart($event)">
        <!-- Your chart library renders here -->
        <canvas #canvas></canvas>
      </div>
      
      <div *ngIf="isLoading" class="loading-overlay">
        Loading more data...
      </div>
    </div>
  `
})
export class ChartComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  
  private destroy$ = new Subject<void>();
  private zoomRequest$ = new Subject<void>();
  
  symbol: string = 'AAPL';
  currentInterval: ChartInterval = 'DAILY';
  candles: ChartCandle[] = [];
  pageInfo: PageInfo | null = null;
  isLoading = false;
  
  // Zoom state
  private zoomLevel = 1;
  private minZoom = 0.1;  // Max zoom out
  private maxZoom = 5;    // Max zoom in
  
  // Visible range
  private visibleStartIndex = 0;
  private visibleEndIndex = 100;

  constructor(private chartData: ChartDataService) {}

  ngOnInit() {
    this.loadInitialData();
    this.setupZoomDebounce();
    this.startQuotePolling();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData() {
    this.isLoading = true;
    this.chartData.loadChartData(this.symbol, this.currentInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.candles = result.candles;
        this.pageInfo = result.pageInfo;
        this.isLoading = false;
        this.renderChart();
        
        // Preload next chunk if there's more data
        if (result.pageInfo.hasOlderData) {
          this.preloadNextChunk();
        }
      });
  }

  private setupZoomDebounce() {
    // Debounce zoom requests to avoid hammering the API
    this.zoomRequest$
      .pipe(
        debounceTime(200),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.checkAndLoadMoreData());
  }

  private startQuotePolling() {
    this.chartData.startQuotePolling(this.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe(quote => {
        this.updateCurrentCandle(quote);
      });
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    
    // Adjust zoom level
    const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * zoomDelta));
    
    // Trigger data check
    this.zoomRequest$.next();
    
    // Re-render chart
    this.renderChart();
  }

  onDragStart(event: MouseEvent) {
    // Implement pan/scroll behavior
    const startX = event.clientX;
    const startIndex = this.visibleStartIndex;
    
    const onMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const indexDelta = Math.floor(deltaX / 10);  // Adjust sensitivity
      this.visibleStartIndex = Math.max(0, startIndex - indexDelta);
      this.renderChart();
      this.zoomRequest$.next();
    };
    
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  onIntervalChange() {
    // Clear existing data and reload
    this.candles = [];
    this.pageInfo = null;
    this.loadInitialData();
  }

  private checkAndLoadMoreData() {
    if (!this.pageInfo?.hasOlderData || this.isLoading) return;
    
    // Calculate how much historical data we're showing
    const visibleRange = this.getVisibleDateRange();
    const dataRange = this.getDataDateRange();
    
    // If we're showing data near the oldest available, fetch more
    const threshold = 50; // candles
    if (this.visibleStartIndex < threshold) {
      this.loadMoreHistoricalData();
    }
  }

  private loadMoreHistoricalData() {
    if (!this.pageInfo?.endCursor || this.isLoading) return;
    
    this.isLoading = true;
    this.chartData.loadOlderData(
      this.symbol, 
      this.currentInterval, 
      this.pageInfo.endCursor
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        // Append older data
        this.candles = [...this.candles, ...result.candles];
        this.pageInfo = result.pageInfo;
        this.isLoading = false;
        this.renderChart();
        
        // Preload next chunk
        if (result.pageInfo.hasOlderData) {
          this.preloadNextChunk();
        }
      });
  }

  private preloadNextChunk() {
    // Fire and forget - preload next chunk in background
    if (!this.pageInfo?.endCursor || !this.pageInfo.hasOlderData) return;
    
    this.chartData.loadOlderData(
      this.symbol,
      this.currentInterval,
      this.pageInfo.endCursor,
      252  // 1 year
    ).subscribe({
      next: () => console.log('Preloaded next chunk'),
      error: (e) => console.warn('Preload failed:', e)
    });
  }

  private updateCurrentCandle(quote: QuoteUpdate) {
    if (this.candles.length === 0) return;
    
    // Update or create today's candle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCandle = this.candles.find(c => 
      c.date.toDateString() === today.toDateString()
    );
    
    if (todayCandle) {
      // Update existing candle
      todayCandle.high = Math.max(todayCandle.high, quote.high);
      todayCandle.low = Math.min(todayCandle.low, quote.low);
      todayCandle.close = quote.price;
      todayCandle.volume = quote.volume;
    } else {
      // Create new candle for today
      this.candles.unshift({
        date: today,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.price,
        volume: quote.volume
      });
    }
    
    this.renderChart();
  }

  private renderChart() {
    // Your chart rendering logic here
    // e.g., using lightweight-charts, d3, or canvas directly
  }

  private getVisibleDateRange(): { start: Date; end: Date } {
    const visibleCandles = this.candles.slice(
      this.visibleStartIndex, 
      this.visibleEndIndex
    );
    return {
      start: visibleCandles[visibleCandles.length - 1]?.date || new Date(),
      end: visibleCandles[0]?.date || new Date()
    };
  }

  private getDataDateRange(): { start: Date; end: Date } {
    return {
      start: this.candles[this.candles.length - 1]?.date || new Date(),
      end: this.candles[0]?.date || new Date()
    };
  }
}
```

______________________________________________________________________

## Interval Switching Logic

When the user changes intervals, the chart should:

1. **Clear current data** - Different interval means different data structure
2. **Load default range** - Each interval has a sensible default:
  - Daily: 252 trading days (~1 year)
  - Hourly: 5 trading days (~40 candles)
  - 15-minute: 2 trading days (~104 candles)
3. **Start fresh pagination** - Reset cursors and pageInfo

```typescript
// Default data ranges per interval
const DEFAULT_CANDLE_COUNT: Record<ChartInterval, number> = {
  'ONE_MINUTE': 390,      // 1 trading day
  'FIVE_MINUTE': 390,     // 5 trading days
  'FIFTEEN_MINUTE': 104,  // 2 trading days
  'THIRTY_MINUTE': 260,   // 5 trading days
  'HOURLY': 168,          // ~1 month
  'DAILY': 252,           // 1 year
  'WEEKLY': 104,          // 2 years
  'MONTHLY': 60,          // 5 years
};
```

______________________________________________________________________

## Real-time Quote Integration

The backend now supports real-time quote updates via WebSocket. Quotes are refreshed every 5 seconds during market hours
and broadcast to all subscribed clients.

### WebSocket Quote Subscription

Use the existing terminal WebSocket to subscribe to quote updates:

```typescript
// src/app/chart/quote-manager.service.ts
@Injectable({ providedIn: 'root' })
export class QuoteManagerService {
  private quotes$ = new BehaviorSubject<Map<string, QuoteUpdate>>(new Map());
  private subscribedSymbols = new Set<string>();

  constructor(private terminalWebSocket: TerminalWebSocketService) {
    // Listen for quote updates from WebSocket
    this.terminalWebSocket.messages$.pipe(
      filter(msg => msg.type === 'symbol.update')
    ).subscribe(msg => {
      const quotes = this.quotes$.getValue();
      quotes.set(msg.symbol, msg);
      this.quotes$.next(quotes);
    });
  }

  /**
   * Subscribe to real-time quotes for a symbol via WebSocket
   * Backend refreshes every 5 seconds during market hours
   */
  subscribe(symbol: string): Observable<QuoteUpdate> {
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.add(symbol);
      
      // Send subscription request to backend
      this.terminalWebSocket.send({
        action: 'subscribe_symbols',
        symbols: [symbol]
      });
    }
    
    return this.quotes$.pipe(
      map(quotes => quotes.get(symbol)!),
      filter(Boolean)
    );
  }

  unsubscribe(symbol: string) {
    if (this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.delete(symbol);
      
      this.terminalWebSocket.send({
        action: 'unsubscribe_symbols',
        symbols: [symbol]
      });
    }
  }

  /**
   * Get cached quote for a symbol
   */
  getCachedQuote(symbol: string): QuoteUpdate | undefined {
    return this.quotes$.getValue().get(symbol);
  }
}
```

### Quote Update Message Format

The backend broadcasts quote updates in this format:

```typescript
interface QuoteUpdate {
  type: 'symbol.update';
  symbol: string;
  name?: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose?: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;  // ISO 8601
}
```

### How It Works

1. Frontend sends `subscribe_symbols` action with symbol list
2. Backend registers symbols with `AlphaVantageQuoteProvider`
3. Celery Beat task runs every 5 seconds during market hours
4. Task calls `refresh_quotes()` which fetches from Alpha Vantage GLOBAL_QUOTE API
5. Fresh quotes are broadcast to all WebSocket subscribers
6. Database is also updated with today's candle data

### Market Hours Detection

The backend only refreshes quotes during US market hours:

- **Pre-market:** 4:00 AM - 9:30 AM ET
- **Regular hours:** 9:30 AM - 4:00 PM ET
- **Post-market:** 4:00 PM - 8:00 PM ET

Outside these hours, the `refresh_active_quotes` task skips execution.

### GraphQL Fallback

If WebSocket is not connected, use the GraphQL `quote` query:

```typescript
private fetchQuote(symbol: string): Observable<QuoteUpdate> {
  return this.apollo.query({
    query: QUOTE_QUERY,
    variables: { symbol },
    fetchPolicy: 'network-only'
  }).pipe(map(r => r.data.quote));
}
```

The `quote` query tries the live Alpha Vantage provider first, then falls back to database.

````

---

## Preloading Strategy

### Automatic Preloading

The backend should trigger preloading when:

1. User fetches data near the edge of available data
2. Popular symbols are accessed frequently

```typescript
// Frontend: Trigger preload when approaching edge
private checkPreloadThreshold() {
  const PRELOAD_THRESHOLD = 100; // candles from edge
  
  if (this.visibleStartIndex < PRELOAD_THRESHOLD && this.pageInfo?.hasOlderData) {
    this.preloadNextChunk();
  }
}
````

### Backend Preload Task

```python
# data/tasks.py
@shared_task(name="data.tasks.preload_chart_data")
def preload_chart_data_task(symbol: str, interval: str, before_date: str):
    """Preload historical chart data in background."""
    from data.services.chart_data import ChartDataService

    service = ChartDataService()
    service.ensure_data_available(
        symbol=symbol, interval=interval, before_date=before_date, count=252  # 1 year
    )
```

______________________________________________________________________

## Caching Considerations

### Apollo Cache Strategy

```typescript
// Cache should merge paginated results intelligently
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        stockPriceConnection: {
          // Key by symbol + interval only (not cursors)
          keyArgs: ['symbol', 'interval'],
          
          // Merge function handles pagination
          merge(existing, incoming, { args }) {
            // ... merge logic from above
          }
        }
      }
    }
  }
});
```

### Backend Caching

1. **Database is the cache** - `StockPrice` model stores all fetched data
2. **Redis for hot quotes** - Current day's quotes cached in Redis (5-second TTL)
3. **Gap detection** - Before fetching, check what date ranges exist

______________________________________________________________________

## Celery Beat Schedule

```python
# copilot/celery.py
CELERY_BEAT_SCHEDULE = {
    # Refresh quotes for active charts during market hours
    "refresh-active-quotes": {
        "task": "data.tasks.refresh_active_quotes",
        "schedule": 5.0,  # Every 5 seconds
        "options": {"expires": 4},
    },
    # Nightly historical data refresh
    "nightly-candle-refresh": {
        "task": "data.tasks.nightly_candle_refresh",
        "schedule": crontab(hour=2, minute=0),  # 2 AM
    },
    # Weekly preload of popular symbols
    "weekly-popular-preload": {
        "task": "data.tasks.preload_popular_symbols",
        "schedule": crontab(day_of_week=0, hour=3),  # Sunday 3 AM
    },
}
```

______________________________________________________________________

## Migration Checklist

### Phase 1: Backend

- [x] Create `StockPriceConnection` GraphQL types
- [x] Implement cursor-based resolver
- [x] Add `chartDataRange` query for date-based fetching
- [x] Add `quote` query endpoint with live Alpha Vantage fallback
- [x] Set up Celery Beat tasks for quote refresh
- [x] WebSocket `subscribe_symbols` for real-time updates

### Phase 2: Frontend

- [ ] Update Apollo cache configuration
- [ ] Create `ChartDataService` with pagination
- [ ] Implement zoom/scroll handlers with `chartDataRange`
- [ ] Subscribe to quotes via WebSocket
- [ ] Implement preloading logic

### Phase 3: Optimization

- [ ] Add Redis caching for hot quotes
- [ ] Tune preload thresholds
- [ ] Monitor API usage and optimize batch fetching

______________________________________________________________________

## DataZoom Progressive Loading (Recommended Pattern)

This is the recommended pattern for loading more data when the user zooms out.

### How It Works

1. User loads chart with initial data (e.g., 1 year of daily candles)
2. User zooms out using ECharts dataZoom
3. When `dataZoomEnd` approaches 0%, trigger fetch for older data
4. Call `chartDataRange` with the date range you need
5. Append new data to existing candles
6. ECharts re-renders with more data

### Implementation

```typescript
// src/app/chart/chart.component.ts

export class ChartComponent implements OnInit {
  private chart: ECharts;
  private candles: Candle[] = [];
  private isLoading = false;
  private currentSymbol: string;
  private currentInterval: string = 'daily';

  constructor(
    private apollo: Apollo,
    private terminalWs: TerminalWebSocketService
  ) {}

  ngOnInit() {
    this.initChart();
    this.setupDataZoomHandler();
    this.subscribeToQuotes();
  }

  private initChart() {
    // Initialize ECharts instance
    this.chart = echarts.init(this.chartContainer.nativeElement);
    
    // Set up dataZoom event listener
    this.chart.on('datazoom', (params) => this.onDataZoom(params));
  }

  private setupDataZoomHandler() {
    // Debounced handler for dataZoom events
    this.dataZoom$ = new Subject<any>();
    this.dataZoom$.pipe(
      debounceTime(200),
      filter(() => !this.isLoading)
    ).subscribe(params => this.handleDataZoom(params));
  }

  private onDataZoom(params: any) {
    this.dataZoom$.next(params);
  }

  private handleDataZoom(params: any) {
    // Get current zoom position
    const option = this.chart.getOption();
    const dataZoom = option.dataZoom[0];
    
    // If zoomed out and approaching the left edge (oldest data)
    if (dataZoom.start <= 5 && this.hasOlderData) {
      this.loadOlderData();
    }
  }

  private loadOlderData() {
    if (this.isLoading || !this.hasOlderData) return;
    
    this.isLoading = true;
    
    // Calculate date range needed
    // Get oldest date in current data
    const oldestCandle = this.candles[this.candles.length - 1];
    const endDate = oldestCandle.date;
    
    // Go back 1 year (or appropriate amount for interval)
    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 1);

    this.apollo.query({
      query: CHART_DATA_RANGE,
      variables: {
        symbol: this.currentSymbol,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: this.currentInterval.toUpperCase()
      }
    }).subscribe({
      next: (result) => {
        const newData = result.data.chartDataRange;
        
        // Append new candles (they come in descending order)
        const newCandles = newData.edges.map(e => ({
          date: new Date(e.node.date),
          open: e.node.open,
          high: e.node.high,
          low: e.node.low,
          close: e.node.close,
          volume: e.node.volume
        }));
        
        // Merge with existing (avoid duplicates)
        this.candles = this.mergeCandles(this.candles, newCandles);
        
        // Update has older data flag
        this.hasOlderData = newData.pageInfo.hasOlderData;
        
        // Re-render chart
        this.updateChartData();
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load older data:', err);
        this.isLoading = false;
      }
    });
  }

  private mergeCandles(existing: Candle[], newData: Candle[]): Candle[] {
    // Create a map of existing dates
    const dateMap = new Map(existing.map(c => [c.date.getTime(), c]));
    
    // Add new candles that don't exist
    for (const candle of newData) {
      if (!dateMap.has(candle.date.getTime())) {
        dateMap.set(candle.date.getTime(), candle);
      }
    }
    
    // Convert back to array and sort by date descending (newest first)
    return Array.from(dateMap.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private subscribeToQuotes() {
    // Subscribe to real-time updates via WebSocket
    this.terminalWs.send({
      action: 'subscribe_symbols',
      symbols: [this.currentSymbol]
    });

    this.terminalWs.messages$.pipe(
      filter(msg => msg.type === 'symbol.update' && msg.symbol === this.currentSymbol)
    ).subscribe(quote => {
      this.updateCurrentCandle(quote);
    });
  }

  private updateCurrentCandle(quote: SymbolUpdate) {
    // Update today's candle with real-time quote
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayIndex = this.candles.findIndex(c => {
      const candleDate = new Date(c.date);
      candleDate.setHours(0, 0, 0, 0);
      return candleDate.getTime() === today.getTime();
    });

    if (todayIndex >= 0) {
      // Update existing today's candle
      this.candles[todayIndex] = {
        ...this.candles[todayIndex],
        high: Math.max(this.candles[todayIndex].high, quote.high),
        low: Math.min(this.candles[todayIndex].low, quote.low),
        close: quote.price,
        volume: quote.volume
      };
    } else {
      // Add new candle for today
      this.candles.unshift({
        date: today,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.price,
        volume: quote.volume
      });
    }

    this.updateChartData();
  }

  private updateChartData() {
    // Re-render chart with updated data
    const option = this.buildChartOption();
    this.chart.setOption(option);
  }
}
```

### GraphQL Query

```graphql
# CHART_DATA_RANGE query
query ChartDataRange(
  $symbol: String!
  $startDate: DateTime!
  $endDate: DateTime!
  $interval: StockPriceInterval
) {
  chartDataRange(
    symbol: $symbol
    startDate: $startDate
    endDate: $endDate
    interval: $interval
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
      }
    }
    pageInfo {
      hasOlderData
      hasNewerData
      oldestDate
      newestDate
    }
    totalCount
  }
}
```

### Key Points

1. **Use `chartDataRange`** for date-based fetching (simpler than cursor pagination)
2. **Debounce dataZoom events** to avoid excessive API calls
3. **Merge candles** to avoid duplicates
4. **Check `hasOlderData`** to know when to stop trying to fetch
5. **Subscribe to WebSocket** for real-time updates during market hours
6. **Update current candle** with quote data for live price display

______________________________________________________________________

## Related Documentation

- [Real-Time Quotes](REALTIME_QUOTES.md)
- [Command Routing](COMMAND_ROUTING.md)
- [GraphQL WebSocket Integration](GRAPHQL_WEBSOCKET.md)
