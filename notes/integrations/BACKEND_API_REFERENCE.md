# Backend Integration Reference

**Created:** January 2026  
**Status:** Reference for implemented backend APIs

---

## Terminal System Queries

### ✅ `commands`

List available terminal commands:

```graphql
query GetCommands($isActive: Boolean) {
  commands(isActive: $isActive) {
    name
    description
    category
    aliases
    requiresSymbol
    exampleUsage
  }
}
```

### ✅ `availableCommands`

Get all commands with arguments (cache on startup):

```graphql
query {
  availableCommands {
    name
    arguments {
      name
      type
      description
      default
      required
      options  # Preset values for autocomplete
    }
  }
}
```

### ✅ `commandHistory`

Get user's command execution history with pagination:

```graphql
query GetCommandHistory($first: Int, $after: String, $search: String) {
  commandHistory(first: $first, after: $after, search: $search) {
    edges {
      node {
        id
        rawInput
        parsedCommand
        status
        result
        createdAt
      }
    }
    pageInfo { hasNextPage, endCursor }
  }
}
```

### ✅ `terminalHints`

Get terminal hints for empty states:

```graphql
query {
  terminalHints {
    quickExamples      # ["AAPL GP", "HELP", "MSFT DES"]
    placeholderText    # "Type a command or ask a question..."
    emptyStateMessage  # "Try: AAPL GP, HELP, or ask anything"
  }
}
```

### ✅ `terminalHelp`

Get full terminal help content:

```graphql
query {
  terminalHelp {
    overview
    categories {
      name
      commands { name, description, exampleUsage }
    }
    aiNote
  }
}
```

### ✅ `terminalSyntaxHelp`

Get terminal syntax grammar and examples:

```graphql
query {
  terminalSyntaxHelp {
    grammar           # Command syntax patterns
    examples          # Quick example commands
    naturalLanguageExamples
  }
}
```

### ✅ `autocomplete`

Get autocomplete suggestions:

```graphql
query Autocomplete($input: String!, $limit: Int) {
  autocomplete(input: $input, limit: $limit) {
    text
    display
    type        # command, alias, parameter, symbol, history
    description
    category
    insert
    requiresSymbol
  }
}
```

---

## Chart Data Queries

### ✅ `stockPriceConnection`

Relay-style cursor pagination:

```graphql
query StockPriceConnection(
  $symbol: String!
  $interval: StockPriceInterval
  $first: Int
  $before: String
  $includeExtendedHours: Boolean
  $adjustForDividends: Boolean
) {
  stockPriceConnection(...) {
    edges { node { id, date, open, high, low, close, volume } }
    pageInfo { hasOlderData, endCursor }
  }
}
```

### ✅ `chartDataRange`

Fetch data for specific date range:

```graphql
query ChartDataRange(
  $symbol: String!
  $startDate: DateTime!
  $endDate: DateTime!
  $interval: StockPriceInterval
) {
  chartDataRange(...) {
    edges { node { ... } }
    pageInfo { hasOlderData, hasNewerData }
    totalCount
  }
}
```

### ✅ `quote`

Get current quote (with live Alpha Vantage fallback):

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

---

## Watchlist Queries

### ✅ `watchlists`

```graphql
query { watchlists { id, name, symbols { symbol, displayName, marketCap } } }
```

### ✅ `recentSymbols`

```graphql
query { recentSymbols(limit: 10) { symbol, displayName, marketCap, lastAccessedAt } }
```

### ✅ `gicsSectors`

```graphql
query { gicsSectors }  # Returns ["Technology", "Healthcare", ...]
```

---

## Terminal Mutations

### `executeCommand`

```graphql
mutation ExecuteCommand($input: String!, $useAiFallback: Boolean) {
  executeCommand(input: $input, useAiFallback: $useAiFallback) {
    success
    message
    result { success, outputType, data, chartOptions, metadata }
    execution { uuid, status, isAiInterpreted }
    job { uuid, status }
  }
}
```

---

## Command Categories

| Category | Commands | Description |
|----------|----------|-------------|
| EQUITY | HP, DES, FA, ERN, QUOTE | Stock data commands |
| CHART | GP, GIP, COMPARE | Chart generation |
| SYSTEM | HELP, HIST, SEARCH, CMD | System utilities |

---

## WebSocket Actions

| Action | Payload | Description |
|--------|---------|-------------|
| `subscribe_symbols` | `{ symbols: ['AAPL'] }` | Subscribe to quote updates |
| `unsubscribe_symbols` | `{ symbols: ['AAPL'] }` | Unsubscribe from quotes |

| Message Type | Description |
|--------------|-------------|
| `symbol.update` | Real-time quote update |
| `symbols.subscribed` | Subscription confirmation |

