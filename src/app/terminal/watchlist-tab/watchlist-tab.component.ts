// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { Subscription, Subject, debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, CandlestickChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  AxisPointerComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { marked } from 'marked';
import { WatchlistService, StockListing } from '../watchlist.service';
import { TerminalService } from '../terminal.service';
import { TerminalWebSocketService } from '../terminal-websocket.service';
import { ChartDataService, ChartCandle, PageInfo, ChartInterval } from '../chart-data.service';
import { CommandResult, ChartResultData, ChartControls, TableData, SymbolUpdate } from '../terminal.types';
import { DataTableComponent } from '../data-table/data-table.component';

// Register required ECharts components
echarts.use([
  LineChart,
  BarChart,
  CandlestickChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  AxisPointerComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

interface SymbolListItem {
  symbol: string;
  displayName?: string;
  assetType?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  accessCount?: number;
  lastAccessedAt?: string;
}

interface SystemList {
  id: string;
  name: string;
  icon: string;
  type: 'sector' | 'industry' | 'exchange' | 'assetType';
  value: string;
}

interface EChartsTooltipParam {
  name: string;
  data: number[] | unknown;
  seriesName?: string;
  color?: string;
}

@Component({
  selector: 'app-watchlist-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatAutocompleteModule,
    NgxEchartsDirective,
    DataTableComponent,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './watchlist-tab.component.html',
  styleUrl: './watchlist-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistTabComponent implements OnInit, OnDestroy {
  // State
  loading = signal(false);
  selectedWatchlistId = signal<string>('recent'); // Changed to signal
  selectedSymbol = signal<string | null>(null);
  selectedItem = signal<SymbolListItem | null>(null);
  currentCommand = signal<string>('CHART');

  // Chart state
  chartLoading = signal(false);
  chartOptions = signal<EChartsOption | null>(null);
  chartError = signal<string | null>(null);
  // Data content for non-chart commands (HP, DES)
  dataContent = signal<SafeHtml | null>(null);
  // Table data for HP command
  tableData = signal<TableData | null>(null);
  // ECharts instance for zoom handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chartInstance: any = null;

  // Quote/price data for selected symbol
  quoteData = signal<SymbolUpdate | null>(null);

  // OHLC data from chart crosshair position
  crosshairData = signal<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    isPositive: boolean;
  } | null>(null);

  // Chart display toggles
  showLocalTime = signal(true); // Local time vs EST/Exchange time
  showExtendedHours = signal(false); // Extended trading hours
  showDividendsReinvested = signal(false); // Total return view
  lockToRight = signal(true); // Lock chart to show most recent data on right edge

  // Progressive data loading state
  loadingMoreData = signal(false);
  // Raw candle data for progressive loading (separate from ECharts options)
  rawCandleData = signal<ChartCandle[]>([]);
  // Page info from last data fetch (for cursor pagination)
  chartPageInfo = signal<PageInfo | null>(null);
  // Whether there's more historical data available
  hasOlderData = signal(true);

  // Inject DomSanitizer for markdown rendering
  private sanitizer = inject(DomSanitizer);

  // Chart controls - extended options from backend documentation
  selectedPeriod = signal('1Y');
  selectedInterval = signal('daily');
  // Default options - will be updated from backend chartControls when available
  periodOptions = signal(['1D', '5D', '1W', '2W', '1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '20Y', 'MAX']);
  intervalOptions = signal(['1min', '5min', '15min', '30min', '60min', 'daily', 'weekly', 'monthly']);
  // Command template for regenerating charts
  commandTemplate = signal<string | null>(null);

  // System sector lists - dynamically loaded from backend
  sectorLists = computed<SystemList[]>(() => {
    const sectors = this.watchlistService.gicsSectors();
    return sectors.map((s) => ({
      id: `sector:${s}`,
      name: s,
      icon: 'category',
      type: 'sector' as const,
      value: s,
    }));
  });

  // System industry lists - dynamically loaded from backend
  industryLists = computed<SystemList[]>(() => {
    const industries = this.watchlistService.gicsIndustries();
    return industries.map((i) => ({
      id: `industry:${i}`,
      name: i,
      icon: 'business',
      type: 'industry' as const,
      value: i,
    }));
  });

  // System exchange lists - dynamically loaded from backend
  exchangeLists = computed<SystemList[]>(() => {
    const exchanges = this.watchlistService.exchanges();
    return exchanges.map((e) => ({
      id: `exchange:${e}`,
      name: e,
      icon: 'account_balance',
      type: 'exchange' as const,
      value: e,
    }));
  });

  // Asset types list - hardcoded until backend provides endpoint
  assetTypeLists = computed<SystemList[]>(() => {
    const assetTypes = [
      { value: 'Stock', name: 'Stocks', icon: 'trending_up' },
      { value: 'ETF', name: 'ETFs', icon: 'analytics' },
      { value: 'Mutual Fund', name: 'Mutual Funds', icon: 'account_balance_wallet' },
      { value: 'Index', name: 'Indexes', icon: 'show_chart' },
      { value: 'Crypto', name: 'Crypto', icon: 'currency_bitcoin' },
    ];
    return assetTypes.map((a) => ({
      id: `assetType:${a.value}`,
      name: a.name,
      icon: a.icon,
      type: 'assetType' as const,
      value: a.value,
    }));
  });

  // Dynamically loaded sector symbols
  sectorSymbols = signal<SymbolListItem[]>([]);

  // Dynamically loaded industry symbols
  industrySymbols = signal<SymbolListItem[]>([]);

  // Dynamically loaded exchange symbols
  exchangeSymbols = signal<SymbolListItem[]>([]);

  // Dynamically loaded asset type symbols
  assetTypeSymbols = signal<SymbolListItem[]>([]);

  // Create watchlist form
  newWatchlistName = '';
  newWatchlistDescription = '';
  showCreateForm = signal(false);

  // Add symbol form with autocomplete
  newSymbolInput = '';
  showAddSymbolForm = signal(false);
  symbolSearchResults = signal<StockListing[]>([]);
  selectedStockListing = signal<StockListing | null>(null);
  private symbolSearchSubject = new Subject<string>();

  private subscriptions = new Subscription();

  // Sort options for the symbol list
  sortBy = signal<'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt' | null>('lastAccessedAt');
  sortDirection = signal<'desc' | 'asc' | null>('asc'); // asc = oldest first for lastAccessedAt by default

  // Helper to sort symbols by market cap (descending, nulls last)
  private sortByMarketCap(items: SymbolListItem[]): SymbolListItem[] {
    return [...items].sort((a, b) => {
      const aVal = a.marketCap ?? 0;
      const bVal = b.marketCap ?? 0;
      return bVal - aVal; // Descending order
    });
  }

  // Helper to sort by access count (descending)
  private sortByAccessCount(items: SymbolListItem[]): SymbolListItem[] {
    return [...items].sort((a, b) => {
      const aVal = a.accessCount ?? 0;
      const bVal = b.accessCount ?? 0;
      return bVal - aVal;
    });
  }

  // Helper to sort alphabetically by symbol
  private sortBySymbol(items: SymbolListItem[]): SymbolListItem[] {
    return [...items].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  // Helper to sort by last accessed date (most recent first)
  private sortByLastAccessedAt(items: SymbolListItem[]): SymbolListItem[] {
    return [...items].sort((a, b) => {
      const aDate = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const bDate = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return bDate - aDate; // Most recent first
    });
  }

  // Apply current sort to items with direction support
  private applySorting(items: SymbolListItem[]): SymbolListItem[] {
    const sort = this.sortBy();
    const direction = this.sortDirection();

    // If no sort or no direction, return natural order
    if (!sort || !direction) {
      return items;
    }

    const sorted = [...items];
    const multiplier = direction === 'asc' ? 1 : -1;

    switch (sort) {
      case 'marketCap':
        return sorted.sort((a, b) => {
          const aVal = a.marketCap ?? 0;
          const bVal = b.marketCap ?? 0;
          return (bVal - aVal) * multiplier;
        });
      case 'accessCount':
        return sorted.sort((a, b) => {
          const aVal = a.accessCount ?? 0;
          const bVal = b.accessCount ?? 0;
          return (bVal - aVal) * multiplier;
        });
      case 'symbol':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol) * multiplier);
      case 'lastAccessedAt':
        return sorted.sort((a, b) => {
          const aDate = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
          const bDate = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
          return (bDate - aDate) * multiplier;
        });
      default:
        return items;
    }
  }

  // Computed: get symbols for current selection
  currentSymbols = computed<SymbolListItem[]>(() => {
    const watchlistId = this.selectedWatchlistId();
    let items: SymbolListItem[] = [];

    // Handle sector system lists
    if (watchlistId.startsWith('sector:')) {
      items = this.sectorSymbols();
    } else if (watchlistId.startsWith('industry:')) {
      items = this.industrySymbols();
    } else if (watchlistId.startsWith('exchange:')) {
      items = this.exchangeSymbols();
    } else if (watchlistId.startsWith('assetType:')) {
      items = this.assetTypeSymbols();
    } else if (watchlistId === 'recent') {
      const recentSymbols = this.watchlistService.recentSymbols() || [];
      items = recentSymbols.map((item) => ({
        symbol: item.symbol,
        displayName: item.displayName,
        assetType: item.assetType,
        exchange: item.exchange,
        sector: item.sector,
        industry: item.industry,
        marketCap: item.marketCap,
        accessCount: item.accessCount,
        lastAccessedAt: item.lastAccessedAt,
      }));
    } else {
      // Find the watchlist by uuid
      const searchHistory = this.watchlistService.searchHistory();
      if (searchHistory && searchHistory.uuid === watchlistId) {
        items = (searchHistory.items || []).map((item) => ({
          symbol: item.symbol,
          displayName: item.displayName,
          assetType: item.assetType,
          exchange: item.exchange,
          sector: item.sector,
          industry: item.industry,
          marketCap: item.marketCap,
          accessCount: item.accessCount,
          lastAccessedAt: item.lastAccessedAt,
        }));
      } else {
        const customWatchlists = this.watchlistService.customWatchlists() || [];
        const customList = customWatchlists.find((wl) => wl.uuid === watchlistId);
        if (customList) {
          items = (customList.items || []).map((item) => ({
            symbol: item.symbol,
            displayName: item.displayName,
            assetType: item.assetType,
            exchange: item.exchange,
            sector: item.sector,
            industry: item.industry,
            marketCap: item.marketCap,
            accessCount: item.accessCount,
            lastAccessedAt: item.lastAccessedAt,
          }));
        }
      }
    }

    // Apply sorting - read sortBy signal to trigger recomputation when it changes
    this.sortBy();
    return this.applySorting(items);
  });

  /**
   * Check if current watchlist allows adding symbols
   * System categories (sectors, industries, exchanges) are read-only
   */
  canAddToWatchlist = computed<boolean>(() => {
    const id = this.selectedWatchlistId();
    // Can't add to recent (auto-populated) or system categories
    return id !== 'recent' && !this.isSystemCategory(id);
  });

  /**
   * Check if current watchlist allows removing symbols
   * System categories are read-only
   */
  canRemoveFromWatchlist(): boolean {
    const id = this.selectedWatchlistId();
    // Can't remove from system categories (sectors, industries, exchanges)
    return !this.isSystemCategory(id);
  }

  /**
   * Check if watchlist is a system category
   */
  isSystemCategory(id: string): boolean {
    return id.startsWith('sector:') || id.startsWith('industry:') || id.startsWith('exchange:');
  }

  /**
   * Get tooltip for sort button showing current state and next action
   */
  getSortTooltip(field: string, label: string): string {
    const currentSort = this.sortBy();
    const direction = this.sortDirection();

    if (currentSort === field) {
      if (direction === 'desc') {
        return `${label} (Desc) - Click for Asc`;
      } else if (direction === 'asc') {
        return `${label} (Asc) - Click to Clear`;
      }
    }
    return `Sort by ${label}`;
  }

  /**
   * Get the display name for the currently selected watchlist
   */
  getSelectedWatchlistName(): string {
    const id = this.selectedWatchlistId();

    if (id === 'recent') {
      return `Recent (${(this.watchlistService.recentSymbols() || []).length})`;
    }

    // Check system categories
    if (id.startsWith('sector:')) {
      return id.replace('sector:', '');
    }
    if (id.startsWith('industry:')) {
      return id.replace('industry:', '');
    }
    if (id.startsWith('exchange:')) {
      return id.replace('exchange:', '');
    }

    // Check search history
    const searchHistory = this.watchlistService.searchHistory();
    if (searchHistory && searchHistory.uuid === id) {
      return `${searchHistory.name} (${searchHistory.itemCount})`;
    }

    // Check custom watchlists
    const customWatchlists = this.watchlistService.customWatchlists() || [];
    const customList = customWatchlists.find((wl) => wl.uuid === id);
    if (customList) {
      return `${customList.name} (${customList.itemCount})`;
    }

    return 'Select Watchlist';
  }

  /**
   * Get the icon for the currently selected watchlist
   */
  getSelectedWatchlistIcon(): string {
    const id = this.selectedWatchlistId();

    if (id === 'recent') {
      return 'schedule';
    }

    if (id.startsWith('sector:')) {
      return 'category';
    }
    if (id.startsWith('industry:')) {
      return 'business';
    }
    if (id.startsWith('exchange:')) {
      return 'account_balance';
    }

    const searchHistory = this.watchlistService.searchHistory();
    if (searchHistory && searchHistory.uuid === id) {
      return 'history';
    }

    const customWatchlists = this.watchlistService.customWatchlists() || [];
    const customList = customWatchlists.find((wl) => wl.uuid === id);
    if (customList) {
      return this.getWatchlistIcon(customList.watchlistType);
    }

    return 'list';
  }

  /**
   * Check if industries list is available from backend
   */
  hasIndustries(): boolean {
    return (this.watchlistService.gicsIndustries()?.length ?? 0) > 0;
  }

  /**
   * Check if exchanges list is available from backend
   */
  hasExchanges(): boolean {
    return (this.watchlistService.exchanges()?.length ?? 0) > 0;
  }

  constructor(
    protected watchlistService: WatchlistService,
    protected terminalService: TerminalService,
    private terminalWsService: TerminalWebSocketService,
    private chartDataService: ChartDataService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.subscribeToCommandResults();
    this.subscribeToSymbolUpdates();
    this.setupSymbolSearch();
  }

  ngOnDestroy(): void {
    // Unsubscribe from any active symbol quote updates
    const currentSymbol = this.selectedSymbol();
    if (currentSymbol) {
      this.terminalService.unsubscribeSymbols([currentSymbol]);
    }

    this.subscriptions.unsubscribe();
    this.symbolSearchSubject.complete();
  }

  /**
   * Setup symbol search with debounce
   */
  private setupSymbolSearch(): void {
    this.subscriptions.add(
      this.symbolSearchSubject
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((query) => this.watchlistService.searchStockListings(query, 10)),
        )
        .subscribe((results) => {
          this.symbolSearchResults.set(results);
        }),
    );
  }

  /**
   * Handle symbol input change for autocomplete
   */
  onSymbolInputChange(value: string): void {
    this.newSymbolInput = value;
    this.selectedStockListing.set(null);
    this.symbolSearchSubject.next(value);
  }

  /**
   * Select a stock listing from autocomplete
   */
  selectStockListing(listing: StockListing): void {
    this.selectedStockListing.set(listing);
    this.newSymbolInput = listing.symbol;
  }

  /**
   * Display function for autocomplete
   */
  displayStockListing(listing: StockListing | null): string {
    return listing ? listing.symbol : '';
  }

  /**
   * Load initial data
   */
  loadData(): void {
    this.loading.set(true);

    // Load custom watchlists
    this.subscriptions.add(
      this.watchlistService.loadWatchlists().subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
      }),
    );

    // Load recent symbols with default sort (lastAccessedAt)
    this.subscriptions.add(this.watchlistService.loadRecentSymbols(30, 'lastAccessedAt').subscribe());

    // Load GICS sectors from backend
    this.subscriptions.add(this.watchlistService.loadGicsSectors().subscribe());

    // Load GICS industries from backend
    this.subscriptions.add(this.watchlistService.loadGicsIndustries().subscribe());

    // Load exchanges from backend
    this.subscriptions.add(this.watchlistService.loadExchanges().subscribe());
  }

  /**
   * Subscribe to command results from terminal to update chart or data display
   */
  private subscribeToCommandResults(): void {
    this.subscriptions.add(
      this.terminalWsService.onCommandResult.subscribe((result: CommandResult) => {
        console.log('[WatchlistTab] onCommandResult received:', result);
        console.log('[WatchlistTab] result.outputType:', result?.outputType);
        console.log('[WatchlistTab] result.chartOptions type:', typeof result?.chartOptions);
        console.log('[WatchlistTab] result.success:', result?.success);

        if (!result) return;

        // Get symbol from metadata - try multiple access patterns
        const resultSymbol = result.metadata?.symbol as string | undefined;
        const selectedSym = this.selectedSymbol();

        // Extract chartControls from result data if available
        this.extractChartControls(result);

        // Check if this result is for our selected symbol OR if it's a new command from the terminal bar
        const isForSelectedSymbol =
          resultSymbol && selectedSym && resultSymbol.toUpperCase() === selectedSym.toUpperCase();

        // Also accept results if we're loading or if this is a symbol command that should update the display
        const shouldHandleResult = isForSelectedSymbol || this.chartLoading() || (resultSymbol && result.success);

        console.log('[WatchlistTab] Decision logic:', {
          resultSymbol,
          selectedSym,
          isForSelectedSymbol,
          chartLoading: this.chartLoading(),
          shouldHandleResult,
        });

        if (shouldHandleResult) {
          // Update the selected symbol if the result has one and we didn't have one selected
          if (resultSymbol && !selectedSym) {
            this.selectedSymbol.set(resultSymbol.toUpperCase());
          }

          this.chartLoading.set(false);

          console.log(
            '[WatchlistTab] Processing result, outputType:',
            result.outputType,
            'chartOptions:',
            !!result.chartOptions,
          );

          if (result.success) {
            if (result.outputType === 'chart' && result.chartOptions) {
              // Parse chartOptions - handle string or object (from GraphQL JSON scalar)
              const parsedOptions = this.parseChartOptions(result.chartOptions);
              if (!parsedOptions) {
                this.chartError.set('Failed to parse chart data');
                return;
              }

              // Extract and store raw candle data for progressive loading
              this.extractAndStoreCandleData(result);

              // Apply dark theme overrides
              const themedOptions = this.applyDarkTheme(parsedOptions);
              console.log('[WatchlistTab] Themed chartOptions keys:', Object.keys(themedOptions).slice(0, 8));

              this.chartOptions.set(themedOptions);
              this.dataContent.set(null);
              this.tableData.set(null);
              this.chartError.set(null);

              // Reset progressive loading state for new chart
              this.hasOlderData.set(true);
              this.chartPageInfo.set(null);
            } else if (result.outputType === 'data' || result.outputType === 'message') {
              // Data result (HP, DES, etc.)
              this.chartOptions.set(null);
              this.chartError.set(null);

              // Check if data is a table
              if (this.isTableData(result.data)) {
                this.tableData.set(result.data as TableData);
                // Render message as markdown if present
                if (result.message) {
                  this.dataContent.set(this.markdownToHtml(result.message));
                } else {
                  this.dataContent.set(null);
                }
              } else {
                this.tableData.set(null);
                // Format the data content for display with markdown
                const content = this.formatDataResult(result);
                this.dataContent.set(this.markdownToHtml(content));
              }
            } else if (result.outputType === 'chart' && !result.chartOptions) {
              // Chart result but no options - might be fetching
              this.chartError.set('Chart data is loading...');
              this.chartOptions.set(null);
              this.dataContent.set(null);
              this.tableData.set(null);
            } else if (result.message) {
              // Generic message result - render as markdown
              this.dataContent.set(this.markdownToHtml(result.message));
              this.chartOptions.set(null);
              this.tableData.set(null);
              this.chartError.set(null);
            }
          } else {
            this.chartError.set(result.message || 'Command failed');
            this.chartOptions.set(null);
            this.dataContent.set(null);
            this.tableData.set(null);
          }
        }
      }),
    );
  }

  /**
   * Subscribe to real-time symbol price updates
   */
  private subscribeToSymbolUpdates(): void {
    this.subscriptions.add(
      this.terminalService.onSymbolUpdate
        .pipe(
          filter((update) => {
            const selected = this.selectedSymbol();
            return !!selected && update.symbol.toUpperCase() === selected.toUpperCase();
          }),
        )
        .subscribe((update: SymbolUpdate) => {
          this.quoteData.set(update);
        }),
    );
  }

  /**
   * Check if data is TableData format
   */
  private isTableData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as { type?: string };
    return d.type === 'table';
  }

  /**
   * Convert markdown text to safe HTML for rendering.
   */
  markdownToHtml(markdown: string): SafeHtml {
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Format data result for display
   */
  private formatDataResult(result: CommandResult): string {
    const parts: string[] = [];

    // Add message if present
    if (result.message) {
      parts.push(`<p class="result-message">${result.message}</p>`);
    }

    // Format data based on type
    if (result.data) {
      // Check if it's a simple object we can display as key-value pairs
      if (typeof result.data === 'object' && !Array.isArray(result.data)) {
        const dataObj = result.data as Record<string, unknown>;
        // Filter out internal fields and format nicely
        const displayFields = Object.entries(dataObj).filter(
          ([key]) => !key.startsWith('_') && key !== 'chartControls',
        );

        if (displayFields.length > 0) {
          parts.push('<div class="data-table">');
          for (const [key, value] of displayFields) {
            const label = this.formatFieldLabel(key);
            const displayValue = this.formatFieldValue(value);
            parts.push(`<div class="data-row"><span class="data-label">${label}</span><span class="data-value">
            ${displayValue}</span></div>`);
          }
          parts.push('</div>');
        }
      } else if (Array.isArray(result.data)) {
        // Array data - could be table data
        parts.push(`<p><em>Array data with ${result.data.length} items</em></p>`);
      }
    }

    return parts.join('') || '<p>No data available</p>';
  }

  /**
   * Format a field label for display
   */
  private formatFieldLabel(key: string): string {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format a field value for display
   */
  private formatFieldValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
      // Format large numbers with commas
      if (value > 1000000000) return (value / 1000000000).toFixed(2) + 'B';
      if (value > 1000000) return (value / 1000000).toFixed(2) + 'M';
      if (value > 1000) return value.toLocaleString();
      return value.toString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Extract chartControls from result and update available options
   */
  private extractChartControls(result: CommandResult): void {
    if (result.outputType !== 'chart') return;

    // Try to get chartControls from data.chartControls or metadata.chartControls
    const chartData = result.data as ChartResultData | undefined;
    const controls = chartData?.chartControls ?? (result.metadata as { chartControls?: ChartControls })?.chartControls;

    if (controls) {
      // Update available options from backend
      if (controls.periodOptions?.length) {
        this.periodOptions.set(controls.periodOptions);
      }
      if (controls.intervalOptions?.length) {
        this.intervalOptions.set(controls.intervalOptions);
      }
      if (controls.commandTemplate) {
        this.commandTemplate.set(controls.commandTemplate);
      }
      // Sync current selections with what backend returned
      if (controls.currentPeriod) {
        this.selectedPeriod.set(controls.currentPeriod);
      }
      if (controls.currentInterval) {
        this.selectedInterval.set(controls.currentInterval);
      }
    }
  }

  /**
   * Handle sort option change - implements tri-state cycling: desc → asc → none
   */
  onSortChange(sort: 'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt'): void {
    const currentSort = this.sortBy();
    const currentDirection = this.sortDirection();

    if (currentSort === sort) {
      // Same sort clicked - cycle through desc → asc → none
      if (currentDirection === 'desc') {
        this.sortDirection.set('asc');
      } else if (currentDirection === 'asc') {
        this.sortBy.set(null);
        this.sortDirection.set(null);
      } else {
        // Was null, start with desc
        this.sortDirection.set('desc');
      }
    } else {
      // Different sort clicked - set to desc
      this.sortBy.set(sort);
      this.sortDirection.set('desc');
    }

    // For Recent watchlist, reload from backend with new sort order
    const effectiveSort = this.sortBy();
    if (this.selectedWatchlistId() === 'recent' && effectiveSort) {
      this.subscriptions.add(this.watchlistService.loadRecentSymbols(30, effectiveSort).subscribe());
    }
    // For system categories, reload with new sort order
    else if (this.selectedWatchlistId().startsWith('sector:') && effectiveSort) {
      const sectorName = this.selectedWatchlistId().replace('sector:', '');
      this.loadCategorySectorSymbols(sectorName, effectiveSort);
    } else if (this.selectedWatchlistId().startsWith('industry:') && effectiveSort) {
      const industryName = this.selectedWatchlistId().replace('industry:', '');
      this.loadCategoryIndustrySymbols(industryName, effectiveSort);
    } else if (this.selectedWatchlistId().startsWith('exchange:') && effectiveSort) {
      const exchangeName = this.selectedWatchlistId().replace('exchange:', '');
      this.loadCategoryExchangeSymbols(exchangeName, effectiveSort);
    } else if (this.selectedWatchlistId().startsWith('assetType:')) {
      const assetTypeName = this.selectedWatchlistId().replace('assetType:', '');
      this.loadCategoryAssetTypeSymbols(assetTypeName);
    }
    // For custom watchlists, local sorting is already applied via computed
  }

  /**
   * Handle watchlist dropdown change
   */
  onWatchlistChange(newValue: string): void {
    this.selectedWatchlistId.set(newValue);
    // Clear selection when switching lists
    this.selectedSymbol.set(null);
    this.selectedItem.set(null);
    this.chartOptions.set(null);
    this.chartError.set(null);

    // Set default sort based on watchlist type
    if (newValue === 'recent') {
      // Recent watchlist: sort by most recently accessed by default
      this.sortBy.set('lastAccessedAt');
    } else if (newValue.startsWith('sector:')) {
      // Sector lists: sort by market cap by default
      this.sortBy.set('marketCap');
      const sectorName = newValue.replace('sector:', '');
      this.loadCategorySectorSymbols(sectorName);
    } else if (newValue.startsWith('industry:')) {
      // Industry lists: sort by market cap by default
      this.sortBy.set('marketCap');
      const industryName = newValue.replace('industry:', '');
      this.loadCategoryIndustrySymbols(industryName);
    } else if (newValue.startsWith('exchange:')) {
      // Exchange lists: sort by market cap by default
      this.sortBy.set('marketCap');
      const exchangeName = newValue.replace('exchange:', '');
      this.loadCategoryExchangeSymbols(exchangeName);
    } else if (newValue.startsWith('assetType:')) {
      // Asset type lists: sort by market cap by default
      this.sortBy.set('marketCap');
      const assetTypeName = newValue.replace('assetType:', '');
      this.loadCategoryAssetTypeSymbols(assetTypeName);
    } else {
      // Custom watchlists: keep current sort or default to lastAccessedAt
      // (user may have set a preference)
    }
  }

  /**
   * Load symbols for a specific sector from system catalog
   */
  private loadCategorySectorSymbols(sector: string, orderBy = 'marketCap'): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService.loadAllSectorSymbols(sector, 100, orderBy).subscribe({
        next: (symbols) => {
          this.sectorSymbols.set(
            symbols.map((item) => ({
              symbol: item.symbol,
              displayName: item.displayName,
              assetType: item.assetType,
              exchange: item.exchange,
              sector: item.sector,
              industry: item.industry,
              marketCap: item.marketCap,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.sectorSymbols.set([]);
          this.loading.set(false);
        },
      }),
    );
  }

  /**
   * Load symbols for a specific industry from system catalog
   */
  private loadCategoryIndustrySymbols(industry: string, orderBy = 'marketCap'): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService.loadAllIndustrySymbols(industry, 100, orderBy).subscribe({
        next: (symbols) => {
          this.industrySymbols.set(
            symbols.map((item) => ({
              symbol: item.symbol,
              displayName: item.displayName,
              assetType: item.assetType,
              exchange: item.exchange,
              sector: item.sector,
              industry: item.industry,
              marketCap: item.marketCap,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.industrySymbols.set([]);
          this.loading.set(false);
        },
      }),
    );
  }

  /**
   * Load symbols for a specific exchange from system catalog
   */
  private loadCategoryExchangeSymbols(exchange: string, orderBy = 'marketCap'): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService.loadExchangeSymbols(exchange, 100, orderBy).subscribe({
        next: (symbols) => {
          this.exchangeSymbols.set(
            symbols.map((item) => ({
              symbol: item.symbol,
              displayName: item.displayName,
              assetType: item.assetType,
              exchange: item.exchange,
              sector: item.sector,
              industry: item.industry,
              marketCap: item.marketCap,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.exchangeSymbols.set([]);
          this.loading.set(false);
        },
      }),
    );
  }

  /**
   * Load symbols for a specific asset type from stock listings
   */
  private loadCategoryAssetTypeSymbols(assetType: string): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService.loadAssetTypeSymbols(assetType, 100).subscribe({
        next: (symbols) => {
          this.assetTypeSymbols.set(
            symbols.map((item) => ({
              symbol: item.symbol,
              displayName: item.name,
              assetType: item.assetType,
              exchange: item.exchange,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.assetTypeSymbols.set([]);
          this.loading.set(false);
        },
      }),
    );
  }

  /**
   * Select a symbol and load its chart
   */
  selectSymbol(item: SymbolListItem): void {
    // Unsubscribe from previous symbol if any
    const previousSymbol = this.selectedSymbol();
    if (previousSymbol) {
      this.terminalService.unsubscribeSymbols([previousSymbol]);
    }

    this.selectedSymbol.set(item.symbol);
    this.selectedItem.set(item);
    this.chartError.set(null);
    this.quoteData.set(null); // Clear previous quote data

    // Subscribe to real-time updates for this symbol
    this.terminalService.subscribeSymbols([item.symbol]);

    // Fetch initial quote data via GraphQL
    const fqn = item.exchange ? `STOCK:${item.exchange.toUpperCase()}:${item.symbol.toUpperCase()}` : undefined;
    this.subscriptions.add(
      this.terminalService.fetchQuote(item.symbol, fqn).subscribe((quote) => {
        if (quote) {
          this.quoteData.set(quote);
        }
      }),
    );

    // Load chart with default command (1D chart on first select)
    this.loadChart(item.symbol, item.exchange, 'CHART');
  }

  /**
   * Load chart or data for symbol using FQN format or ChartDataService
   */
  private loadChart(symbol: string, exchange: string | undefined, command: string): void {
    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.dataContent.set(null);
    this.tableData.set(null);
    this.currentCommand.set(command);

    // For CHART command, use ChartDataService for progressive loading
    if (command === 'CHART') {
      this.loadChartWithOptions(symbol);
      return;
    }

    // For other commands (HISTORY, etc.), use terminal execute
    const symbolFqn = `STOCK:${(exchange || 'UNKNOWN').toUpperCase()}:${symbol.toUpperCase()}`;
    const commandFqn = `COMMAND:${command.toUpperCase()}`;
    const fullCommand = `${symbolFqn} ${commandFqn}`;

    console.log('[WatchlistTab] Executing FQN command:', fullCommand);
    this.terminalService.execute(fullCommand);
  }

  /**
   * Run a command for a symbol
   */
  runCommand(symbol: string, command: string): void {
    this.currentCommand.set(command);
    const item = this.selectedItem();
    this.loadChart(symbol, item?.exchange, command);
  }

  /**
   * Retry loading the chart
   */
  retryChart(): void {
    const symbol = this.selectedSymbol();
    const item = this.selectedItem();
    if (symbol) {
      this.loadChart(symbol, item?.exchange, this.currentCommand());
    }
  }

  /**
   * Handle chart initialization - set up zoom behavior and OHLC crosshair
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChartInit(chart: any): void {
    this.chartInstance = chart;

    // Listen for datazoom events to detect when user zooms out
    chart.on('datazoom', (params: { start?: number; end?: number; batch?: { start?: number; end?: number }[] }) => {
      // Get current zoom state
      const option = chart.getOption();
      const dataZoom = option.dataZoom;

      if (!dataZoom || dataZoom.length === 0) return;

      // Find the inside dataZoom
      const insideZoom = dataZoom.find((dz: { type?: string }) => dz.type === 'inside') || dataZoom[0];
      const startPercent = params.start ?? params.batch?.[0]?.start ?? insideZoom.start ?? 0;
      const endPercent = params.end ?? params.batch?.[0]?.end ?? insideZoom.end ?? 100;

      console.log('[WatchlistTab] DataZoom event - start:', startPercent, 'end:', endPercent);

      // If lockToRight is enabled and user tries to scroll left, keep end at 100%
      if (this.lockToRight() && endPercent < 100) {
        const zoomRange = endPercent - startPercent;
        chart.dispatchAction({
          type: 'dataZoom',
          start: 100 - zoomRange,
          end: 100,
        });
        return;
      }

      // Check if we need to load more data when zoomed out near boundary
      this.checkProgressiveDataLoad(startPercent);
    });

    // Listen for mousemove to update OHLC display based on crosshair position
    chart.getZr().on('mousemove', (params: { offsetX: number; offsetY: number }) => {
      // Convert pixel position to data index
      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [params.offsetX, params.offsetY]);
      if (pointInGrid) {
        const dataIndex = Math.round(pointInGrid[0]);
        if (dataIndex >= 0) {
          this.updateCrosshairOHLC(dataIndex);
        }
      }
    });

    // Clear OHLC when mouse leaves chart
    chart.getZr().on('globalout', () => {
      this.crosshairData.set(null);
    });
  }

  /**
   * Update OHLC display from crosshair position
   */
  private updateCrosshairOHLC(dataIndex: number): void {
    const options = this.chartOptions();
    if (!options) return;

    // Get series data - candlestick format is [open, close, low, high]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series = options.series as any[];
    if (!series || series.length === 0) return;

    const candlestickSeries = series.find((s) => s.type === 'candlestick');
    if (!candlestickSeries?.data) return;

    const candleData = candlestickSeries.data[dataIndex];
    if (!candleData || !Array.isArray(candleData)) return;

    // Get the date from xAxis data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xAxis = options.xAxis as any;
    const xAxisData = Array.isArray(xAxis) ? xAxis[0]?.data : xAxis?.data;
    const dateStr = xAxisData?.[dataIndex];

    // ECharts candlestick data format: [open, close, low, high]
    const [open, close, low, high] = candleData;
    const isPositive = close >= open;

    // Get volume if available
    let volume: number | undefined;
    const volumeSeries = series.find((s) => s.type === 'bar' && s.name?.toLowerCase().includes('volume'));
    if (volumeSeries?.data?.[dataIndex]) {
      volume = volumeSeries.data[dataIndex];
    }

    this.crosshairData.set({
      date: dateStr || '',
      open,
      high,
      low,
      close,
      volume,
      isPositive,
    });
  }

  /**
   * Check if we need to load more data when zooming out
   */
  private checkProgressiveDataLoad(startPercent: number): void {
    // If zoomed out past 20% (meaning we're showing 80%+ of data from left edge), try to load more
    // This gives buffer to load data before user hits the actual boundary
    if (startPercent <= 20 && !this.loadingMoreData() && this.hasOlderData()) {
      console.log('[WatchlistTab] Triggering progressive data load at', startPercent, '%');
      this.loadOlderChartData();
    }
  }

  /**
   * Load older historical data when user zooms out
   */
  private loadOlderChartData(): void {
    const symbol = this.selectedSymbol();
    const candles = this.rawCandleData();
    const item = this.selectedItem();

    if (!symbol || candles.length === 0) {
      console.log('[WatchlistTab] Cannot load older data: no symbol or candles');
      return;
    }

    this.loadingMoreData.set(true);

    // Get the oldest candle date as the end date for the new fetch
    // Candles are sorted by date ascending (oldest first), so first element is oldest
    const oldestCandle = candles[0];
    const endDate = new Date(oldestCandle.date);

    // Calculate start date based on interval (go back 1 year for daily)
    const startDate = new Date(endDate);
    const interval = this.selectedInterval();
    const backendInterval = this.mapIntervalToBackend(interval);

    // Adjust fetch range based on interval
    if (backendInterval === 'DAILY') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (backendInterval === 'WEEKLY') {
      startDate.setFullYear(startDate.getFullYear() - 2);
    } else if (backendInterval === 'MONTHLY') {
      startDate.setFullYear(startDate.getFullYear() - 5);
    } else {
      // Intraday - go back 1 month
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Build FQN if we have exchange info
    const fqn = item?.exchange ? `STOCK:${item.exchange.toUpperCase()}:${symbol.toUpperCase()}` : undefined;

    console.log('[WatchlistTab] Loading older data:', { symbol, startDate, endDate, interval: backendInterval, fqn });

    this.subscriptions.add(
      this.chartDataService.loadDataByRange(symbol, startDate, endDate, backendInterval, fqn).subscribe({
        next: (result) => {
          console.log('[WatchlistTab] Received older data:', result.candles.length, 'candles');

          if (result.candles.length > 0) {
            // Merge with existing candles (avoid duplicates)
            const mergedCandles = this.mergeCandles(candles, result.candles);
            this.rawCandleData.set(mergedCandles);

            // Update page info
            this.chartPageInfo.set(result.pageInfo);
            this.hasOlderData.set(result.pageInfo.hasOlderData);

            // Update the chart with merged data
            this.updateChartWithMergedData(mergedCandles);
          } else {
            // No more data available
            this.hasOlderData.set(false);
          }

          this.loadingMoreData.set(false);
        },
        error: (err) => {
          console.error('[WatchlistTab] Failed to load older data:', err);
          this.loadingMoreData.set(false);
        },
      }),
    );
  }

  /**
   * Merge new candles with existing ones, avoiding duplicates
   */
  private mergeCandles(existing: ChartCandle[], newCandles: ChartCandle[]): ChartCandle[] {
    // Create a map of existing dates
    const dateMap = new Map(existing.map((c) => [c.date.getTime(), c]));

    // Add new candles that don't exist
    for (const candle of newCandles) {
      const time = candle.date.getTime();
      if (!dateMap.has(time)) {
        dateMap.set(time, candle);
      }
    }

    // Convert back to array and sort by date descending (newest first)
    return Array.from(dateMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Update the chart with merged candle data
   */
  private updateChartWithMergedData(candles: ChartCandle[]): void {
    const currentOptions = this.chartOptions();
    if (!currentOptions || !this.chartInstance) return;

    // Get current zoom state to maintain view position
    const option = this.chartInstance.getOption();
    const dataZoom = option.dataZoom;
    let currentStart = 0;
    let currentEnd = 100;
    if (dataZoom && dataZoom.length > 0) {
      const insideZoom = dataZoom.find((dz: { type?: string }) => dz.type === 'inside') || dataZoom[0];
      currentStart = insideZoom.start ?? 0;
      currentEnd = insideZoom.end ?? 100;
    }

    // Build new series data from candles
    const candlestickData = candles.map((c) => [c.open, c.close, c.low, c.high]);
    const volumeData = candles.map((c) => c.volume);
    const xAxisData = candles.map((c) => this.formatDateForChart(c.date));

    // Update chart options - use type assertion for series array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedSeries = (currentOptions.series as any[])?.map((s: any) => {
      if (s.type === 'candlestick') {
        return { ...s, data: candlestickData };
      } else if (s.type === 'bar') {
        return { ...s, data: volumeData };
      }
      return s;
    });

    // Calculate new zoom position based on lock setting
    let newStart = currentStart;
    let newEnd = currentEnd;

    if (this.lockToRight()) {
      // Keep the same zoom range but anchored to the right
      const zoomRange = currentEnd - currentStart;
      newEnd = 100;
      newStart = 100 - zoomRange;
    }

    const newOptions: EChartsOption = {
      ...currentOptions,
      xAxis: Array.isArray(currentOptions.xAxis)
        ? currentOptions.xAxis.map((axis) => ({ ...axis, data: xAxisData }))
        : { ...(currentOptions.xAxis as object), data: xAxisData },
      series: updatedSeries as EChartsOption['series'],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: newStart,
          end: newEnd,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
          minValueSpan: 10,
        },
      ],
    };

    this.chartInstance.setOption(newOptions, { notMerge: false });
  }

  /**
   * Format date for chart x-axis display
   */
  private formatDateForChart(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  /**
   * Extract and store raw candle data from command result for progressive loading
   */
  private extractAndStoreCandleData(result: CommandResult): void {
    // Try to get prices from result.data
    const data = result.data as ChartResultData | undefined;
    if (!data?.prices || !Array.isArray(data.prices)) {
      console.log('[WatchlistTab] No prices array in result data');
      return;
    }

    // Parse prices into ChartCandle format
    const candles: ChartCandle[] = data.prices.map(
      (p: {
        date?: string;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        adjustedClose?: number;
      }) => ({
        date: new Date(p.date || ''),
        open: p.open || 0,
        high: p.high || 0,
        low: p.low || 0,
        close: p.close || 0,
        volume: p.volume || 0,
        adjustedClose: p.adjustedClose,
      }),
    );

    // Sort by date ascending (oldest first for chart display)
    candles.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log('[WatchlistTab] Stored', candles.length, 'candles for progressive loading');
    this.rawCandleData.set(candles);
  }

  /**
   * Remove a symbol from current watchlist
   */
  removeSymbol(item: SymbolListItem): void {
    const watchlistId = this.selectedWatchlistId();

    if (watchlistId === 'recent') {
      // For recent, we need to remove from search history
      const searchHistory = this.watchlistService.searchHistory();
      if (searchHistory) {
        this.subscriptions.add(
          this.watchlistService.removeFromWatchlist(searchHistory.uuid, item.symbol).subscribe({
            next: () => {
              // Reload recent symbols after removal
              this.watchlistService.loadRecentSymbols(30).subscribe();
              this.watchlistService.loadSearchHistory().subscribe();
            },
          }),
        );
      }
    } else {
      this.subscriptions.add(
        this.watchlistService.removeFromWatchlist(watchlistId, item.symbol).subscribe({
          next: () => {
            // Reload watchlists after removal
            this.watchlistService.loadWatchlists().subscribe();
            this.watchlistService.loadSearchHistory().subscribe();
          },
        }),
      );
    }

    // Clear selection if removed item was selected
    if (this.selectedSymbol() === item.symbol) {
      this.selectedSymbol.set(null);
      this.selectedItem.set(null);
      this.chartOptions.set(null);
    }
  }

  /**
   * Quick actions menu for a symbol
   * Note: QUOTE removed since price info is displayed at the top of the chart area
   */
  getSymbolActions(): { icon: string; label: string; command: string }[] {
    return [
      { icon: 'show_chart', label: 'Chart', command: 'CHART' },
      { icon: 'table_chart', label: 'History', command: 'HP' },
      { icon: 'info', label: 'Info', command: 'DES' },
    ];
  }

  /**
   * Toggle create watchlist form
   */
  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    if (!this.showCreateForm()) {
      this.newWatchlistName = '';
      this.newWatchlistDescription = '';
    }
  }

  /**
   * Create a new watchlist
   */
  createWatchlist(): void {
    if (!this.newWatchlistName.trim()) return;

    this.subscriptions.add(
      this.watchlistService
        .createWatchlist(this.newWatchlistName.trim(), this.newWatchlistDescription.trim())
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toggleCreateForm();
            }
          },
        }),
    );
  }

  /**
   * Open rename dialog for a watchlist
   */
  openRenameDialog(watchlist: { uuid: string; name: string; description?: string }): void {
    const newName = prompt('Enter new name:', watchlist.name);
    if (newName && newName.trim() && newName.trim() !== watchlist.name) {
      this.subscriptions.add(
        this.watchlistService.renameWatchlist(watchlist.uuid, newName.trim(), watchlist.description).subscribe({
          next: (response) => {
            if (!response.success) {
              console.error('Failed to rename watchlist:', response.message);
            }
          },
        }),
      );
    }
  }

  /**
   * Open duplicate dialog for a watchlist
   */
  openDuplicateDialog(watchlist: { uuid: string; name: string }): void {
    const newName = prompt('Enter name for the copy:', `${watchlist.name} (Copy)`);
    if (newName && newName.trim()) {
      this.subscriptions.add(
        this.watchlistService.duplicateWatchlist(watchlist.uuid, newName.trim()).subscribe({
          next: (response) => {
            if (response.success && response.watchlist) {
              // Optionally switch to the new watchlist
              this.onWatchlistChange(response.watchlist.uuid);
            }
          },
        }),
      );
    }
  }

  /**
   * Delete a watchlist with confirmation
   */
  deleteWatchlist(watchlist: { uuid: string; name: string }): void {
    if (confirm(`Are you sure you want to delete "${watchlist.name}"? This cannot be undone.`)) {
      this.subscriptions.add(
        this.watchlistService.deleteWatchlist(watchlist.uuid).subscribe({
          next: (response) => {
            if (response.success) {
              // Switch to recent if the deleted watchlist was selected
              if (this.selectedWatchlistId() === watchlist.uuid) {
                this.onWatchlistChange('recent');
              }
            }
          },
        }),
      );
    }
  }

  /**
   * Toggle add symbol form
   */
  toggleAddSymbolForm(): void {
    this.showAddSymbolForm.update((v) => !v);
    if (!this.showAddSymbolForm()) {
      this.newSymbolInput = '';
      this.selectedStockListing.set(null);
      this.symbolSearchResults.set([]);
    }
  }

  /**
   * Add a symbol to the current watchlist
   */
  addSymbol(): void {
    const listing = this.selectedStockListing();
    const symbol = listing?.symbol || this.newSymbolInput.trim().toUpperCase();
    if (!symbol) return;

    const watchlistId = this.selectedWatchlistId();
    if (watchlistId === 'recent') {
      // Can't manually add to recent - it's auto-populated
      return;
    }

    // Determine target watchlist ID
    let targetId: string | undefined;
    if (watchlistId !== 'recent') {
      const searchHistory = this.watchlistService.searchHistory();
      if (searchHistory && searchHistory.uuid === watchlistId) {
        targetId = searchHistory.uuid;
      } else {
        targetId = watchlistId;
      }
    }

    // Use info from selected listing if available
    const displayName = listing?.name;
    const assetType = listing?.assetType;
    const exchange = listing?.exchange;

    this.subscriptions.add(
      this.watchlistService.addToWatchlist(symbol, targetId, displayName, assetType, exchange).subscribe({
        next: (response) => {
          if (response.success) {
            this.toggleAddSymbolForm();
            // Reload watchlists
            this.watchlistService.loadWatchlists().subscribe();
            this.watchlistService.loadSearchHistory().subscribe();
          }
        },
      }),
    );
  }

  /**
   * Get icon for asset type
   */
  getAssetIcon(assetType?: string): string {
    switch (assetType?.toUpperCase()) {
      case 'ETF':
        return 'account_balance';
      case 'CRYPTO':
        return 'currency_bitcoin';
      case 'MUTUAL_FUND':
        return 'pie_chart';
      default:
        return 'trending_up';
    }
  }

  /**
   * Get watchlist icon based on type
   */
  getWatchlistIcon(type: string): string {
    switch (type) {
      case 'SEARCH_HISTORY':
        return 'history';
      case 'FAVORITES':
        return 'star';
      case 'PORTFOLIO':
        return 'account_balance_wallet';
      default:
        return 'list';
    }
  }

  /**
   * Handle period change
   */
  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    const symbol = this.selectedSymbol();
    if (symbol) {
      this.loadChartWithOptions(symbol);
    }
  }

  /**
   * Handle interval change
   */
  onIntervalChange(interval: string): void {
    this.selectedInterval.set(interval);
    const symbol = this.selectedSymbol();
    if (symbol) {
      this.loadChartWithOptions(symbol);
    }
  }

  /**
   * Load chart with current interval using ChartDataService for progressive loading
   * Period is no longer used - progressive loading handles historical data on zoom out
   */
  private loadChartWithOptions(symbol: string): void {
    const interval = this.selectedInterval();
    const item = this.selectedItem();
    const exchange = item?.exchange || 'UNKNOWN';

    // Map frontend interval to backend enum format
    const backendInterval = this.mapIntervalToBackend(interval);
    const fqn = `STOCK:${exchange.toUpperCase()}:${symbol.toUpperCase()}`;

    console.debug('[WatchlistTab] Loading chart via ChartDataService:', {
      symbol,
      exchange,
      interval,
      backendInterval,
      fqn,
    });
    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.hasOlderData.set(true); // Reset - assume there's more data

    // Use ChartDataService for progressive loading
    this.subscriptions.add(
      this.chartDataService.loadChartData(symbol, backendInterval, undefined, fqn).subscribe({
        next: (result) => {
          console.log('[WatchlistTab] Received chart data:', result.candles.length, 'candles');
          if (result.candles.length > 0) {
            this.rawCandleData.set(result.candles);
            this.chartPageInfo.set(result.pageInfo);
            this.hasOlderData.set(result.pageInfo.hasOlderData);
            this.buildChartFromCandles(result.candles, symbol);
          } else {
            this.chartError.set('No data available for this symbol and interval');
          }
          this.chartLoading.set(false);
        },
        error: (err) => {
          console.error('[WatchlistTab] Failed to load chart data:', err);
          this.chartError.set('Failed to load chart data');
          this.chartLoading.set(false);
        },
      }),
    );
  }

  /**
   * Map frontend interval names to backend StockPriceInterval enum values
   */
  private mapIntervalToBackend(interval: string): ChartInterval {
    const intervalMap: Record<string, ChartInterval> = {
      '1min': 'MIN_1',
      '5min': 'MIN_5',
      '15min': 'MIN_15',
      '30min': 'MIN_30',
      '60min': 'MIN_60',
      hourly: 'MIN_60',
      daily: 'DAILY',
      weekly: 'WEEKLY',
      monthly: 'MONTHLY',
      MIN_1: 'MIN_1',
      MIN_5: 'MIN_5',
      MIN_15: 'MIN_15',
      MIN_30: 'MIN_30',
      MIN_60: 'MIN_60',
      DAILY: 'DAILY',
      WEEKLY: 'WEEKLY',
      MONTHLY: 'MONTHLY',
    };
    return intervalMap[interval] || 'DAILY';
  }

  /**
   * Build ECharts options from candle data
   */
  private buildChartFromCandles(candles: ChartCandle[], symbol: string): void {
    const dates = candles.map((c) => this.formatDateForChart(c.date));
    const ohlcData = candles.map((c) => [c.open, c.close, c.low, c.high]);

    const interval = this.selectedInterval();
    const options: EChartsOption = {
      title: {
        text: `${symbol} Price Chart`,
        subtext: this.formatInterval(interval),
        left: 'center',
        textStyle: { color: 'var(--md-sys-color-on-surface)' },
        subtextStyle: { color: 'var(--md-sys-color-on-surface-variant)' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => this.formatCandlestickTooltip(params as EChartsTooltipParam[]),
      },
      grid: {
        left: 60,
        right: 60,
        top: 60,
        bottom: 30,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { onZero: false, lineStyle: { color: 'var(--md-sys-color-outline-variant)' } },
        splitLine: { show: false },
        axisLabel: { color: 'var(--md-sys-color-on-surface-variant)' },
      },
      yAxis: {
        type: 'value',
        scale: true,
        position: 'right',
        splitArea: { show: true, areaStyle: { color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)'] } },
        axisLabel: { color: 'var(--md-sys-color-on-surface-variant)' },
        axisLine: { lineStyle: { color: 'var(--md-sys-color-outline-variant)' } },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 70, // Show last 30% of data initially
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
          minValueSpan: 10,
        },
      ],
      series: [
        {
          name: symbol,
          type: 'candlestick',
          data: ohlcData,
          itemStyle: {
            color: '#26a69a', // Green for up
            color0: '#ef5350', // Red for down
            borderColor: '#26a69a',
            borderColor0: '#ef5350',
          },
        },
      ],
    };

    this.chartOptions.set(options);
  }

  /**
   * Format candlestick tooltip
   */
  private formatCandlestickTooltip(params: EChartsTooltipParam[]): string {
    if (!params || params.length === 0) return '';
    const p = params[0];
    const data = p.data as number[];
    if (!data || data.length < 4) return '';

    const [open, close, low, high] = data;
    const isUp = close >= open;
    const color = isUp ? '#26a69a' : '#ef5350';

    return `
      <div style="font-family: monospace; padding: 8px;">
        <div style="margin-bottom: 4px; font-weight: bold;">${p.name}</div>
        <div style="color: ${color};">
          O: ${open.toFixed(2)}<br/>
          H: ${high.toFixed(2)}<br/>
          L: ${low.toFixed(2)}<br/>
          C: ${close.toFixed(2)}
        </div>
      </div>
    `;
  }

  /**
   * Format period for display
   */
  formatPeriod(period: string): string {
    const periodMap: Record<string, string> = {
      '1D': '1 Day',
      '5D': '5 Days',
      '1W': '1 Week',
      '2W': '2 Weeks',
      '1M': '1 Month',
      '3M': '3 Months',
      '6M': '6 Months',
      '1Y': '1 Year',
      '2Y': '2 Years',
      '5Y': '5 Years',
      '10Y': '10 Years',
      '20Y': '20 Years',
      MAX: 'Maximum',
    };
    return periodMap[period] || period;
  }

  /**
   * Format interval for display
   */
  formatInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1min': '1 Minute',
      '5min': '5 Minutes',
      '15min': '15 Minutes',
      '30min': '30 Minutes',
      '60min': '1 Hour',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    };
    return intervalMap[interval] || interval;
  }

  /**
   * Format market cap for display (e.g., $1.2T, $500B, $50M)
   */
  formatMarketCap(marketCap?: number): string {
    if (!marketCap) return '';
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(1)}T`;
    }
    if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    }
    if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(0)}M`;
    }
    return `$${(marketCap / 1e3).toFixed(0)}K`;
  }

  /**
   * Format price for display
   */
  formatPrice(price?: number): string {
    if (price === undefined || price === null) return '';
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format change for display (e.g., +1.23 or -0.45)
   */
  formatChange(change?: number): string {
    if (change === undefined || change === null) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  }

  /**
   * Format change percent for display (e.g., +1.23% or -0.45%)
   */
  formatChangePercent(changePercent?: number): string {
    if (changePercent === undefined || changePercent === null) return '';
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }

  /**
   * Check if quote change is positive
   */
  isPositiveChange(): boolean {
    const quote = this.quoteData();
    return (quote?.change ?? 0) >= 0;
  }

  /**
   * Format date for OHLC display (human-friendly)
   */
  formatCrosshairDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    // Format: "Wed, Jan 15, 2025"
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Format volume for display (e.g., 1.2M, 500K)
   */
  formatVolume(volume?: number): string {
    if (volume === undefined || volume === null) return '';
    if (volume >= 1_000_000_000) {
      return (volume / 1_000_000_000).toFixed(2) + 'B';
    }
    if (volume >= 1_000_000) {
      return (volume / 1_000_000).toFixed(2) + 'M';
    }
    if (volume >= 1_000) {
      return (volume / 1_000).toFixed(1) + 'K';
    }
    return volume.toLocaleString();
  }

  /**
   * Toggle chart display options
   */
  toggleLocalTime(): void {
    this.showLocalTime.update((v) => !v);
    // TODO: Re-render chart with new time zone setting
  }

  toggleExtendedHours(): void {
    this.showExtendedHours.update((v) => !v);
    // TODO: Re-fetch chart data with extended hours
  }

  toggleDividendsReinvested(): void {
    this.showDividendsReinvested.update((v) => !v);
    // TODO: Re-fetch chart data with total return view
  }

  toggleLockToRight(): void {
    this.lockToRight.update((v) => !v);
    // When locking, scroll chart to show most recent data on right
    if (this.lockToRight() && this.chartInstance) {
      this.chartInstance.dispatchAction({
        type: 'dataZoom',
        end: 100, // 100% = most recent data on right
      });
    }
  }

  /**
   * Get a formatted tooltip string for quote data
   */
  getQuoteTooltip(quote: SymbolUpdate): string {
    const lines: string[] = [];

    if (quote.open !== undefined) {
      lines.push(`Open: ${this.formatPrice(quote.open)}`);
    }
    if (quote.high !== undefined) {
      lines.push(`High: ${this.formatPrice(quote.high)}`);
    }
    if (quote.low !== undefined) {
      lines.push(`Low: ${this.formatPrice(quote.low)}`);
    }
    if (quote.volume !== undefined) {
      lines.push(`Volume: ${this.formatVolume(quote.volume)}`);
    }
    if (quote.timestamp) {
      const date = new Date(quote.timestamp);
      lines.push(`As of: ${date.toLocaleString()}`);
    }

    return lines.length > 0 ? lines.join('\n') : 'Quote data';
  }

  /**
   * Get a formatted tooltip string for symbol/company info
   */
  getSymbolInfoTooltip(): string {
    const item = this.selectedItem();
    const quote = this.quoteData();
    const lines: string[] = [];

    const symbol = this.selectedSymbol();
    const companyName = quote?.name || item?.displayName;

    if (symbol) {
      lines.push(symbol);
    }
    if (companyName && companyName !== symbol) {
      lines.push(companyName);
    }
    if (item?.exchange) {
      lines.push(`Exchange: ${item.exchange}`);
    }
    if (item?.sector) {
      lines.push(`Sector: ${item.sector}`);
    }
    if (item?.industry) {
      lines.push(`Industry: ${item.industry}`);
    }
    if (item?.assetType) {
      lines.push(`Type: ${item.assetType}`);
    }
    if (item?.marketCap) {
      lines.push(`Market Cap: ${this.formatMarketCap(item.marketCap)}`);
    }

    lines.push('');
    lines.push('Click "Info" button for full company details');

    return lines.join('\n');
  }

  // ============================================================================
  // Dark Theme for ECharts
  // ============================================================================

  private darkThemeDefaults = {
    backgroundColor: 'transparent',
    animation: true, // Enable animation for initial load
    animationDuration: 500,
    animationDurationUpdate: 0, // Disable animation for updates (zoom, etc.)
    textStyle: {
      color: '#c0c0c0',
    },
    // Tight grid margins to maximize chart area; yAxis on right
    grid: {
      left: 8,
      right: 60, // Space for yAxis labels on right
      top: 16,
      bottom: 32, // Minimal space (no slider, just legend)
      containLabel: false,
      backgroundColor: 'transparent',
    },
    title: {
      show: false, // Hide title - we have our own header
    },
    legend: {
      show: false, // Hide legend - we have our own header with symbol
    },
    tooltip: {
      show: false, // Hide tooltip - we show OHLC at top of chart instead
      trigger: 'axis' as const,
      axisPointer: {
        type: 'cross' as const,
        crossStyle: { color: '#666' },
        lineStyle: { color: '#666' },
      },
    },
    // Configure axis pointer - use 'line' type which is valid for cartesian axes
    axisPointer: {
      show: true,
      type: 'line' as const,
      link: [{ xAxisIndex: 'all' as const }],
      triggerEmit: true,
      label: {
        show: true,
        backgroundColor: '#333',
      },
      lineStyle: {
        color: 'var(--md-sys-color-outline)',
        type: 'dashed' as const,
      },
    },
  };

  // Default yAxis config with position on right
  private darkAxisDefaults = {
    axisLine: { lineStyle: { color: '#505050' } },
    axisLabel: { color: '#a0a0a0' },
    splitLine: { lineStyle: { color: '#353535' } },
    splitArea: {
      show: false,
      areaStyle: { color: ['rgba(35, 35, 35, 0.5)', 'rgba(40, 40, 40, 0.5)'] },
    },
  };

  // yAxis defaults with right position
  private yAxisDefaults = {
    position: 'right' as const,
    axisLine: { lineStyle: { color: '#505050' } },
    axisLabel: { color: '#a0a0a0' },
    splitLine: { lineStyle: { color: '#353535' } },
  };

  // Date formatting for x-axis labels
  private xAxisDateDefaults = {
    axisLabel: {
      color: '#a0a0a0',
      formatter: (value: string | number) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        // Format: "Jan 15" or "Jan 15 '24" for different years
        const now = new Date();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        if (date.getFullYear() !== now.getFullYear()) {
          return `${month} ${day} '${String(date.getFullYear()).slice(-2)}`;
        }
        return `${month} ${day}`;
      },
    },
  };

  /**
   * Apply dark theme to chart options
   */
  private applyDarkTheme(options: EChartsOption): EChartsOption {
    // Safety check: ensure options is an object, not a string
    if (typeof options !== 'object' || options === null) {
      console.error('[WatchlistTab] applyDarkTheme received non-object:', typeof options);
      return this.darkThemeDefaults;
    }
    let merged = this.deepMergeChart(options, this.darkThemeDefaults);
    merged = this.applyAxisTheming(merged);
    merged = this.applyDataZoomConfig(merged);
    return merged;
  }

  /**
   * Configure dataZoom for scroll-to-zoom with right-sticky behavior
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyDataZoomConfig(options: any): any {
    const result = { ...options };

    // Only use inside dataZoom for mouse wheel zoom - no slider
    const insideZoom = {
      type: 'inside',
      xAxisIndex: 0,
      start: 0, // Show all data initially
      end: 100,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      preventDefaultMouseMove: false,
      // Don't limit zoom range - allow zooming past data boundary
      minValueSpan: 10, // Minimum 10 data points when zoomed in
    };

    // Replace all existing dataZoom with just inside zoom
    result.dataZoom = [insideZoom];

    return result;
  }

  /**
   * Apply dark theme to axes (handles arrays)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyAxisTheming(options: any): any {
    const result = { ...options };

    if (result.xAxis) {
      if (Array.isArray(result.xAxis)) {
        result.xAxis = result.xAxis.map((axis: unknown) => {
          let themed = this.deepMergeChart(axis, this.darkAxisDefaults);
          // Apply date formatting if it's a time/category axis
          themed = this.deepMergeChart(themed, this.xAxisDateDefaults);
          return themed;
        });
      } else {
        result.xAxis = this.deepMergeChart(result.xAxis, this.darkAxisDefaults);
        result.xAxis = this.deepMergeChart(result.xAxis, this.xAxisDateDefaults);
      }
    }

    if (result.yAxis) {
      if (Array.isArray(result.yAxis)) {
        // Apply yAxis defaults (including position: right) to all yAxes
        result.yAxis = result.yAxis.map((axis: unknown) => {
          let themed = this.deepMergeChart(axis, this.darkAxisDefaults);
          themed = this.deepMergeChart(themed, this.yAxisDefaults);
          return themed;
        });
      } else {
        result.yAxis = this.deepMergeChart(result.yAxis, this.darkAxisDefaults);
        result.yAxis = this.deepMergeChart(result.yAxis, this.yAxisDefaults);
      }
    }

    return result;
  }

  /**
   * Deep merge for chart options (source overrides target)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deepMergeChart(target: any, source: any): any {
    // Safety: if target is not an object, start with empty object
    if (typeof target !== 'object' || target === null) {
      target = {};
    }
    // Safety: if source is not an object, return target unchanged
    if (typeof source !== 'object' || source === null) {
      return target;
    }
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMergeChart(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Parse chartOptions from the backend - handles string or object, and double-encoded JSON
   */
  private parseChartOptions(chartOptions: unknown): EChartsOption | null {
    console.log('[WatchlistTab] parseChartOptions input type:', typeof chartOptions);

    // If already an object, use it directly
    if (typeof chartOptions === 'object' && chartOptions !== null) {
      // Check if it looks like a valid ECharts option (has expected keys)
      const keys = Object.keys(chartOptions);
      console.log('[WatchlistTab] chartOptions is object, keys:', keys.slice(0, 5));

      // If keys are numeric strings (0, 1, 2...), this is a spread string - parse it
      if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
        console.error('[WatchlistTab] chartOptions looks like a spread string, attempting recovery');
        // This shouldn't happen but if it does, try to recover by joining values
        const chars = keys
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => (chartOptions as Record<string, string>)[k]);
        const reconstructed = chars.join('');
        try {
          const parsed = JSON.parse(reconstructed);
          console.log('[WatchlistTab] Recovered parsed options keys:', Object.keys(parsed).slice(0, 5));
          return parsed as EChartsOption;
        } catch (e) {
          console.error('[WatchlistTab] Failed to recover chartOptions:', e);
          return null;
        }
      }

      return chartOptions as EChartsOption;
    }

    // If it's a string, parse it (may need multiple passes for double-encoded)
    if (typeof chartOptions === 'string') {
      let parsed: unknown = chartOptions;
      let attempts = 0;
      const maxAttempts = 5;

      while (typeof parsed === 'string' && attempts < maxAttempts) {
        try {
          parsed = JSON.parse(parsed);
          attempts++;
          console.log('[WatchlistTab] Parse attempt', attempts, 'result type:', typeof parsed);
        } catch (e) {
          console.error('[WatchlistTab] Failed to parse chartOptions at attempt', attempts, ':', e);
          return null;
        }
      }

      if (typeof parsed === 'object' && parsed !== null) {
        console.log('[WatchlistTab] Successfully parsed chartOptions, keys:', Object.keys(parsed).slice(0, 5));
        return parsed as EChartsOption;
      }

      console.error('[WatchlistTab] chartOptions is not an object after parsing:', typeof parsed);
      return null;
    }

    console.error('[WatchlistTab] chartOptions has unexpected type:', typeof chartOptions);
    return null;
  }
}
