# Backend Integration Plan for AI Terminal System

## Current State Analysis

Based on the error message:
```
> AAPL HP Cannot resolve keyword 'symbol' into field. Choices are: close_price, company, company_id, created_at, date, high_price, id, interval, low_price, open_price, updated_at, volume
```

The backend has a `StockPrice` or similar model but the command parser is trying to filter by `symbol` which doesn't exist directly on the model. The symbol is likely accessed via the `company` foreign key.

---

## 1. Database Models Required

### 1.1 Stock Data Models (stock_data app)

```python
# models.py
class Company(models.Model):
    """Company/Stock information"""
    symbol = models.CharField(max_length=10, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    exchange = models.CharField(max_length=20, null=True)
    sector = models.CharField(max_length=100, null=True)
    industry = models.CharField(max_length=100, null=True)
    market_cap = models.BigIntegerField(null=True)
    description = models.TextField(null=True)
    website = models.URLField(null=True)
    logo_url = models.URLField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class StockPrice(models.Model):
    """Historical stock prices - OHLCV data"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='prices')
    date = models.DateField(db_index=True)
    interval = models.CharField(max_length=10, default='1d')  # 1d, 1h, 5m, etc.
    open_price = models.DecimalField(max_digits=12, decimal_places=4)
    high_price = models.DecimalField(max_digits=12, decimal_places=4)
    low_price = models.DecimalField(max_digits=12, decimal_places=4)
    close_price = models.DecimalField(max_digits=12, decimal_places=4)
    volume = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'date', 'interval']
        indexes = [
            models.Index(fields=['company', 'date']),
        ]
```

### 1.2 Command System Models (ai_commands app)

```python
class CommandRegistry(models.Model):
    """Registry of available commands"""
    name = models.CharField(max_length=50, unique=True)
    aliases = models.JSONField(default=list)  # ["HP", "PRICE", "HIST"]
    category = models.CharField(max_length=20)  # EQUITY, CHART, SYSTEM
    description = models.TextField()
    requires_symbol = models.BooleanField(default=False)
    parameters_schema = models.JSONField(null=True)  # JSON Schema for params
    example_usage = models.CharField(max_length=255)
    credits_cost = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class CommandExecution(models.Model):
    """Log of all command executions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    raw_input = models.TextField()
    parsed_command = models.CharField(max_length=50, null=True)
    parsed_symbols = models.JSONField(default=list)
    parsed_parameters = models.JSONField(default=dict)
    is_ai_interpreted = models.BooleanField(default=False)
    ai_reasoning = models.TextField(null=True)
    status = models.CharField(max_length=20)  # pending, running, completed, failed
    result = models.JSONField(null=True)
    error_message = models.TextField(null=True)
    execution_time_ms = models.IntegerField(null=True)
    credits_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True)
```

### 1.3 Chart/Dashboard Models (charts app)

```python
class Chart(models.Model):
    """Saved chart configurations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    chart_type = models.CharField(max_length=50)  # candlestick, line, bar, etc.
    options = models.JSONField()  # ECharts options
    symbol = models.CharField(max_length=10, null=True)
    period = models.CharField(max_length=20, null=True)  # 1D, 1W, 1M, 1Y, etc.
    is_template = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Dashboard(models.Model):
    """User dashboards with chart panels"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class DashboardPanel(models.Model):
    """Panel position and chart reference"""
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='panels')
    chart = models.ForeignKey(Chart, on_delete=models.CASCADE)
    grid_x = models.IntegerField()
    grid_y = models.IntegerField()
    grid_w = models.IntegerField(default=6)
    grid_h = models.IntegerField(default=4)
    created_at = models.DateTimeField(auto_now_add=True)
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

