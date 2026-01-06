# Frontend Enhancement Requirements

**Created:** January 6, 2026

This document outlines requirements for three enhancements requested by the user.

---

## 1. History Substring Highlighting

### Current State
- The frontend computes match highlighting data (`beforeMatch`, `matchText`, `afterMatch`)
- History items are rendered as FQN chips which don't support highlighting
- The chip component shows the full token without any highlighting

### Frontend Solution Needed
When there's a search term and the history entry has a match, we need to either:

**Option A:** Add highlighting support to the FqnChip component
- Pass `highlightStart` and `highlightEnd` props
- Render the chip with a highlighted portion

**Option B:** Show raw text with highlighting when there's a search term
- When `historySearchTerm` is set, render the raw command with `<mark>` tags
- When no search term, show the chips as normal

### Recommendation
Option B is simpler - show raw text with highlighting when searching.

---

## 2. Command Parameter/Switch Autocomplete

### Current Backend State
The backend already provides:

```graphql
type CommandType {
  name: String!
  arguments: [CommandArgumentType]
  # ...
}

type CommandArgumentType {
  name: String!           # e.g., "interval"
  type: String!           # e.g., "string"
  description: String     # Help text
  default: String         # Default value
  required: Boolean
  options: [String]       # Preset values! e.g., ["daily", "weekly", "hourly"]
}
```

### Available Query
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
      options
    }
  }
}
```

### Frontend Implementation Needed
1. **Cache commands on startup** - Use `availableCommands` query
2. **Detect parameter context** - When user types `COMMAND:CHART -` or `COMMAND:CHART -interval `
3. **Show parameter suggestions** - List available parameters with descriptions
4. **Show option values** - When user types `-interval `, show `options` array

### Example Flow
```
User types: "AAPL CHART -"
→ Show: [-interval, -period, -type] with descriptions

User types: "AAPL CHART -interval "
→ Show: [daily, weekly, hourly, MIN_60, MIN_30, ...] from options array
```

### Backend Enhancement Needed
Ensure `options` field is populated for all command arguments that have preset values:
- CHART command: interval options, period options
- Other commands: their specific parameter options

---

## 3. Market Cap Not Loading

### Investigation Results
- Backend IS returning `marketCap` for watchlist symbols (confirmed via test)
- Example: AEHL has marketCap: 11275100, APOG has marketCap: 803914000
- Frontend queries DO request `marketCap` field
- Frontend mapping code correctly maps `marketCap` from response

### Possible Issues
1. **Specific data sources not populating marketCap** - The `recentSymbols` query might not be populating marketCap for all symbols
2. **Backend not fetching marketCap from data provider** - Some symbols may not have market cap data fetched
3. **Frontend display not showing** - Need to verify the UI is actually using the marketCap value

### Backend Check Needed
1. Query `recentSymbols` and verify all symbols have marketCap populated
2. Check if Alpha Vantage/data provider returns marketCap for all symbol types
3. Ensure the `WatchlistItem.market_cap` field is being populated when symbols are accessed

### Frontend Check
1. Verify `formatMarketCap()` is being called in the template
2. Confirm the sorted symbols array contains marketCap values

---

## Summary of Actions

| Task | Owner | Status |
|------|-------|--------|
| History highlighting when searching | Frontend | ✅ Completed |
| Load commands with arguments on startup | Frontend | ✅ Completed |
| Add parameter autocomplete logic | Frontend | ✅ Completed |
| Verify `options` populated for all command args | Backend | To verify |
| Investigate marketCap for recentSymbols | Backend | To verify |
| Verify marketCap display in UI | Frontend | ✅ Verified (UI is correct) |

---

## Files to Modify

### History Highlighting
- `src/app/terminal/terminal-bar/terminal-bar.component.html` - Add conditional rendering

### Command Parameter Autocomplete
- `src/app/terminal/terminal.service.ts` - Add command caching and parameter suggestions
- `src/app/terminal/terminal-bar/terminal-bar.component.ts` - Add parameter detection

### Market Cap Display
- `src/app/terminal/watchlist-tab/watchlist-tab.component.html` - Verify usage

