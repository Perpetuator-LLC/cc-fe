# Command Routing and Navigation - Frontend Integration

**Date:** January 1, 2026  
**Status:** Backend Implemented

---

## Overview

The backend now provides explicit routing information for command results, allowing the frontend to navigate users to the appropriate view based on command output.

## Key Concepts

### 1. Output Types

Every command result includes an `outputType` that tells the frontend how to handle the result:

```typescript
type OutputType =
  | 'data'        // Raw data, stay in current view
  | 'message'     // Simple message, stay in current view
  | 'error'       // Error message
  | 'chart'       // Navigate to watchlists tab, show chart
  | 'dashboard'   // Navigate to dashboards tab
  | 'history'     // Navigate to history tab, show result
  | 'watchlist'   // Navigate to watchlists tab
  | 'ai_response' // AI interpretation result
  | 'job';        // Async job started
```

### 2. Route Information

Commands that should navigate include a `route` object:

```typescript
interface RouteInfo {
  tab?: string;           // Main tab: 'watchlists' | 'dashboards' | 'history' | 'jobs'
  dashboardId?: string;   // UUID of specific dashboard
  watchlistId?: string;   // UUID of specific watchlist
  chartId?: string;       // UUID of specific chart
  symbol?: string;        // Symbol to focus on
  interval?: string;      // Chart interval (daily, hourly, etc.)
  commandId?: string;     // Command execution UUID (for history)
  expandResult?: boolean; // Expand this result in history view
}
```

### 3. Command Execution IDs

Every command execution has a UUID that can be used to:
- Reference the result in history
- Link to specific command outputs
- Expand/highlight results in the history tab

## Response Format

```typescript
interface CommandResult {
  success: boolean;
  message: string;
  outputType: OutputType;
  data?: any;
  chartOptions?: ChartOptions;
  metadata?: Record<string, any>;
  route?: RouteInfo;      // NEW: Navigation instructions
  commandId?: string;     // NEW: UUID of CommandExecution record
}
```

## Frontend Navigation Logic

```typescript
// src/app/terminal/command-router.service.ts
@Injectable({ providedIn: 'root' })
export class CommandRouterService {
  constructor(private router: Router) {}

  handleCommandResult(result: CommandResult): void {
    // Check if we need to navigate
    if (!result.route) {
      // No navigation needed, just display in current view
      return;
    }

    const route = result.route;
    const queryParams: Record<string, string> = {};

    // Build query params from route info
    if (route.tab) queryParams['tab'] = route.tab;
    if (route.dashboardId) queryParams['dashboard'] = route.dashboardId;
    if (route.watchlistId) queryParams['watchlist'] = route.watchlistId;
    if (route.chartId) queryParams['chart'] = route.chartId;
    if (route.symbol) queryParams['symbol'] = route.symbol;
    if (route.interval) queryParams['interval'] = route.interval;
    if (route.commandId) queryParams['command'] = route.commandId;
    if (route.expandResult) queryParams['expand'] = 'true';

    // Navigate to terminal with query params
    this.router.navigate(['/terminal'], { queryParams });
  }
}
```

## Command-Specific Behavior

### HELP / COMMANDS

These commands return `outputType: 'history'` and include:
- Structured data with all command info
- Route to history tab

