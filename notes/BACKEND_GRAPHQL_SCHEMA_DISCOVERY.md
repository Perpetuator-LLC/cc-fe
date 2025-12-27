# Backend GraphQL Schema Discovery

Generated: 2025-12-26
Updated: 2025-12-26 (Terminal Redesign & Issues)

## ⚠️ Important: Update Frontend Schema

After the backend implements new queries, the frontend's `schema.graphql` needs to be updated:

```bash
# Regenerate schema from backend
yarn graphql:schema

# Or manually download from backend introspection endpoint
curl -X POST http://127.0.0.1:8000/graphql/ \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}' > schema.json
```

---

## Known Backend Issues

### ❌ HG Command Returns Empty Data

**Symptom:**
Running `AAPL HG` (company profile/description) returns empty data:
```json
{
  "success": true,
  "message": "Company profile for ",  // <-- Name is empty!
  "data": {
    "symbol": "AAPL",
    "name": "",
    "description": "",
    "sector": "",
    "industry": "",
    "exchange": "",
    "address": "",
    "fiscalYearEnd": ""
  }
}
```

**Expected:** The HG (or DES) command should return actual company data fetched from Alpha Vantage.

**Investigation needed:**
1. Is company data being stored in the database?
2. Is `fetch_company_info_task` being triggered?
3. Is the CompanyInfo model being populated correctly?

---

### ❌ Table Copy Feature Only Shows Message

**Symptom:**
When clicking "Copy" on a table result (like from `AAPL HG`), it only copies:
```
Company profile for 
```

**Expected:** Should copy the actual table data in a useful format (preferably markdown table format).

**Frontend Request:**
The backend's table data should include a copyable representation, OR the frontend needs to format the table data into markdown when copying.

Example of desired copy output:
```markdown
| Key | Value |
|-----|-------|
| symbol | AAPL |
| name | Apple Inc. |
| sector | Technology |
...
```

---

### ✅ Datetime Serialization Error in GP Command (FIXED)

> **Status:** FIXED as of 2025-12-26. Backend now correctly serializes datetime objects.

**Previous Error:**
```
Terminal error: Object of type datetime is not JSON serializable
```

**Resolution:** Backend now properly converts datetime objects to ISO strings.

---

### ❌ Decimal Precision Error in StockPrice Model

**Error:**
```json
{
  "open_price": ["Ensure that there are no more than 4 decimal places."],
  "high_price": ["Ensure that there are no more than 4 decimal places."],
  "low_price": ["Ensure that there are no more than 4 decimal places."],
  "close_price": ["Ensure that there are no more than 4 decimal places."]
}
```

**Cause:** Alpha Vantage returns prices with more than 4 decimal places, but the Django model's `DecimalField` has `decimal_places=4`.

**Fix (backend):** Update `stock_data/models.py` to increase decimal places:
```python
# Change from:
open_price = models.DecimalField(max_digits=12, decimal_places=4)
# To:
open_price = models.DecimalField(max_digits=18, decimal_places=8)
```

Or round the values before saving in the task:
```python
open_price = round(float(data['open']), 4)
```

---

## Auto-Fetch Behavior

Commands will automatically trigger data fetching when data is not cached:

| Command | When Data Missing | Behavior |
|---------|------------------|----------|
| `HP` | No price data | Triggers `fetch_stock_prices_task`, returns jobId |
| `DES` | No company data | Triggers `fetch_company_info_task`, returns jobId |
| `GP` | No price data | Triggers `fetch_stock_prices_task`, returns jobId |
| `FA` | No financial data | Returns message to run fetch mutations |
| `ERN` | No earnings data | Returns message to run fetch mutations |

**Response when fetching:**
```json
{
  "success": true,
  "message": "No cached data for AAPL. Fetching from Alpha Vantage...",
  "data": {
    "status": "fetching",
    "jobId": "uuid-of-job"
  },
  "metadata": {
    "symbol": "AAPL",
    "jobId": "uuid-of-job"
  }
}
```

**Frontend should:**
1. Check if `data.status === "fetching"`
2. Subscribe to job updates via WebSocket or poll `/jobs/{jobId}`
3. Re-run the command once the job completes

### Frontend Implementation (Completed ✅)

The frontend now handles auto-fetch responses:

**Files modified:**
- `terminal.service.ts` - Tracks pending jobs and auto-retries commands
- `terminal-input.component.ts` - Helper methods for fetching state
- `terminal-input.component.html` - Shows fetching UI with cloud icon
- `terminal-input.component.scss` - Styles for fetching indicator

**Flow:**
1. User runs `AAPL HP`
2. Backend returns `{data: {status: "fetching", jobId: "..."}}`
3. Frontend shows spinner with "No cached data for AAPL. Fetching from Alpha Vantage..."
4. Frontend tracks `jobId -> "AAPL HP"` mapping
5. Jobs WebSocket receives `jobs.completed` for that jobId
6. Frontend automatically re-runs `AAPL HP`
7. Data is now cached, command returns actual price data

---

## Terminal System Queries

