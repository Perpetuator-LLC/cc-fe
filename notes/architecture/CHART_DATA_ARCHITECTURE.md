# Chart Data Architecture

**Created:** January 2026  
**Status:** ✅ Backend Implemented, Frontend Integrated

---

## Overview

Progressive loading of chart data using Relay-style cursor pagination with:

1. **On-demand loading** - Start with recent data, fetch older data as user zooms out
2. **Interval-based organization** - Data by interval (daily, hourly, etc.)
3. **Real-time updates** - Current candle updated via quote API during market hours
4. **Intelligent caching** - Data loaded once doesn't need re-fetching
5. **Preloading** - Next data chunk prefetched before user reaches it

---

## Available APIs

### 1. chartDataRange Query (Recommended for Zoom)

Fetch chart data for a specific date range:

```graphql
query ChartDataRange(
  $symbol: String!
  $startDate: DateTime!
  $endDate: DateTime!
  $interval: StockPriceInterval
  $includeExtendedHours: Boolean
  $adjustForDividends: Boolean
  $includeRawData: Boolean
) {
  chartDataRange(
    symbol: $symbol
    startDate: $startDate
    endDate: $endDate
    interval: $interval
    includeExtendedHours: $includeExtendedHours
    adjustForDividends: $adjustForDividends
    includeRawData: $includeRawData
  ) {
    edges {
      node { id, date, open, high, low, close, volume, splitCoefficient, dividendAmount }
      cursor
    }
    pageInfo { hasOlderData, hasNewerData, oldestDate, newestDate }
    totalCount
  }
}
```

### 2. stockPriceConnection Query (Cursor Pagination)

Relay-style cursor pagination for infinite scroll:

```graphql
query StockPriceConnection(
  $symbol: String!
  $interval: StockPriceInterval
  $before: String
  $first: Int
) {
  stockPriceConnection(
    symbol: $symbol
    interval: $interval
    before: $before
    first: $first
  ) {
    edges { node { ... }, cursor }
    pageInfo { hasOlderData, endCursor }
  }
}
```

### 3. quote Query (Fallback)

One-time quote fetch when WebSocket isn't available:

```graphql
query Quote($symbol: String!) {
  quote(symbol: $symbol) {
    symbol, price, open, high, low, volume, 
    timestamp, change, changePercent
  }
}
```

---

## Data Adjustment Options

| Parameter | Default | Behavior |
|-----------|---------|----------|
| `includeExtendedHours` | `false` | Include pre-market (4-9:30 AM) and after-hours (4-8 PM) |
| `adjustForDividends` | `false` | Scale OHLC prices for total return view |
| `includeRawData` | `false` | Include data without anomaly filtering |

---

## Corporate Action Fields

| Field | Meaning |
|-------|---------|
| `splitCoefficient: 1.0` | No split |
| `splitCoefficient: 4.0` | 4:1 split |
| `splitCoefficient: 0.5` | 1:2 reverse split |
| `dividendAmount: 0.0` | No dividend |
| `dividendAmount: 1.25` | $1.25 dividend per share |

---

## UI Toggle Mapping

| UI Toggle | GraphQL Parameter |
|-----------|------------------|
| Extended Hours | `includeExtendedHours` |
| Dividends Reinvested | `adjustForDividends` |
| Show Raw Data | `includeRawData` |
| Show Corporate Actions | Uses `splitCoefficient`/`dividendAmount` fields |

---

## WebSocket Quote Subscription

For real-time updates during market hours:

```typescript
// Subscribe
terminalWebSocket.send({
  action: 'subscribe_symbols',
  symbols: ['AAPL', 'MSFT']
});

// Receive updates
terminalWebSocket.messages$.pipe(
  filter(msg => msg.type === 'symbol.update')
).subscribe(quote => updateCurrentCandle(quote));
```

---

## Frontend Implementation

Located in:
- `src/app/terminal/chart-data.service.ts` - Data loading and caching
- `src/app/terminal/chart-config.service.ts` - Chart configuration and corporate action markers

