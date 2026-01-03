# Real-Time Quote System - Frontend Integration Changes

**Date:** January 1, 2026

## Summary

The backend now supports real-time quote updates via WebSocket. Quotes are fetched from Alpha Vantage every 5 seconds during market hours and broadcast to all subscribed clients.

## What Changed

### Backend Implementation

1. **Real-Time Data Provider Interface** (`data/providers/realtime.py`)
   - Abstract `RealTimeDataProvider` interface
   - Can be swapped for true real-time providers (Polygon, IEX) later
   - The interface looks like real-time streaming but internally uses polling

2. **Alpha Vantage Quote Provider** (`data/providers/alpha_vantage_quotes.py`)
   - Implements `RealTimeDataProvider` using GLOBAL_QUOTE API
   - Cached quotes (1 minute TTL)
   - Market hours detection (9:30 AM - 4:00 PM ET)
   - Subscription tracking in Redis

3. **Celery Beat Tasks** (`copilot/celery.py`)
   - `refresh-active-quotes`: Every 5 seconds during market hours
   - `nightly-candle-refresh`: 2 AM daily
   - `weekly-stock-metadata-refresh`: Sunday 3 AM
   - `daily-duplicate-cleanup`: 4 AM daily

4. **Updated Terminal Consumer** (`terminal/consumers.py`)
   - `subscribe_symbols` now registers with quote provider
   - Quote updates broadcast via `symbol.update` message type

5. **GraphQL Quote Query** (`data/stock_schema.py`)
   - `quote(symbol: String!)` now tries live API first, falls back to DB

## Frontend Changes Required

### 1. Subscribe to Quotes via WebSocket

Instead of polling, subscribe via the terminal WebSocket:

```typescript
// Subscribe to symbols
terminalWs.send({
  action: 'subscribe_symbols',
  symbols: ['AAPL', 'MSFT', 'GOOGL']
});

// Listen for updates
terminalWs.messages$.pipe(
  filter(msg => msg.type === 'symbol.update')
).subscribe(quote => {
  console.log(`${quote.symbol}: $${quote.price}`);
});
```

### 2. Quote Update Message Format

```typescript
interface SymbolUpdate {
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
  timestamp: string;
}
```

### 3. Update Chart Current Candle

When you receive a `symbol.update`, update today's candle:

```typescript
function handleQuoteUpdate(quote: SymbolUpdate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentCandle = candles.find(c => 
    c.date.toDateString() === today.toDateString()
  );
  
  if (currentCandle) {
    currentCandle.high = Math.max(currentCandle.high, quote.high);
    currentCandle.low = Math.min(currentCandle.low, quote.low);
    currentCandle.close = quote.price;
    currentCandle.volume = quote.volume;
  } else {
    candles.unshift({
      date: today,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.price,
      volume: quote.volume
    });
  }
  
  renderChart();
}
```

### 4. Market Hours Awareness

Quotes only refresh during US market hours (9:30 AM - 4:00 PM ET). Outside market hours, the last quote is cached.

```typescript
function isMarketOpen(): boolean {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { 
    timeZone: 'America/New_York' 
  }));
  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  
  // Weekend
  if (day === 0 || day === 6) return false;
  
  // 9:30 AM - 4:00 PM ET
  const afterOpen = hour > 9 || (hour === 9 && minute >= 30);
  const beforeClose = hour < 16;
  
  return afterOpen && beforeClose;
}
```

### 5. Initial Quote on Subscription

When you subscribe, you immediately get the cached quote:

```typescript
// Response to subscribe_symbols
{
  type: 'symbols.subscribed',
  symbols: ['AAPL', 'MSFT']
}

// Followed by initial quote for each symbol
{
  type: 'symbol.update',
  symbol: 'AAPL',
  price: 185.50,
  ...
}
```

## Migration Steps

1. **Remove GraphQL polling for quotes** - Stop using `quote` query in intervals
2. **Add WebSocket subscription** - Use `subscribe_symbols` action
3. **Handle `symbol.update` messages** - Update chart current candle
4. **Keep GraphQL fallback** - Use `quote` query when WebSocket disconnected

## API Reference

### WebSocket Actions

| Action | Payload | Description |
|--------|---------|-------------|
| `subscribe_symbols` | `{ symbols: string[] }` | Subscribe to quote updates |
| `unsubscribe_symbols` | `{ symbols: string[] }` | Unsubscribe from quotes |

### WebSocket Messages

| Type | Description |
|------|-------------|
| `symbols.subscribed` | Confirmation of subscription |
| `symbol.update` | Quote update for a symbol |

### GraphQL Queries

```graphql
# Get current quote (fallback when WebSocket unavailable)
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
    change
    changePercent
  }
}
```

## Related Documentation

- [Chart Data Progressive Loading](./CHART_DATA_PROGRESSIVE_LOADING.md)
- [Terminal WebSocket Autocomplete](../TERMINAL_WEBSOCKET_AUTOCOMPLETE.md)

