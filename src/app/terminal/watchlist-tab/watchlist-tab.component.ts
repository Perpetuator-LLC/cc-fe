// Copyright (c) 2025 Perpetuator LLC
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
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { marked } from 'marked';
import { WatchlistService, StockListing } from '../watchlist.service';
import { TerminalService } from '../terminal.service';
import { TerminalWebSocketService } from '../terminal-websocket.service';
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
  type: 'sector' | 'industry' | 'exchange';
  value: string;
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
  currentCommand = signal<string>('GP');

  // Chart state
  chartLoading = signal(false);
  chartOptions = signal<EChartsOption | null>(null);
  chartError = signal<string | null>(null);
  // Data content for non-chart commands (HP, DES, QUOTE)
  dataContent = signal<SafeHtml | null>(null);
  // Table data for HP command
  tableData = signal<TableData | null>(null);

  // Quote/price data for selected symbol
  quoteData = signal<SymbolUpdate | null>(null);

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

  // Dynamically loaded sector symbols
  sectorSymbols = signal<SymbolListItem[]>([]);

  // Dynamically loaded industry symbols
  industrySymbols = signal<SymbolListItem[]>([]);

  // Dynamically loaded exchange symbols
  exchangeSymbols = signal<SymbolListItem[]>([]);

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
  sortBy = signal<'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt'>('lastAccessedAt');

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

  // Apply current sort to items
  private applySorting(items: SymbolListItem[]): SymbolListItem[] {
    const sort = this.sortBy();
    switch (sort) {
      case 'marketCap':
        return this.sortByMarketCap(items);
      case 'accessCount':
        return this.sortByAccessCount(items);
      case 'symbol':
        return this.sortBySymbol(items);
      case 'lastAccessedAt':
        return this.sortByLastAccessedAt(items);
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
   * Check if a watchlist ID represents a system category
   */
  isSystemCategory(id: string): boolean {
    return id.startsWith('sector:') || id.startsWith('industry:') || id.startsWith('exchange:');
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
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.subscribeToCommandResults();
    this.subscribeToSymbolUpdates();
    this.setupSymbolSearch();
  }

  ngOnDestroy(): void {
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
    this.subscriptions.add(this.watchlistService.loadRecentSymbols(50, 'lastAccessedAt').subscribe());

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
        if (!result) return;

        // Get symbol from metadata - try multiple access patterns
        const resultSymbol = result.metadata?.symbol as string | undefined;
        const selectedSym = this.selectedSymbol();

        // Extract chartControls from result data if available
        this.extractChartControls(result);

        // Check if this result is for our selected symbol
        const isForSelectedSymbol =
          resultSymbol && selectedSym && resultSymbol.toUpperCase() === selectedSym.toUpperCase();

        if (isForSelectedSymbol || this.chartLoading()) {
          this.chartLoading.set(false);

          if (result.success) {
            if (result.outputType === 'chart' && result.chartOptions) {
              // Chart result
              this.chartOptions.set(result.chartOptions as EChartsOption);
              this.dataContent.set(null);
              this.tableData.set(null);
              this.chartError.set(null);
            } else if (result.outputType === 'data' || result.outputType === 'message') {
              // Data result (HP, DES, QUOTE, etc.)
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
   * Handle sort option change - reload from backend when needed
   */
  onSortChange(sort: 'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt'): void {
    this.sortBy.set(sort);

    // For Recent watchlist, reload from backend with new sort order
    if (this.selectedWatchlistId() === 'recent') {
      this.subscriptions.add(this.watchlistService.loadRecentSymbols(50, sort).subscribe());
    }
    // For system categories, reload with new sort order
    else if (this.selectedWatchlistId().startsWith('sector:')) {
      const sectorName = this.selectedWatchlistId().replace('sector:', '');
      this.loadCategorySectorSymbols(sectorName, sort);
    } else if (this.selectedWatchlistId().startsWith('industry:')) {
      const industryName = this.selectedWatchlistId().replace('industry:', '');
      this.loadCategoryIndustrySymbols(industryName, sort);
    } else if (this.selectedWatchlistId().startsWith('exchange:')) {
      const exchangeName = this.selectedWatchlistId().replace('exchange:', '');
      this.loadCategoryExchangeSymbols(exchangeName, sort);
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
   * Select a symbol and load its chart
   */
  selectSymbol(item: SymbolListItem): void {
    this.selectedSymbol.set(item.symbol);
    this.selectedItem.set(item);
    this.chartError.set(null);
    this.quoteData.set(null); // Clear previous quote data

    // Subscribe to real-time updates for this symbol
    this.terminalService.subscribeSymbols([item.symbol]);

    // Load chart with default command
    this.loadChart(item.symbol, this.currentCommand());
  }

  /**
   * Load chart or data for symbol
   */
  private loadChart(symbol: string, command: string): void {
    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.dataContent.set(null);
    this.tableData.set(null);
    this.currentCommand.set(command);

    // For GP command, include period and interval
    let fullCommand = `${symbol} ${command}`;
    if (command === 'GP') {
      const period = this.selectedPeriod();
      const interval = this.selectedInterval();
      fullCommand = `${symbol} GP -period ${period} -interval ${interval}`;
    }

    this.terminalService.execute(fullCommand);
  }

  /**
   * Run a command for a symbol
   */
  runCommand(symbol: string, command: string): void {
    this.currentCommand.set(command);
    this.loadChart(symbol, command);
  }

  /**
   * Retry loading the chart
   */
  retryChart(): void {
    const symbol = this.selectedSymbol();
    if (symbol) {
      this.loadChart(symbol, this.currentCommand());
    }
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
              this.watchlistService.loadRecentSymbols(20).subscribe();
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
   */
  getSymbolActions(): { icon: string; label: string; command: string }[] {
    return [
      { icon: 'show_chart', label: 'Price Chart', command: 'GP' },
      { icon: 'table_chart', label: 'Historical Prices', command: 'HP' },
      { icon: 'info', label: 'Company Info', command: 'DES' },
      { icon: 'trending_up', label: 'Quote', command: 'QUOTE' },
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
   * Load chart with current period/interval options
   */
  private loadChartWithOptions(symbol: string): void {
    const period = this.selectedPeriod();
    const interval = this.selectedInterval();
    const command = `${symbol} GP -period ${period} -interval ${interval}`;
    console.debug('[WatchlistTab] Loading chart with options:', { symbol, period, interval });
    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.terminalService.execute(command);
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
}