### ✅ `commands` (NOW IMPLEMENTED)

> **Status:** IMPLEMENTED as of 2025-12-26. Requires server restart to take effect.

Get available terminal commands.

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

**Parameters:**
- `isActive` (Boolean, optional): Filter by active status (default: true)

---

### ❌ `command` (NOT YET IMPLEMENTED)

> **Status:** This query is NOT in the backend schema yet.

Get a specific command by name.

```graphql
query GetCommand($name: String!) {
  command(name: $name) {
    uuid
    name
    description
    category
    aliases
    requiresSymbol
    parametersSchema
    exampleUsage
    outputType
    chartType
    creditsCost
  }
}
```

**Parameters:**
- `name` (String, required): Command name (e.g., "HP", "GP", "DES")

---

### ❌ `autocomplete` (NOT YET IMPLEMENTED - REQUESTED)

> **Status:** This query is NOT in the backend schema yet. Frontend has client-side fallback.

Get intelligent autocomplete suggestions based on partial input.

```graphql
query Autocomplete($input: String!, $limit: Int) {
  autocomplete(input: $input, limit: $limit) {
    text
    display
    type
    description
    category
    insert
    requiresSymbol
    syntax
    paramType
    choices
    default
  }
}
```

**Parameters:**
- `input` (String, required): Current terminal input text
- `limit` (Int, optional): Max suggestions (default: 10)

**Response Types:**
- `type`: `command`, `alias`, `parameter`, `example`, `symbol`, `history`
- When input ends with `-`, return parameter suggestions for the command
- When input is empty, return examples and recent history
- When input contains a symbol, filter to symbol-requiring commands

**Frontend Currently Uses:**
Client-side suggestion generator in `terminal.service.ts:getAutocompleteSuggestions()` that provides:
- Recent command history
- Command name/alias matching
- Parameter suggestions (parsed from `parametersSchema`)

---

### ❌ `terminalSyntaxHelp` (NOT YET IMPLEMENTED - REQUESTED)

> **Status:** This query is NOT in the backend schema yet.

Get terminal syntax grammar and examples for help display.

```graphql
query GetTerminalSyntaxHelp {
  terminalSyntaxHelp {
    grammar
    examples
    naturalLanguageExamples
  }
}
```

**Expected Response:**
```json
{
  "terminalSyntaxHelp": {
    "grammar": [
      "COMMAND                    → System command (HELP, CMD, HIST)",
      "SYMBOL COMMAND             → Symbol command (AAPL HP, MSFT DES)",
      "SYMBOL SYMBOL... COMMAND   → Multi-symbol command (AAPL MSFT COMPARE)"
    ],
    "examples": [
      "AAPL HP              → Historical prices for AAPL",
      "AAPL DES             → Company description for AAPL"
    ],
    "naturalLanguageExamples": [
      "show me a chart of apple stock",
      "compare revenue of google and microsoft"
    ]
  }
}
```

---

### ✅ `commandHistory` (NOW IMPLEMENTED)

> **Status:** IMPLEMENTED as of 2025-12-26. Requires server restart to take effect.

Get user's command execution history.

```graphql
query GetCommandHistory($limit: Int) {
  commandHistory(limit: $limit) {
    rawInput
    parsedCommand
    status
    result
    createdAt
  }
}
```

**Parameters:**
- `limit` (Int, optional): Number of records to return (default: 20)

---

## Visualizations Queries

### `dashboards`
Get user's saved dashboards.

```graphql
query GetDashboards {
  dashboards {
    uuid
    name
    description
    columns
    rowHeight
    isDefault
    isPublic
    autoRefresh
    refreshInterval
    createdAt
    updatedAt
    panels {
      uuid
      gridX
      gridY
      gridW
      gridH
      titleOverride
      chart {
        uuid
        name
        chartType
        options
        symbols
      }
    }
  }
}
```

---

### `dashboard`
Get a specific dashboard by UUID.

```graphql
query GetDashboard($dashboardUuid: UUID!) {
  dashboard(dashboardUuid: $dashboardUuid) {
    uuid
    name
    description
    panels {
      uuid
      gridX
      gridY
      gridW
      gridH
      chart {
        uuid
        name
        chartType
        options
      }
    }
  }
}
```

---

### `defaultDashboard`
Get user's default dashboard.

```graphql
query GetDefaultDashboard {
  defaultDashboard {
    uuid
    name
    panels {
      uuid
      gridX
      gridY
      gridW
      gridH
      chart {
        uuid
        name
        chartType
        options
      }
    }
  }
}
```

---

### `charts`
Get user's saved charts.

```graphql
query GetCharts($includePublic: Boolean, $includeTemplates: Boolean) {
  charts(includePublic: $includePublic, includeTemplates: $includeTemplates) {
    uuid
    name
    description
    chartType
    options
    dataSource
    symbols
    width
    height
    theme
    isTemplate
    isPublic
    createdAt
    updatedAt
  }
}
```

---

## Terminal Mutations

### `executeCommand`
Execute a terminal command.

