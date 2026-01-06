# Chart Data Backend Requirements

**Created:** January 6, 2026

This document outlines the backend GraphQL schema changes needed to fully support the new chart data features implemented in the frontend.

---

## Summary of Frontend Changes

The frontend has been updated with:
1. **Extended Hours Toggle** - Show pre-market and after-hours trading data
2. **Dividends Reinvested Toggle** - Show total return view with dividends reinvested
3. **Raw Data Toggle** - Show raw data without anomaly filtering
4. **Corporate Actions Toggle** - Show split/dividend markers on chart

---

## Required Schema Changes

### 1. Update `stockPriceConnection` Query Arguments

Add the following optional arguments:

```graphql
stockPriceConnection(
  symbol: String!
  interval: StockPriceInterval = DAILY
  before: String
  after: String
  first: Int = 252
  fqn: String
  
  # NEW: Data adjustment options
  """Include pre-market and after-hours trading data (default: false)"""
  includeExtendedHours: Boolean
  
  """Adjust prices for dividend reinvestment - total return view (default: false)"""
  adjustForDividends: Boolean
  
  """Include raw data without anomaly filtering (default: false)"""
  includeRawData: Boolean
): StockPriceConnection
```

### 2. Update `chartDataRange` Query Arguments

Same arguments should be added to `chartDataRange`:

```graphql
chartDataRange(
  symbol: String!
  interval: StockPriceInterval = DAILY
  startDate: DateTime!
  endDate: DateTime!
  fqn: String
  
  # NEW: Data adjustment options
  includeExtendedHours: Boolean
  adjustForDividends: Boolean
  includeRawData: Boolean
): StockPriceConnection
```

### 3. Update `StockPriceNode` Type

Add corporate action fields:

```graphql
type StockPriceNode {
  id: ID!
  symbol: String!
  date: DateTime!
  interval: String!
  open: Float!
  high: Float!
  low: Float!
  close: Float!
  volume: Float!
  adjustedClose: Float
  
  # NEW: Corporate action fields
  """Split ratio: 1.0 = no split, 4.0 = 4:1 split, 0.5 = 1:2 reverse split"""
  splitCoefficient: Float
  
  """Dividend paid per share: 0.0 = no dividend"""
  dividendAmount: Float
}
```

---

## Expected Behavior

### `includeExtendedHours: Boolean`

| Value | Behavior |
|-------|----------|
| `false` (default) | Regular trading hours only (9:30 AM - 4:00 PM ET) |
| `true` | Include pre-market (4:00 AM - 9:30 AM) and after-hours (4:00 PM - 8:00 PM) |

### `adjustForDividends: Boolean`

| Value | Behavior |
|-------|----------|
| `false` (default) | Prices are split-adjusted only (matches Yahoo Finance, TradingView) |
| `true` | All OHLC prices scaled by `adjustedClose / close` ratio for total return view |

### `includeRawData: Boolean`

| Value | Behavior |
|-------|----------|
| `false` (default) | Filter out anomalies (extreme wicks, volume spikes, gap trades) |
| `true` | Return all data including flagged anomalies |

### `splitCoefficient: Float`

| Value | Meaning |
|-------|---------|
| `1.0` | No split on this date |
| `2.0` | 2:1 split (each share became 2) |
| `4.0` | 4:1 split |
| `0.5` | 1:2 reverse split (2 shares became 1) |

### `dividendAmount: Float`

| Value | Meaning |
|-------|---------|
| `0.0` or `null` | No dividend on this date |
| `> 0` | Dividend paid per share (e.g., `1.25` = $1.25 dividend) |

---

## Frontend Usage

The frontend passes these parameters in the GraphQL queries:

```typescript
// In chart-data.service.ts
this.apollo.query({
  query: STOCK_PRICE_CONNECTION,
  variables: {
    symbol,
    interval,
    first: candleCount,
    fqn,
    includeExtendedHours: options?.includeExtendedHours ?? false,
    adjustForDividends: options?.adjustForDividends ?? false,
    includeRawData: options?.includeRawData ?? false,
  },
});
```

The frontend also requests `splitCoefficient` and `dividendAmount` fields and uses them to render markers on the chart when the "Show Corporate Actions" toggle is enabled.

---

## UI Toggle Mapping

| UI Toggle | GraphQL Parameter | Default |
|-----------|------------------|---------|
| "Extended Hours On/Off" | `includeExtendedHours` | `false` |
| "Dividends Reinvested" | `adjustForDividends` | `false` |
| "Show Raw Data" | `includeRawData` | `false` |
| "Show Corporate Actions" | N/A (uses `splitCoefficient`/`dividendAmount` fields) | `false` |

---

## Notes

- The frontend is already built to pass these parameters and parse the response fields
- Until the backend schema is updated, these parameters will be ignored
- Once backend adds these fields, the toggles will automatically start working
- Corporate actions markers use ECharts `markLine` to draw vertical lines at split/dividend dates

---

## Frontend Files Modified

The following frontend files were updated to support these features:

### `src/app/terminal/chart-data.service.ts`
- Added `ChartDataOptions` interface
- Updated `STOCK_PRICE_CONNECTION` query with new parameters
- Updated `CHART_DATA_RANGE` query with new parameters  
- Added `splitCoefficient` and `dividendAmount` to `ChartCandle` interface
- Updated `loadChartData()` to accept `ChartDataOptions`

### `src/app/terminal/chart-config.service.ts`
- Added `buildCorporateActionMarkers()` method
- Updated `buildChartFromCandles()` to accept `showCorporateActions` option
- Corporate actions render as vertical dashed lines with labels

### `src/app/terminal/watchlist-tab/watchlist-tab.component.ts`
- Added signals: `showExtendedHours`, `showDividendsReinvested`, `showRawData`, `showCorporateActions`
- Added toggle methods for each signal
- Updated `loadChartWithOptions()` to pass options to service

### `src/app/terminal/watchlist-tab/watchlist-tab.component.html`
- Enabled "Extended Hours" and "Dividends Reinvested" buttons
- Added "Show Raw Data" button
- Added "Show Corporate Actions" button

