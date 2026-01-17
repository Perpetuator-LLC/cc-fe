# Frontend Enhancement Requirements

**Created:** January 6, 2026  
**Updated:** January 16, 2026

---

## Summary of Actions

| Task | Status |
|------|--------|
| History substring highlighting | ✅ Completed |
| Command parameter autocomplete | ✅ Completed |
| Market cap display | ✅ Completed |

---

## 1. History Substring Highlighting ✅

**Implementation:** Show raw text with `<mark>` tags when searching, chips when no search term.

**Files Modified:**
- `src/app/terminal/terminal-bar/terminal-bar.component.html` - Conditional rendering

---

## 2. Command Parameter/Switch Autocomplete ✅

**Backend API:**
```graphql
query {
  availableCommands {
    name
    arguments { name, type, description, default, required, options }
  }
}
```

**Implementation:**
1. Commands cached on startup via `availableCommands` query
2. Parameter context detection when user types `-`
3. Option values shown from `options` array

**Files Modified:**
- `src/app/terminal/terminal.service.ts` - Command caching and parameter suggestions
- `src/app/terminal/terminal-bar/terminal-bar.component.ts` - Parameter detection

---

## 3. Market Cap Display ✅

**Investigation Results:**
- Backend returns `marketCap` for watchlist symbols
- Frontend queries request `marketCap` field
- `formatMarketCap()` displays values correctly

**Files:**
- `src/app/terminal/watchlist-tab/watchlist-tab.component.html` - Uses marketCap