```graphql
mutation ExecuteCommand($input: String!, $useAiFallback: Boolean) {
  executeCommand(input: $input, useAiFallback: $useAiFallback) {
    success
    message
    result {
      success
      message
      outputType
      data
      chartOptions
      metadata
    }
    execution {
      uuid
      status
      isAiInterpreted
    }
    job {
      uuid
      status
    }
  }
}
```

**Parameters:**
- `input` (String, required): Command string (e.g., "AAPL HP -period 1Y")
- `useAiFallback` (Boolean, optional): If true, route unrecognized commands to AI

**Example:**
```javascript
const { data } = await client.mutate({
  mutation: EXECUTE_COMMAND,
  variables: {
    input: "AAPL HP -period 1Y",
    useAiFallback: true
  }
});

if (data.executeCommand.result.outputType === 'chart') {
  // Render chart with data.executeCommand.result.chartOptions
}
```

---

### `syncCommandRegistry`
Sync commands from code registry to database (admin only).

```graphql
mutation SyncCommandRegistry {
  syncCommandRegistry {
    success
    message
    syncedCount
  }
}
```

---

## Visualizations Mutations

### `createDashboard`
Create a new dashboard.

```graphql
mutation CreateDashboard($name: String!, $description: String, $columns: Int, $rowHeight: Int) {
  createDashboard(name: $name, description: $description, columns: $columns, rowHeight: $rowHeight) {
    success
    message
    dashboard {
      uuid
      name
      description
    }
  }
}
```

**Parameters:**
- `name` (String, required): Dashboard name
- `description` (String, optional): Dashboard description
- `columns` (Int, optional): Grid columns (default: 12)
- `rowHeight` (Int, optional): Row height in pixels (default: 50)

---

### `createChart`
Create a new chart definition.

```graphql
mutation CreateChart($name: String!, $chartType: String!, $options: JSONString!, $description: String, $symbols: [String], $isTemplate: Boolean, $isPublic: Boolean) {
  createChart(name: $name, chartType: $chartType, options: $options, description: $description, symbols: $symbols, isTemplate: $isTemplate, isPublic: $isPublic) {
    success
    message
    chart {
      uuid
      name
      chartType
      options
    }
  }
}
```

**Parameters:**
- `name` (String, required): Chart name
- `chartType` (String, required): Chart type (candlestick, line, bar, etc.)
- `options` (JSONString, required): ECharts options object
- `description` (String, optional): Chart description
- `symbols` (List[String], optional): Associated stock symbols
- `isTemplate` (Boolean, optional): Save as template
- `isPublic` (Boolean, optional): Make publicly visible

---

### `addPanelToDashboard`
Add a chart panel to a dashboard.

```graphql
mutation AddPanelToDashboard($dashboardUuid: UUID!, $chartUuid: UUID!, $gridX: Int!, $gridY: Int!, $gridW: Int, $gridH: Int) {
  addPanelToDashboard(dashboardUuid: $dashboardUuid, chartUuid: $chartUuid, gridX: $gridX, gridY: $gridY, gridW: $gridW, gridH: $gridH) {
    success
    message
    panel {
      uuid
      gridX
      gridY
      gridW
      gridH
    }
  }
}
```

---

### `updateChart`
Update an existing chart.

```graphql
mutation UpdateChart($chartUuid: UUID!, $name: String, $options: JSONString, $description: String) {
  updateChart(chartUuid: $chartUuid, name: $name, options: $options, description: $description) {
    success
    message
    chart {
      uuid
      name
      options
    }
  }
}
```

---

### `deleteChart`
Delete a chart.

```graphql
mutation DeleteChart($chartUuid: UUID!) {
  deleteChart(chartUuid: $chartUuid) {
    success
    message
  }
}
```

---

## Orchestration Mutations (AI)

### `analyzeStock`
AI-powered stock analysis.

```graphql
mutation AnalyzeStock($symbol: String!) {
  analyzeStock(symbol: $symbol) {
    success
    message
    job {
      uuid
      status
    }
  }
}
```

---

### `executeCommandChain`
Execute a chain of commands.

```graphql
mutation ExecuteCommandChain($commands: [String!]!) {
  executeCommandChain(commands: $commands) {
    success
    message
    job {
      uuid
      status
    }
  }
}
```

---

## Command Categories

| Category | Commands | Description |
|----------|----------|-------------|
| EQUITY | HP, DES, FA, ERN, QUOTE | Stock data commands |
| CHART | GP, GIP, COMPARE | Chart generation commands |
| SYSTEM | HELP, HIST, SEARCH, CMD | System/utility commands |

---

## Output Types

| Type | Description | Example |
|------|-------------|---------|
| `data` | Table/structured data | HP command results |
| `chart` | ECharts options | GP command results |
| `message` | Plain text message | HELP command |

---

## WebSocket Endpoint

In addition to GraphQL, the terminal also supports WebSocket for real-time updates:

**Endpoint:** `wss://[host]/ws/terminal/?token=[access_token]`

See `notes/product/FRONTEND_TERMINAL_INTEGRATION.md` for WebSocket protocol details.

