# Backend Integration Plan for AI Terminal System

## Current State Analysis

**STATUS: FIXED** ✅

The error was:
```
> AAPL HP Cannot resolve keyword 'symbol' into field. Choices are: close_price, company, company_id, created_at, date, high_price, id, interval, low_price, open_price, updated_at, volume
```

**Root Cause**: The `StockPrice` model uses a FK to `Company`, and Company uses `ticker` (not `symbol`) as the stock symbol field.

**Fix Applied**: All queries now use `company__ticker__iexact=symbol`:
```python
# ✅ CORRECT (implemented)
StockPrice.objects.filter(company__ticker__iexact=symbol)
Company.objects.get(ticker__iexact=symbol)
```

---

## Auto-Fetch Behavior (NEW) ✅

Commands now automatically trigger data fetching when data is not cached:

| Command | Trigger Task | JobKind |
|---------|-------------|---------|
| `HP` | `fetch_stock_prices_task` | `FETCH_STOCK_PRICES` |
| `DES` | `fetch_company_info_task` | `FETCH_COMPANY_INFO` |
| `GP` | `fetch_stock_prices_task` | `FETCH_STOCK_PRICES` |

**Flow:**
1. User runs `AAPL HP`
2. Command checks for cached data
3. If no data: creates Job, triggers Celery task, returns `{ status: "fetching", jobId: "..." }`
4. Frontend subscribes to job updates
5. Once job completes, user re-runs command to see data

---

## 1. Database Models (Already Exist)

### 1.1 Stock Data Models (data app) ✅

Located in `data/models.py`:

```python
class Company(models.Model):
    """Company/Stock information"""
    ticker = models.CharField(max_length=10, unique=True)  # NOTE: Uses 'ticker' not 'symbol'
    name = models.CharField(max_length=255)
    exchange = models.ForeignKey(Exchange, ...)
    sector = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    # ... other fields

class StockPrice(models.Model):
    """Historical stock prices - OHLCV data"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='stock_prices')
    date = models.DateTimeField(db_index=True)
    interval = models.CharField(max_length=20, choices=STOCK_PRICE_INTERVAL_CHOICES)
    open_price = models.DecimalField(max_digits=12, decimal_places=4)
    high_price = models.DecimalField(max_digits=12, decimal_places=4)
    low_price = models.DecimalField(max_digits=12, decimal_places=4)
    close_price = models.DecimalField(max_digits=12, decimal_places=4)
    volume = models.BigIntegerField()
```

### 1.2 Command System Models (terminal app) ✅

Located in `terminal/models.py`:

```python
class Command(models.Model):
    """Registry of available commands"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    category = models.CharField(max_length=20)
    requires_symbol = models.BooleanField(default=False)
    parameters_schema = models.JSONField(default=dict)
    # ... other fields

class CommandExecution(models.Model):
    """Log of all command executions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    raw_input = models.TextField()
    parsed_command = models.CharField(max_length=50)
    parsed_symbols = models.JSONField(default=list)
    is_ai_interpreted = models.BooleanField(default=False)
    status = models.CharField(max_length=20)
    result = models.JSONField(null=True)
    # ... other fields

class CommandAlias(models.Model):
    """User-defined command aliases"""
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    alias = models.CharField(max_length=50)
    user = models.ForeignKey(User, null=True, ...)  # null = system alias
```

### 1.3 Chart/Dashboard Models (visualizations app) ✅

Located in `visualizations/models.py`:

```python
class ChartDefinition(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    chart_type = models.CharField(max_length=50)
    options = models.JSONField()  # ECharts options
    # ... other fields

class Dashboard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)

class DashboardPanel(models.Model):
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE)
    chart = models.ForeignKey(ChartDefinition, on_delete=models.CASCADE)
    grid_x = models.IntegerField()
    grid_y = models.IntegerField()
    grid_w = models.IntegerField(default=6)
    grid_h = models.IntegerField(default=4)
```

---

## 2. GraphQL Schema Required

### 2.1 Queries

```graphql
type Query {
  # Command Registry
  commands(category: String): [Command!]!
  command(name: String!): Command

  # Command History
  commandHistory(limit: Int, offset: Int): [CommandExecution!]!

  # Stock Data
  company(symbol: String!): Company
  companies(search: String, limit: Int): [Company!]!
  stockPrices(
    symbol: String!
    startDate: Date
    endDate: Date
    interval: String
    limit: Int
  ): [StockPrice!]!

  # Charts & Dashboards
  charts(limit: Int): [Chart!]!
  chart(id: ID!): Chart
  dashboards: [Dashboard!]!
  dashboard(id: ID!): Dashboard
}
```

### 2.2 Mutations