```json
{
  "success": true,
  "outputType": "history",
  "message": "...",
  "data": { "table": {...}, "items": [...] },
  "route": { "tab": "history" },
  "commandId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Frontend action:** Navigate to history tab, show/expand this command's result.

### HISTORY

Returns list of command executions with UUIDs:

```json
{
  "success": true,
  "outputType": "history",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "createdAt": "2026-01-01T12:00:00Z",
        "status": "completed",
        "command": "CHART",
        "rawInput": "AAPL CHART -period 1Y",
        "isAiInterpreted": false,
        "result": {...}
      }
    ]
  },
  "route": { "tab": "history" }
}
```

**Frontend action:** Navigate to history tab, display list with expand/collapse.

### CHART / GP (Price Chart)

Creates a chart and routes to watchlists:

```json
{
  "success": true,
  "outputType": "chart",
  "chartOptions": {...},
  "route": {
    "tab": "watchlists",
    "symbol": "AAPL",
    "interval": "daily"
  },
  "commandId": "..."
}
```

**Frontend action:** Navigate to watchlists tab, show chart for AAPL.

### COMPARE

Creates a comparison dashboard:

```json
{
  "success": true,
  "outputType": "dashboard",
  "data": {...},
  "route": {
    "tab": "dashboards",
    "dashboardId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "commandId": "..."
}
```

**Frontend action:** Navigate to dashboards tab, show specific dashboard.

### AI Command

Natural language queries via `AI <query>`:

```json
{
  "success": true,
  "outputType": "ai_response",
  "message": "Processing AI query: show me a chart of AAPL",
  "data": {
    "query": "show me a chart of AAPL",
    "requiresAI": true
  },
  "metadata": {
    "aiQuery": "show me a chart of AAPL",
    "isExplicitAI": true
  }
}
```

After AI processing completes, a follow-up result includes routing:

```json
{
  "success": true,
  "outputType": "chart",
  "message": "I've created a chart of Apple stock for you.",
  "chartOptions": {...},
  "route": {
    "tab": "watchlists",
    "symbol": "AAPL",
    "interval": "daily"
  },
  "metadata": {
    "aiReasoning": "User asked for a chart of Apple stock...",
    "toolCalls": [{"tool": "CHART", "args": {...}}]
  }
}
```

**Frontend action:** Navigate based on route info.

## URL Query Parameter Mapping

The frontend should map route info to URL query parameters:

| Route Field   | Query Param   | Example                          |
|---------------|---------------|----------------------------------|
| `tab`         | `tab`         | `?tab=dashboards`                |
| `dashboardId` | `dashboard`   | `?tab=dashboards&dashboard=uuid` |
| `watchlistId` | `watchlist`   | `?tab=watchlists&watchlist=uuid` |
| `chartId`     | `chart`       | `?chart=uuid`                    |
| `symbol`      | `symbol`      | `?symbol=AAPL`                   |
| `interval`    | `interval`    | `?interval=daily`                |
| `commandId`   | `command`     | `?tab=history&command=uuid`      |
| `expandResult`| `expand`      | `?expand=true`                   |

## Tab Structure

The terminal should have these tabs:

1. **Watchlists** (`tab=watchlists`) - Charts for symbols in watchlists
2. **Dashboards** (`tab=dashboards`) - Multi-chart dashboards (comparisons, etc.)
3. **History** (`tab=history`) - Command history with expandable results
4. **Jobs** (`tab=jobs`) - Async job status

## Implementation Checklist

### Frontend

- [ ] Add `CommandRouterService` to handle navigation
- [ ] Parse `route` field from command results
- [ ] Map route info to URL query parameters
- [ ] Handle query params on page load to restore state
- [ ] Add tab navigation component
- [ ] Implement history view with expandable results
- [ ] Implement dashboards tab
- [ ] Handle `commandId` to highlight/expand specific results

### Backend (Complete)

- [x] Add `OutputType` constants
- [x] Add `RouteInfo` class
- [x] Update `CommandResult` with `route` and `command_id`
- [x] Update HELP, HISTORY, COMMANDS to use proper output types
- [x] Add AI command
- [x] Add `commandId` to command results

## Examples

### Example: User types "HELP"

**Request:** `{"action": "execute", "input": "HELP"}`

**Response:**
```json
{
  "type": "command.result",
  "input": "HELP",
  "result": {
    "success": true,
    "outputType": "history",
    "message": "Terminal Commands...",
    "data": {...},
    "route": {"tab": "history"},
    "commandId": "abc123..."
  }
}
```

**Frontend:** Navigates to `/terminal?tab=history&command=abc123&expand=true`

### Example: User types "AI show me AAPL chart"

**Request:** `{"action": "execute", "input": "AI show me AAPL chart"}`

**Response (initial):**
```json
{
  "type": "command.result",
  "result": {
    "success": true,
    "outputType": "ai_response",
    "data": {"query": "show me AAPL chart", "requiresAI": true}
  }
}
```

**Response (after AI processing):**
```json
{
  "type": "command.result",
  "result": {
    "success": true,
    "outputType": "chart",
    "chartOptions": {...},
    "route": {"tab": "watchlists", "symbol": "AAPL"},
    "metadata": {"aiReasoning": "..."}
  }
}
```

**Frontend:** Navigates to `/terminal?tab=watchlists&symbol=AAPL`

### Example: User types "AAPL MSFT COMPARE"

**Response:**
```json
{
  "type": "command.result",
  "result": {
    "success": true,
    "outputType": "dashboard",
    "data": {...},
    "route": {
      "tab": "dashboards",
      "dashboardId": "xyz789..."
    }
  }
}
```

**Frontend:** Navigates to `/terminal?tab=dashboards&dashboard=xyz789`

