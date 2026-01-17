# Command Routing Architecture

**Created:** January 1, 2026  
**Status:** ✅ Backend Implemented

---

## Overview

The backend provides explicit routing information for command results, allowing the frontend to navigate users to the appropriate view.

---

## Output Types

Every command result includes an `outputType`:

```typescript
type OutputType =
  | 'data'        // Raw data, stay in current view
  | 'message'     // Simple message, stay in current view
  | 'error'       // Error message
  | 'chart'       // Navigate to watchlists tab, show chart
  | 'dashboard'   // Navigate to dashboards tab
  | 'history'     // Navigate to history tab
  | 'watchlist'   // Navigate to watchlists tab
  | 'ai_response' // AI interpretation result
  | 'job';        // Async job started
```

---

## Route Information

Commands that should navigate include a `route` object:

```typescript
interface RouteInfo {
  tab?: 'watchlists' | 'dashboards' | 'history' | 'jobs';
  dashboardId?: string;
  watchlistId?: string;
  chartId?: string;
  symbol?: string;
  interval?: string;
  commandId?: string;
  expandResult?: boolean;
}
```

---

## Response Format

```typescript
interface CommandResult {
  success: boolean;
  message: string;
  outputType: OutputType;
  data?: any;
  chartOptions?: ChartOptions;
  metadata?: Record<string, any>;
  route?: RouteInfo;
  commandId?: string;
}
```

---

## Command-Specific Behavior

### CHART / GP (Price Chart)

```json
{
  "success": true,
  "outputType": "chart",
  "chartOptions": {...},
  "route": { "tab": "watchlists", "symbol": "AAPL", "interval": "daily" }
}
```

### HELP / COMMANDS

```json
{
  "success": true,
  "outputType": "history",
  "data": { "table": {...}, "items": [...] },
  "route": { "tab": "history" }
}
```

### COMPARE

```json
{
  "success": true,
  "outputType": "dashboard",
  "route": { "tab": "dashboards", "dashboardId": "uuid-..." }
}
```

---

## Frontend Navigation

```typescript
@Injectable({ providedIn: 'root' })
export class CommandRouterService {
  handleCommandResult(result: CommandResult): void {
    if (!result.route) return;

    const queryParams: Record<string, string> = {};
    if (result.route.tab) queryParams['tab'] = result.route.tab;
    if (result.route.symbol) queryParams['symbol'] = result.route.symbol;
    if (result.route.dashboardId) queryParams['dashboard'] = result.route.dashboardId;
    // ... etc

    this.router.navigate(['/terminal'], { queryParams });
  }
}
```