```graphql
type Mutation {
  # Command Execution (alternative to WebSocket)
  executeCommand(input: String!, useAiFallback: Boolean): ExecuteCommandResult!

  # Charts
  createChart(name: String!, chartType: String!, options: JSONString!, symbol: String): CreateChartResult!
  updateChart(id: ID!, name: String, options: JSONString): UpdateChartResult!
  deleteChart(id: ID!): DeleteResult!

  # Dashboards
  createDashboard(name: String!, description: String): CreateDashboardResult!
  updateDashboard(id: ID!, name: String, description: String): UpdateDashboardResult!
  deleteDashboard(id: ID!): DeleteResult!
  
  # Dashboard Panels
  addPanelToDashboard(dashboardId: ID!, chartId: ID!, gridX: Int!, gridY: Int!, gridW: Int, gridH: Int): AddPanelResult!
  updatePanel(panelId: ID!, gridX: Int, gridY: Int, gridW: Int, gridH: Int): UpdatePanelResult!
  removePanel(panelId: ID!): DeleteResult!
}
```

### 2.3 Types

```graphql
type Command {
  id: ID!
  name: String!
  aliases: [String!]!
  category: String!
  description: String!
  requiresSymbol: Boolean!
  parametersSchema: JSONString
  exampleUsage: String!
  creditsCost: Int!
}

type CommandExecution {
  id: ID!
  rawInput: String!
  parsedCommand: String
  parsedSymbols: [String!]!
  isAiInterpreted: Boolean!
  aiReasoning: String
  status: String!
  result: JSONString
  errorMessage: String
  createdAt: DateTime!
  completedAt: DateTime
}

type ExecuteCommandResult {
  success: Boolean!
  message: String
  result: CommandResult
  execution: CommandExecution
  job: Job  # For async operations
}

type CommandResult {
  success: Boolean!
  message: String
  outputType: String!  # 'data', 'chart', 'message'
  data: JSONString
  chartOptions: JSONString
  metadata: JSONString
}

type Company {
  id: ID!
  symbol: String!
  name: String!
  exchange: String
  sector: String
  industry: String
  marketCap: BigInt
  description: String
}

type StockPrice {
  id: ID!
  company: Company!
  date: Date!
  interval: String!
  openPrice: Decimal!
  highPrice: Decimal!
  lowPrice: Decimal!
  closePrice: Decimal!
  volume: BigInt!
}

type Chart {
  id: ID!
  name: String!
  chartType: String!
  options: JSONString!
  symbol: String
  period: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Dashboard {
  id: ID!
  name: String!
  description: String
  isDefault: Boolean!
  panels: [DashboardPanel!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type DashboardPanel {
  id: ID!
  chart: Chart!
  gridX: Int!
  gridY: Int!
  gridW: Int!
  gridH: Int!
}
```

---

## 3. WebSocket Protocol (/ws/terminal/)

### 3.1 Client → Server Messages

| Action | Payload | Description |
|--------|---------|-------------|
| `execute` | `{ action: "execute", input: "AAPL HP" }` | Execute command |
| `subscribe_chart` | `{ action: "subscribe_chart", chartId: "uuid" }` | Subscribe to chart updates |
| `unsubscribe_chart` | `{ action: "unsubscribe_chart", chartId: "uuid" }` | Unsubscribe |
| `subscribe_symbols` | `{ action: "subscribe_symbols", symbols: ["AAPL"] }` | Subscribe to price updates |
| `ping` | `{ action: "ping" }` | Keep-alive |

### 3.2 Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `connected` | `{ type: "connected", userId: "...", timestamp: "..." }` | Connection established |
| `command.result` | `{ type: "command.result", result: {...} }` | Command completed |
| `command.progress` | `{ type: "command.progress", executionId: "...", step: "...", progress: 50 }` | Progress update |
| `chart.created` | `{ type: "chart.created", chartId: "...", options: {...} }` | New chart |
| `chart.update` | `{ type: "chart.update", chartId: "...", options: {...} }` | Chart data update |
| `symbol.update` | `{ type: "symbol.update", symbol: "AAPL", price: 150.25 }` | Price update |
| `error` | `{ type: "error", message: "..." }` | Error |
| `pong` | `{ type: "pong" }` | Keep-alive response |

---

## 4. Command Implementation

### 4.1 Fix HP Command

The current error suggests the HP command needs to filter via company relationship:

```python
# commands/handlers/equity.py

class HPCommand(BaseCommand):
    """Historical Prices command"""
    
    name = "HP"
    aliases = ["PRICE", "PRICES", "HIST"]
    category = "EQUITY"
    requires_symbol = True
    
    def execute(self, symbols: list[str], params: dict) -> CommandResult:
        period = params.get('period', '1Y')
        
        # Get date range from period
        end_date = timezone.now().date()
        start_date = self.calculate_start_date(period, end_date)
        
        results = []
        for symbol in symbols:
            try:
                # FIX: Filter via company__symbol, not symbol directly
                prices = StockPrice.objects.filter(
                    company__symbol=symbol.upper(),
                    date__gte=start_date,
                    date__lte=end_date,
                    interval='1d'
                ).order_by('date').values(
                    'date', 'open_price', 'high_price', 
                    'low_price', 'close_price', 'volume'
                )
                
                results.append({
                    'symbol': symbol,
                    'data': list(prices)
                })
            except Company.DoesNotExist:
                return CommandResult(
                    success=False,
                    message=f"Symbol {symbol} not found"
                )
        
        return CommandResult(
            success=True,
            output_type='data',
            data={
                'type': 'table',
                'title': f"Historical Prices - {', '.join(symbols)}",
                'headers': ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'],
                'rows': self.format_rows(results),
                'rowCount': len(results[0]['data']) if results else 0
            },
            metadata={
                'symbols': symbols,
                'period': period,
                'startDate': str(start_date),
                'endDate': str(end_date)
            }
        )
```

### 4.2 GP Command (Chart)

```python
class GPCommand(BaseCommand):
    """Generate Price Chart"""
    
    name = "GP"
    aliases = ["CHART", "GRAPH", "CANDLE"]
    category = "CHART"
    requires_symbol = True
    
    def execute(self, symbols: list[str], params: dict) -> CommandResult:
        period = params.get('period', '1Y')
        symbol = symbols[0]  # GP works with single symbol
        
        prices = self.get_prices(symbol, period)
        
        # Build ECharts candlestick options
        chart_options = {
            'title': {'text': f'{symbol} - {period}'},
            'tooltip': {'trigger': 'axis'},
            'xAxis': {
                'type': 'category',
                'data': [p['date'].isoformat() for p in prices]
            },
            'yAxis': {'type': 'value', 'scale': True},
            'series': [{
                'type': 'candlestick',
                'data': [
                    [p['open_price'], p['close_price'], 
                     p['low_price'], p['high_price']]
                    for p in prices
                ]
            }],
            'dataZoom': [{'type': 'inside'}, {'type': 'slider'}]
        }
        
        return CommandResult(
            success=True,
            output_type='chart',
            chart_options=chart_options,
            metadata={'symbol': symbol, 'period': period}
        )
```

---

## 5. Data Sources Integration

### 5.1 Stock Data Fetchers

```python
# stock_data/fetchers/base.py
class BaseStockFetcher(ABC):
    @abstractmethod
    def fetch_prices(self, symbol: str, start: date, end: date, interval: str) -> list[dict]:
        pass
    
    @abstractmethod
    def fetch_company_info(self, symbol: str) -> dict:
        pass

# stock_data/fetchers/yahoo.py
class YahooFetcher(BaseStockFetcher):
    """Free data from Yahoo Finance"""
    pass

# stock_data/fetchers/polygon.py
class PolygonFetcher(BaseStockFetcher):
    """Premium data from Polygon.io"""
    pass
```

### 5.2 Data Pipeline

```
User Command → Parser → Command Handler → Data Fetcher → Database Cache → Response
                                              ↓
                                        External API
                                        (Yahoo/Polygon)
```

---

## 6. Testing Checklist

### 6.1 Backend Tests Needed

- [ ] HP command with valid symbol returns data
- [ ] HP command with invalid symbol returns error
- [ ] HP command filters by company__symbol correctly
- [ ] GP command generates valid ECharts options
- [ ] WebSocket connects with valid token
- [ ] WebSocket rejects invalid token
- [ ] Command execution creates history entry
- [ ] Dashboard CRUD operations work

### 6.2 Integration Tests

- [ ] Frontend connects to WebSocket
- [ ] Command execution flows through correctly
- [ ] Chart options render in ECharts
- [ ] Dashboard saves and loads panels

---

## 7. Migration Steps

1. **Fix HP Command Bug**
   - Change `symbol=` to `company__symbol=` in queries

2. **Add Missing GraphQL Queries/Mutations**
   - `commands` query
   - `commandHistory` query
   - `executeCommand` mutation
   - Chart/Dashboard mutations

3. **Implement WebSocket Consumer**
   - `/ws/terminal/` endpoint
   - Token authentication
   - Command routing

4. **Seed Command Registry**
   - Add HP, DES, FA, ERN, QUOTE to registry
   - Add GP, GIP, COMPARE for charts
   - Add HELP, HIST, SEARCH, CMD for system

---

## 8. Questions for Backend

1. **What data source are you using?** (Yahoo Finance, Polygon, Alpha Vantage, etc.)
2. **Is the Company model already populated?** Need to verify AAPL exists in `company` table
3. **Is the WebSocket consumer implemented?** (/ws/terminal/)
4. **What's the current GraphQL schema?** Need to see if command queries exist
5. **How is command parsing done?** Regex, NLP, or simple string matching?

---

## 9. Quick Fix for Symbol Error

The immediate fix for your error:

```python
# In the HP command handler, change:
prices = StockPrice.objects.filter(symbol=symbol)  # WRONG

# To:
prices = StockPrice.objects.filter(company__symbol=symbol.upper())  # CORRECT
```

Or add a `symbol` property to the StockPrice model:

```python
class StockPrice(models.Model):
    # ... existing fields ...
    
    @property
    def symbol(self):
        return self.company.symbol
```

Let me know:
1. Can you share the current command handler code?
2. What's in your `Company` table? (does AAPL exist?)
3. What GraphQL queries/mutations are currently exposed?

