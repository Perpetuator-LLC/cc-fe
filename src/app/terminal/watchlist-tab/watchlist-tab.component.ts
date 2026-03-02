// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, Subject, debounceTime, distinctUntilChanged, switchMap, filter, take, skip } from 'rxjs';
import { MessageService } from '../../message.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { ChartDataService, ChartCandle, PageInfo, ChartInterval, ChartDataResult } from '../chart-data.service';
import { ChartConfigService } from '../chart-config.service';
import { CommandResult, ChartResultData, ChartControls, TableData, SymbolUpdate } from '../terminal.types';
import { DataTableComponent } from '../data-table/data-table.component';
import { TerminalRoutingService } from '../terminal-routing.service';
import { RouteInfo } from '../terminal-routing.types';
import { JobsWebSocketService } from '../../jobs/jobs-websocket.service';
import { ChartPreferencesService } from '../chart-preferences.service';
import { FundamentalsService, FundamentalsData } from '../fundamentals.service';
import { FundamentalsChartService } from '../fundamentals-chart.service';
import { ValuationService, DCFAnalysisData, DDMAnalysisData } from '../valuation.service';
import { DividendService, DividendAnalysisData } from '../dividend.service';
import { DividendChartService } from '../dividend-chart.service';
import { ValuationChartService } from '../valuation-chart.service';
import { DividendsViewComponent } from '../dividends-view/dividends-view.component';
import { FundamentalsViewComponent } from '../fundamentals-view/fundamentals-view.component';
import { ValuationViewComponent } from '../valuation-view/valuation-view.component';
import { ChartHeaderComponent, ChartSettings } from '../chart-header/chart-header.component';
import {
  CreateWatchlistDialogComponent,
  CreateWatchlistDialogData,
  CreateWatchlistDialogResult,
} from './create-watchlist-dialog/create-watchlist-dialog.component';

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

interface WatchlistColumnOption {
  id: string;
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-watchlist-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatPaginatorModule,
    NgxEchartsDirective,
    DataTableComponent,
    DividendsViewComponent,
    FundamentalsViewComponent,
    ValuationViewComponent,
    ChartHeaderComponent,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './watchlist-tab.component.html',
  styleUrl: './watchlist-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistTabComponent implements OnInit, OnDestroy {
  // Watchlist table columns configuration
  watchlistColumns: WatchlistColumnOption[] = [
    { id: 'symbol', label: 'Symbol', selected: true },
    { id: 'name', label: 'Name', selected: false }, // Hidden by default, shown as tooltip on symbol
    { id: 'exchange', label: 'Exchange', selected: false },
    { id: 'marketCap', label: 'Market Cap', selected: true },
    { id: 'sector', label: 'Sector', selected: false },
    { id: 'industry', label: 'Industry', selected: false },
  ];
  displayedWatchlistColumns: string[] = ['actions', 'symbol', 'marketCap'];

  // Sidebar resize state
  sidebarWidth = signal(280); // Default width in pixels
  isResizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private pendingResizeFrame: number | null = null;

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
  // Technical loading details (shown de-emphasized at bottom of chart area)
  chartLoadingDetails = signal<string | null>(null);
  // Pending job info for loading state with job link
  pendingJobInfo = signal<{ jobId: string; interval: string; symbol: string } | null>(null);
  // Data content for non-chart commands (HP, DES)
  dataContent = signal<SafeHtml | null>(null);
  // Table data for HP command
  tableData = signal<TableData | null>(null);
  // ECharts instance for zoom handling
  private chartInstance: echarts.ECharts | null = null;

  // Throttle state for mousemove handler (using requestAnimationFrame)
  private pendingCrosshairUpdate = false;
  private lastCrosshairDataIndex = -1;
  // Track last mouse position for updating crosshair on zoom
  private lastMousePosition: { offsetX: number; offsetY: number } | null = null;

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

  // Chart display toggles - defaults match ChartPreferencesService.DEFAULT_CHART_PREFERENCES
  showLocalTime = signal(false); // Default: Exchange time (useExchangeTime: true → showLocalTime: false)
  showExtendedHours = signal(false); // Extended trading hours
  showDividendsReinvested = signal(false); // Total return view (dividends reinvested)
  showRawData = signal(false); // Show raw data without anomaly filtering
  showCorporateActions = signal(true); // Show splits/dividends markers on chart (default: true)
  showVolume = signal(true); // Show volume chart below price chart (default: true)
  lockToRight = signal(true); // Lock chart to show most recent data on right edge

  // Fundamentals view state
  showFundamentals = signal(false);
  fundamentalsIsAnnual = signal(true);
  fundamentalsCharts = signal<{
    incomeStatement: EChartsOption;
    balanceSheet: EChartsOption;
    cashFlow: EChartsOption;
    margins: EChartsOption;
    eps: EChartsOption;
    revenue: EChartsOption;
  } | null>(null);
  // Retry counter for fundamentals fetch to prevent infinite loops
  private fundamentalsFetchRetries = 0;
  private static readonly MAX_FUNDAMENTALS_RETRIES = 2;

  // Valuation (DCF) view state
  showValuation = signal(false);
  valuationData = signal<DCFAnalysisData | null>(null);
  valuationHistoricalYears = signal(10); // 5 or 10 years for historical charts
  valuationCharts = signal<{
    fcfProjection: EChartsOption;
    valuationComparison: EChartsOption;
    enterpriseValue: EChartsOption;
    sensitivityHeatmap: EChartsOption;
    historicalFinancials: EChartsOption;
    historicalValuation: EChartsOption | null;
    priceVsValuation: EChartsOption | null;
  } | null>(null);
  valuationDrillDown = signal<'summary' | 'historical' | 'projections' | 'sensitivity' | 'methodology'>('summary');
  selectedValuationModel = signal<'dcf' | 'ddm'>('dcf');
  private valuationFetchRetries = 0;
  private static readonly MAX_VALUATION_RETRIES = 2;

  // DDM (Dividend Discount Model) state
  ddmData = signal<DDMAnalysisData | null>(null);
  ddmCharts = signal<{
    dividendProjection: EChartsOption | null;
    valuation: EChartsOption;
    breakdown: EChartsOption;
  } | null>(null);

  // Dividend view state
  showDividends = signal(false);
  dividendData = signal<DividendAnalysisData | null>(null);
  dividendCharts = signal<{
    payoutRatio: EChartsOption;
    yearlyDividends: EChartsOption;
    cashFlowComparison: EChartsOption;
  } | null>(null);
  showOperatingCashFlow = signal(false); // Toggle for OCF in comparison chart

  // Computed: Check if current interval is intraday (for enabling/disabling certain options)
  isCurrentIntervalIntraday = computed(() => {
    const interval = this.selectedInterval().toLowerCase();
    return (
      interval.includes('min') ||
      interval.includes('hour') ||
      interval === '60min' ||
      interval === 'min_1' ||
      interval === 'min_5' ||
      interval === 'min_15' ||
      interval === 'min_30' ||
      interval === 'min_60'
    );
  });

  // Computed: Check if current interval is daily or longer (for corporate actions)
  isCurrentIntervalDailyOrLonger = computed(() => {
    const interval = this.selectedInterval().toLowerCase();
    return interval === 'daily' || interval === 'weekly' || interval === 'monthly';
  });

  // Computed: Chart settings object for ChartHeaderComponent
  chartSettings = computed<ChartSettings>(() => ({
    showCorporateActions: this.showCorporateActions(),
    showExtendedHours: this.showExtendedHours(),
    useLocalTime: this.showLocalTime(),
    adjustForDividends: this.showDividendsReinvested(),
    showRawData: this.showRawData(),
    showVolume: this.showVolume(),
    lockToRight: this.lockToRight(),
  }));

  // Progressive data loading state
  loadingMoreData = signal(false);
  // Raw candle data for progressive loading (separate from ECharts options)
  rawCandleData = signal<ChartCandle[]>([]);
  // Page info from last data fetch (for cursor pagination)
  chartPageInfo = signal<PageInfo | null>(null);
  // Whether there's more historical data available
  hasOlderData = signal(true);
  // Track if user is at the left edge of the chart (for showing "no more data" hint)
  atLeftEdge = signal(false);
  // Track pending progressive load job - when this completes, we should retry loading
  private pendingProgressiveJobId: string | null = null;
  // Track last cursor used for progressive loading - to detect if backend returns same cursor
  private lastProgressiveCursor: string | null = null;
  // Count retries with same cursor to prevent infinite loops (max 3 retries)
  private sameCursorRetryCount = 0;
  private static readonly MAX_SAME_CURSOR_RETRIES = 3;
  // Flag to prevent re-entrance during zoom correction
  private isCorrectingZoom = false;

  // Computed: show "no more data" hint when at left edge and no more data available
  showNoMoreDataHint = computed(() => this.atLeftEdge() && !this.hasOlderData() && !this.loadingMoreData());

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

  // System watchlist pagination state
  systemWatchlistPageSize = 20;
  systemWatchlistPageIndex = signal(0);
  systemWatchlistTotalCount = signal(0);
  systemWatchlistCursor = signal<string | null>(null);
  systemWatchlistHasNextPage = signal(false);
  systemWatchlistHasPrevPage = signal(false);
  // Store cursors for each page to support going back
  private systemWatchlistCursors: (string | null)[] = [null];

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

  // Selection mode for multi-select and export
  selectionMode = signal(false);
  selectedSymbols = signal<Set<string>>(new Set());

  private subscriptions = new Subscription();

  // Sort options for the symbol list - null means use default sort for the watchlist type
  sortBy = signal<'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt' | null>(null);
  sortDirection = signal<'desc' | 'asc' | null>(null);

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
    // For desc: largest/newest first (natural for these fields)
    // For asc: smallest/oldest first (reversed)
    const isDesc = direction === 'desc';

    switch (sort) {
      case 'marketCap':
        return sorted.sort((a, b) => {
          const aVal = a.marketCap;
          const bVal = b.marketCap;
          // Null/undefined values go to the bottom regardless of sort direction
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          return isDesc ? bVal - aVal : aVal - bVal;
        });
      case 'accessCount':
        return sorted.sort((a, b) => {
          const aVal = a.accessCount;
          const bVal = b.accessCount;
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          return isDesc ? bVal - aVal : aVal - bVal;
        });
      case 'symbol':
        return sorted.sort((a, b) => {
          const cmp = a.symbol.localeCompare(b.symbol);
          return isDesc ? -cmp : cmp;
        });
      case 'lastAccessedAt':
        return sorted.sort((a, b) => {
          const aDate = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
          const bDate = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
          if (aDate === 0 && bDate === 0) return 0;
          if (aDate === 0) return 1;
          if (bDate === 0) return -1;
          return isDesc ? bDate - aDate : aDate - bDate;
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

    // Apply sorting - read both signals to trigger recomputation when either changes
    const sortField = this.sortBy();
    const sortDir = this.sortDirection();

    // For system categories (sector/industry/exchange/assetType), the server
    // already returns data sorted correctly. Don't sort in frontend.
    // Just return items as-is - they're already sorted by the server.
    if (this.isSystemCategory(watchlistId)) {
      return items;
    }

    // For Recent and custom watchlists, apply local sorting
    // If explicit sort is set, use applySorting
    if (sortField && sortDir) {
      return this.applySorting(items);
    }

    // Apply default sorts when no explicit sort is set
    // For Recent and custom watchlists: default sort by lastAccessedAt desc (most recent first)
    if (watchlistId === 'recent' || this.isCustomWatchlist(watchlistId)) {
      return [...items].sort((a, b) => {
        const aDate = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
        const bDate = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
        return bDate - aDate; // Most recent first (descending)
      });
    }

    // Fallback - return items as-is
    return items;
  });

  /**
   * Check if watchlist is a custom user watchlist (not recent, not system category)
   */
  private isCustomWatchlist(watchlistId: string): boolean {
    return watchlistId !== 'recent' && !this.isSystemCategory(watchlistId);
  }

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
    // Can't remove from system categories (sectors, industries, exchanges, asset types)
    return !this.isSystemCategory(id);
  }

  /**
   * Check if watchlist is a system category (read-only, not user-editable)
   */
  isSystemCategory(id: string): boolean {
    return (
      id.startsWith('sector:') ||
      id.startsWith('industry:') ||
      id.startsWith('exchange:') ||
      id.startsWith('assetType:')
    );
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
    if (id.startsWith('assetType:')) {
      // Find the display name from assetTypeLists
      const assetType = this.assetTypeLists().find((a) => a.id === id);
      return assetType?.name || id.replace('assetType:', '');
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
    if (id.startsWith('assetType:')) {
      // Find the icon from assetTypeLists
      const assetType = this.assetTypeLists().find((a) => a.id === id);
      return assetType?.icon || 'category';
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

  // Dependency injection via inject()
  protected readonly watchlistService = inject(WatchlistService);
  protected readonly terminalService = inject(TerminalService);
  private readonly terminalWsService = inject(TerminalWebSocketService);
  private readonly chartDataService = inject(ChartDataService);
  private readonly chartConfigService = inject(ChartConfigService);
  private readonly routingService = inject(TerminalRoutingService);
  private readonly jobsWsService = inject(JobsWebSocketService);
  private readonly chartPreferencesService = inject(ChartPreferencesService);
  private readonly fundamentalsService = inject(FundamentalsService);
  private readonly fundamentalsChartService = inject(FundamentalsChartService);
  private readonly valuationService = inject(ValuationService);
  private readonly valuationChartService = inject(ValuationChartService);
  private readonly dividendService = inject(DividendService);
  protected readonly dividendChartService = inject(DividendChartService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadChartPreferences();
    this.loadData();
    this.subscribeToCommandResults();
    this.subscribeToSymbolUpdates();
    this.subscribeToProgressiveJobEvents();
    this.setupSymbolSearch();
    this.restoreStateFromUrl();
    this.subscribeToRouteChanges();
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

  // ============================================================================
  // URL-Based Navigation
  // ============================================================================

  /**
   * Restore chart state from URL query parameters on initial load.
   * This allows deep linking and page refresh to restore the chart.
   */
  private restoreStateFromUrl(): void {
    const state = this.routingService.state();
    if (state.symbol) {
      console.log('[WatchlistTab] Restoring state from URL:', state);
      // Set the interval from URL before loading chart
      if (state.interval) {
        this.selectedInterval.set(state.interval);
      }
      // Determine command based on view parameter
      let command = 'CHART';
      if (state.view === 'financials') {
        command = 'FINANCIALS';
        // Set financials period from params if specified
        const period = state.params?.['period'];
        if (period === 'quarterly') {
          this.fundamentalsIsAnnual.set(false);
        } else {
          this.fundamentalsIsAnnual.set(true); // Default to annual
        }
      } else if (state.view === 'valuation') {
        command = 'DCF';
      } else if (state.view === 'info') {
        command = 'DES';
      } else if (state.view === 'history') {
        command = 'HP';
      }
      // Load the view for the symbol from URL
      this.loadChart(state.symbol, state.exchange || undefined, command);
    }
  }

  /**
   * Subscribe to route query parameter changes for browser back/forward navigation.
   * Skip the first emission (initial state already handled by restoreStateFromUrl).
   */
  private subscribeToRouteChanges(): void {
    this.subscriptions.add(
      this.route.queryParams
        .pipe(
          skip(1), // Skip initial emission - handled by restoreStateFromUrl
        )
        .subscribe((params) => {
          const symbol = params['symbol'];
          const exchange = params['exchange'];
          const interval = params['interval'];
          const view = params['view'];

          if (symbol) {
            const currentSymbol = this.selectedSymbol();
            const currentInterval = this.selectedInterval();
            const currentCommand = this.currentCommand();

            // Determine command from view
            let command = 'CHART';
            if (view === 'financials') {
              command = 'FINANCIALS';
              // Handle financials period from period query param
              const period = params['period'];
              if (period === 'quarterly') {
                this.fundamentalsIsAnnual.set(false);
              } else if (period === 'annual') {
                this.fundamentalsIsAnnual.set(true);
              }
            } else if (view === 'valuation') {
              command = 'DCF';
            } else if (view === 'dividends') {
              command = 'DIVIDENDS';
            } else if (view === 'info') {
              command = 'DES';
            } else if (view === 'history') {
              command = 'HP';
            }

            // Only reload if something changed (case-insensitive symbol comparison)
            const viewChanged = command !== currentCommand;
            const symbolChanged = symbol?.toUpperCase() !== currentSymbol?.toUpperCase();
            const intervalChanged =
              command !== 'FINANCIALS' &&
              command !== 'FUNDAMENTALS' &&
              command !== 'DCF' &&
              interval?.toLowerCase() !== currentInterval?.toLowerCase();

            if (symbolChanged || intervalChanged || viewChanged) {
              console.log('[WatchlistTab] Route changed, reloading:', {
                symbol,
                exchange,
                interval,
                view,
                command,
              });
              // Update interval if provided and not financials view (case-insensitive)
              const intervalMismatch = interval && interval.toLowerCase() !== currentInterval?.toLowerCase();
              if (command !== 'FINANCIALS' && command !== 'FUNDAMENTALS' && intervalMismatch) {
                this.selectedInterval.set(interval);
              }
              // Update routing service state without updating URL (to avoid loop)
              this.routingService.applyRoute(
                {
                  symbol,
                  exchange,
                  interval: interval as RouteInfo['interval'],
                  view: view as RouteInfo['view'],
                },
                { updateUrl: false, silent: true },
              );
              // Load the view
              this.loadChart(symbol, exchange, command);
            }
          }
        }),
    );
  }

  // ============================================================================
  // Chart Settings Persistence
  // ============================================================================

  /**
   * Load chart preferences from backend via ChartPreferencesService.
   * Falls back to localStorage if backend fails.
   */
  private loadChartPreferences(): void {
    // Apply immediately from service's cached state (loaded from localStorage on service init)
    const cachedPrefs = this.chartPreferencesService.preferences();
    this.applyChartPreferences(cachedPrefs);
    console.log('[WatchlistTab] Applied cached chart preferences:', cachedPrefs);

    // Then load from backend (will update if different)
    this.subscriptions.add(
      this.chartPreferencesService.loadPreferences().subscribe((prefs) => {
        this.applyChartPreferences(prefs);
        console.log('[WatchlistTab] Loaded chart preferences from backend:', prefs);
      }),
    );
  }

  /**
   * Apply chart preferences to component signals
   */
  private applyChartPreferences(prefs: import('../chart-preferences.service').ChartPreferences): void {
    // Note: useExchangeTime is inverted from showLocalTime
    this.showLocalTime.set(!prefs.useExchangeTime);
    this.chartConfigService.useLocalTime.set(!prefs.useExchangeTime);
    this.showExtendedHours.set(prefs.showExtendedHours);
    this.showDividendsReinvested.set(prefs.adjustForDividends);
    this.showRawData.set(prefs.showRawData);
    this.showCorporateActions.set(prefs.showCorporateActions);
    this.lockToRight.set(prefs.lockToRight);
  }

  /**
   * Save a chart preference to backend and localStorage.
   * Used by toggle methods.
   */
  private saveChartPreference<K extends keyof import('../chart-preferences.service').ChartPreferences>(
    key: K,
    value: import('../chart-preferences.service').ChartPreferences[K],
  ): void {
    this.subscriptions.add(this.chartPreferencesService.updatePreference(key, value).subscribe());
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
    // Clear search results to close the autocomplete dropdown
    this.symbolSearchResults.set([]);
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

    // Load search history (needed for removing symbols from recent)
    this.subscriptions.add(this.watchlistService.loadSearchHistory().subscribe());

    // Load GICS sectors from backend
    this.subscriptions.add(this.watchlistService.loadGicsSectors().subscribe());

    // Load GICS industries from backend
    this.subscriptions.add(this.watchlistService.loadGicsIndustries().subscribe());

    // Load exchanges from backend
    this.subscriptions.add(this.watchlistService.loadExchanges().subscribe());
  }

  /**
   * Subscribe to job events to track background data fetches during progressive loading.
   * When a job completes, we retry loading older data to get the newly fetched data.
   */
  private subscribeToProgressiveJobEvents(): void {
    // Track job created events - these occur when backend needs to fetch more data
    this.subscriptions.add(
      this.terminalWsService.onJobCreated.subscribe((job) => {
        // Store the job ID so we can detect when it completes
        if (job?.uuid && job.kind === 'fetch_stock_prices') {
          console.log('[WatchlistTab] Progressive job created:', job.uuid);
          this.pendingProgressiveJobId = job.uuid;
          // Set job info for display
          this.pendingJobInfo.set({
            jobId: job.uuid,
            interval: this.selectedInterval(),
            symbol: this.selectedSymbol() || '',
          });
        }
      }),
    );

    // When a progressive job completes, retry loading to get new data
    this.subscriptions.add(
      this.terminalWsService.onJobCompleted.subscribe((job) => {
        if (job?.uuid && job.uuid === this.pendingProgressiveJobId) {
          console.log('[WatchlistTab] Progressive job completed, triggering retry:', job.uuid);
          this.pendingProgressiveJobId = null;
          this.pendingJobInfo.set(null);
          // Retry progressive loading after a short delay to let DB commit
          setTimeout(() => {
            if (this.hasOlderData() && !this.loadingMoreData()) {
              this.loadOlderChartData();
            }
          }, 500);
        }
      }),
    );

    // Clear pending job on failure
    this.subscriptions.add(
      this.terminalWsService.onJobFailed.subscribe((job) => {
        if (job?.uuid && job.uuid === this.pendingProgressiveJobId) {
          console.log('[WatchlistTab] Progressive job failed:', job.uuid);
          this.pendingProgressiveJobId = null;
          this.pendingJobInfo.set(null);
        }
      }),
    );
  }

  /**
   * Subscribe to command results from terminal to update chart or data display
   */
  private subscribeToCommandResults(): void {
    this.subscriptions.add(
      this.terminalWsService.onCommandResult.subscribe((result: CommandResult) => {
        console.log('[WatchlistTab] onCommandResult received:', result);
        console.log('[WatchlistTab] result.route:', result?.route);
        console.log('[WatchlistTab] result.outputType:', result?.outputType);
        console.log('[WatchlistTab] result.success:', result?.success);

        if (!result) return;

        // Get symbol from route (preferred) or metadata (fallback)
        const route = result.route;
        const resultSymbol = route?.symbol || (result.metadata?.symbol as string | undefined);
        const selectedSym = this.selectedSymbol();

        // Check if this result is for our selected symbol
        const isForSelectedSymbol = !!(
          resultSymbol &&
          selectedSym &&
          resultSymbol.toUpperCase() === selectedSym.toUpperCase()
        );

        // Extract chartControls from result data if available
        // Preserve the user's interval selection if this is a reload for the same symbol
        // (e.g., after job completion), not a fresh command
        const preserveInterval: boolean = isForSelectedSymbol && !this.chartLoading();
        this.extractChartControls(result, preserveInterval);

        // Also accept results if we're loading or if this is a symbol command that should update the display
        const shouldHandleResult = isForSelectedSymbol || this.chartLoading() || (resultSymbol && result.success);

        console.log('[WatchlistTab] Decision logic:', {
          resultSymbol,
          selectedSym,
          isForSelectedSymbol,
          hasRoute: !!route,
          chartLoading: this.chartLoading(),
          shouldHandleResult,
        });

        // Refresh recent symbols list if viewing "recent" watchlist and a symbol was accessed
        // This ensures the accessed symbol moves to the top of the list
        if (result.success && resultSymbol && this.selectedWatchlistId() === 'recent') {
          // Use current sort or default to lastAccessedAt
          const sortField = this.sortBy() || 'lastAccessedAt';
          this.watchlistService.loadRecentSymbols(30, sortField).subscribe();
        }

        if (shouldHandleResult) {
          // CRITICAL: Always update the selected symbol if the result has one
          // This ensures all parent components stay in sync with the command
          if (resultSymbol) {
            const newSymbol = resultSymbol.toUpperCase();
            const isDifferentSymbol = selectedSym && newSymbol !== selectedSym.toUpperCase();

            if (isDifferentSymbol || !selectedSym) {
              console.log('[WatchlistTab] Switching symbol from', selectedSym, 'to', newSymbol);

              // Unsubscribe from previous symbol's real-time updates
              if (selectedSym) {
                this.terminalService.unsubscribeSymbols([selectedSym]);
              }

              // Update the selected symbol - this is the source of truth
              this.selectedSymbol.set(newSymbol);

              // Clear stale data from previous symbol
              this.rawCandleData.set([]);
              this.quoteData.set(null);
              this.chartPageInfo.set(null);
              this.selectedItem.set(null); // Clear selected item to avoid stale company name

              // Subscribe to real-time updates for new symbol
              this.terminalService.subscribeSymbols([newSymbol]);

              // Fetch quote data for new symbol
              this.fetchQuoteForSymbol(newSymbol);
            }

            // ALWAYS update routing on successful command result (for URL sync)
            // This ensures clicking on watchlist items updates the URL too
            if (route) {
              this.routingService.applyRoute(route as RouteInfo);

              // Handle view switching based on route
              if (route.view === 'financials') {
                console.log('[WatchlistTab] Route specifies financials view, loading financials');
                this.currentCommand.set('FINANCIALS');
                this.loadFundamentalsView(newSymbol);
                return; // Early return - financials view handles its own rendering
              } else if (route.view === 'valuation') {
                console.log('[WatchlistTab] Route specifies valuation view, loading DCF');
                this.currentCommand.set('DCF');
                this.loadValuationView(newSymbol);
                return; // Early return - valuation view handles its own rendering
              } else if (route.view === 'info') {
                this.currentCommand.set('DES');
              } else if (route.view === 'history') {
                this.currentCommand.set('HP');
              } else {
                this.currentCommand.set('CHART');
              }
            } else {
              // No route from backend, build from metadata
              this.routingService.applyRoute({
                symbol: newSymbol,
                exchange: result.metadata?.['exchange'] as string | undefined,
                interval: result.metadata?.['interval'] as RouteInfo['interval'],
              });
            }
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
              // Parse chartOptions using ChartConfigService (handles string/object/double-encoded)
              const parsedOptions = this.chartConfigService.parseChartOptions(result.chartOptions);
              if (!parsedOptions) {
                this.chartError.set('Failed to parse chart data');
                return;
              }

              // Extract and store raw candle data for progressive loading
              this.extractAndStoreCandleData(result);

              // Build chart using local preferences (showCorporateActions, lockToRight, etc.)
              // instead of using backend's chartOptions directly
              const candles = this.rawCandleData();
              const chartSymbol = resultSymbol || this.selectedSymbol();

              if (candles.length > 0 && chartSymbol) {
                // Use buildChartFromCandles to apply user's chart preferences
                this.buildChartFromCandles(candles, chartSymbol);
              } else {
                // Fallback: Use backend's themed options if no candle data extracted
                const themedOptions = this.chartConfigService.applyDarkTheme(parsedOptions);
                console.log('[WatchlistTab] Themed chartOptions keys:', Object.keys(themedOptions).slice(0, 8));
                this.chartOptions.set(themedOptions);
              }

              this.dataContent.set(null);
              this.tableData.set(null);
              this.chartError.set(null);

              // Reset progressive loading state for new chart
              this.hasOlderData.set(true);
              this.sameCursorRetryCount = 0;
              this.lastProgressiveCursor = null;
              this.pendingProgressiveJobId = null;
              // Don't set chartPageInfo to null - fetch it from GraphQL for cursor-based pagination
              this.fetchChartPageInfo(chartSymbol);

              // Always refresh quote when chart loads - ensures quote data is up-to-date
              if (chartSymbol) {
                console.log('[WatchlistTab] Chart loaded, refreshing quote for:', chartSymbol);
                this.fetchQuoteForSymbol(chartSymbol);
              }
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
              // Chart command succeeded but no chartOptions - this means data is being fetched
              // Do NOT call loadChartWithOptions here - it would create an infinite loop!
              // The triggerDataFetchAndPoll mechanism handles polling for data.
              // Just show a loading message to the user.
              console.log('[WatchlistTab] Chart result without options - data fetch in progress');
              // Only show message if we're not already loading (to avoid overwriting poll messages)
              if (!this.chartLoading()) {
                this.chartError.set('Chart data is being loaded...');
              }
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
   * Extract chartControls from result and update available options.
   * @param result The command result
   * @param preserveInterval If true, don't overwrite the user's selected interval
   */
  private extractChartControls(result: CommandResult, preserveInterval = false): void {
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
      // Only update interval if not preserving user's selection
      if (controls.currentInterval && !preserveInterval) {
        // Set the interval, then sync with available options to ensure it matches
        this.selectedInterval.set(controls.currentInterval);
        this.syncSelectedIntervalWithOptions(controls.currentInterval);
      } else if (controls.currentInterval && preserveInterval) {
        // Still sync with options to ensure it's valid, but keep user's selection
        this.syncSelectedIntervalWithOptions(this.selectedInterval());
      }
    }
  }

  /**
   * Get the icon to display for a sort button, showing direction indicator when active
   */
  getSortIcon(sort: string, baseIcon: string): string {
    if (this.sortBy() === sort) {
      // Active sort - show direction indicator
      return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }
    return baseIcon;
  }

  /**
   * Get tooltip for the sort menu button
   */
  getSortMenuTooltip(): string {
    const sort = this.sortBy();
    const direction = this.sortDirection();
    if (sort === 'lastAccessedAt') {
      return `Sorted by Most Recent (${direction === 'asc' ? 'oldest first' : 'newest first'})`;
    }
    if (sort === 'accessCount') {
      return `Sorted by Most Viewed (${direction === 'asc' ? 'least viewed' : 'most viewed'})`;
    }
    return 'Sort Options';
  }

  /**
   * Get icon for the sort menu button
   */
  getSortMenuIcon(): string {
    const sort = this.sortBy();
    if (sort === 'lastAccessedAt') {
      return 'schedule';
    }
    if (sort === 'accessCount') {
      return 'trending_up';
    }
    return 'sort';
  }

  /**
   * Get tooltip for the combined column/sort menu button
   */
  getColumnMenuTooltip(): string {
    const sort = this.sortBy();
    const direction = this.sortDirection();
    if (sort === 'lastAccessedAt') {
      return `Columns & Sort (${direction === 'asc' ? 'oldest first' : 'newest first'})`;
    }
    if (sort === 'accessCount') {
      return `Columns & Sort (${direction === 'asc' ? 'least viewed' : 'most viewed'})`;
    }
    return 'Columns & Sort';
  }

  /**
   * Get icon for the combined column/sort menu button
   */
  getColumnMenuIcon(): string {
    const sort = this.sortBy();
    if (sort === 'lastAccessedAt') {
      return 'schedule';
    }
    if (sort === 'accessCount') {
      return 'trending_up';
    }
    return 'tune';
  }

  /**
   * Get the active sort column for MatSort binding.
   * Returns the column ID that should show the sort indicator.
   */
  getDefaultSortActive(): string {
    const sortField = this.sortBy();
    const watchlistId = this.selectedWatchlistId();

    // If explicit sort is set and it's a visible column, return it
    if (sortField === 'marketCap' || sortField === 'symbol') {
      return sortField;
    }

    // For system categories (sector/industry/exchange), default to marketCap
    if (this.isSystemCategory(watchlistId)) {
      return 'marketCap';
    }

    // For recent and custom watchlists, no column header sort (they use special sorts)
    return '';
  }

  /**
   * Get the sort direction for MatSort binding.
   */
  getDefaultSortDirection(): 'asc' | 'desc' | '' {
    const sortDir = this.sortDirection();
    const sortField = this.sortBy();
    const watchlistId = this.selectedWatchlistId();

    // If explicit sort is set with direction, return it
    if (sortDir && (sortField === 'marketCap' || sortField === 'symbol')) {
      return sortDir;
    }

    // For system categories, default to desc (largest first)
    if (this.isSystemCategory(watchlistId)) {
      return 'desc';
    }

    return '';
  }

  /**
   * Apply a special sort (lastAccessedAt or accessCount) that doesn't have a visible column
   * Implements tri-state cycling: first click = desc, second = asc, third = clear
   */
  applySpecialSort(sort: 'lastAccessedAt' | 'accessCount'): void {
    const currentSort = this.sortBy();
    const currentDirection = this.sortDirection();

    if (currentSort === sort) {
      // Same sort clicked - cycle through desc → asc → off
      if (currentDirection === 'desc') {
        this.sortDirection.set('asc');
      } else if (currentDirection === 'asc') {
        this.sortBy.set(null);
        this.sortDirection.set(null);
      } else {
        // Was null, start with desc (most recent/most viewed first)
        this.sortDirection.set('desc');
      }
    } else {
      // Different sort clicked - start with desc (most recent/most viewed first)
      this.sortBy.set(sort);
      this.sortDirection.set('desc');
    }

    this.reloadSortedData();
  }

  /**
   * Clear the special sort (lastAccessedAt or accessCount)
   */
  clearSpecialSort(): void {
    this.sortBy.set(null);
    this.sortDirection.set(null);
    this.reloadSortedData();
  }

  /**
   * Handle MatSort table header sort change
   * Maps column names to sort field names and handles direction
   */
  onTableSortChange(sort: Sort): void {
    // Map column IDs to sort field names
    const columnToSortField: Record<string, 'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt' | null> = {
      symbol: 'symbol',
      name: 'symbol', // Sort by symbol when sorting by name
      marketCap: 'marketCap',
      exchange: null, // Not sortable
      sector: null, // Not sortable
      industry: null, // Not sortable
    };

    const sortField = columnToSortField[sort.active];

    if (!sort.direction || !sortField) {
      // Sort cleared
      this.sortBy.set(null);
      this.sortDirection.set(null);
    } else {
      this.sortBy.set(sortField);
      this.sortDirection.set(sort.direction as 'asc' | 'desc');
    }

    // Trigger data reload for system watchlists
    this.reloadSortedData();
  }

  /**
   * Reload data with current sort settings for system watchlists.
   * For system categories, we reload from backend to get properly sorted data
   * across the entire dataset (not just what's currently loaded).
   */
  private reloadSortedData(): void {
    const effectiveSort = this.sortBy();
    const effectiveDirection = this.sortDirection();
    const watchlistId = this.selectedWatchlistId();

    // CRITICAL: Reset pagination when sort changes
    // Sort must happen on server BEFORE pagination, so we need to start from page 1
    this.systemWatchlistPageIndex.set(0);
    this.systemWatchlistCursor.set(null);
    this.systemWatchlistCursors = [null];

    // Default sort field and direction for system categories
    const sortField = effectiveSort || 'marketCap';
    const sortDir = effectiveDirection || 'desc';

    if (watchlistId === 'recent') {
      // For Recent, use lastAccessedAt as default when no explicit sort
      const sortToUse = effectiveSort || 'lastAccessedAt';
      this.subscriptions.add(this.watchlistService.loadRecentSymbols(30, sortToUse).subscribe());
    } else if (watchlistId.startsWith('sector:')) {
      const sectorName = watchlistId.replace('sector:', '');
      this.loadCategorySectorSymbols(sectorName, sortField, sortDir);
    } else if (watchlistId.startsWith('industry:')) {
      const industryName = watchlistId.replace('industry:', '');
      this.loadCategoryIndustrySymbols(industryName, sortField, sortDir);
    } else if (watchlistId.startsWith('exchange:')) {
      const exchangeName = watchlistId.replace('exchange:', '');
      this.loadCategoryExchangeSymbols(exchangeName, sortField, sortDir);
    }
    // For custom watchlists, local sorting is already applied via computed
  }

  /**
   * Handle sort option change - implements tri-state cycling: asc → desc → off
   * @deprecated Use onTableSortChange for table header sorting
   */
  onSortChange(sort: 'marketCap' | 'symbol' | 'accessCount' | 'lastAccessedAt'): void {
    const currentSort = this.sortBy();
    const currentDirection = this.sortDirection();

    if (currentSort === sort) {
      // Same sort clicked - cycle through asc → desc → off
      if (currentDirection === 'asc') {
        this.sortDirection.set('desc');
      } else if (currentDirection === 'desc') {
        this.sortBy.set(null);
        this.sortDirection.set(null);
      } else {
        // Was null, start with asc
        this.sortDirection.set('asc');
      }
    } else {
      // Different sort clicked - start with asc
      this.sortBy.set(sort);
      this.sortDirection.set('asc');
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

    // Reset pagination state for system watchlists
    this.systemWatchlistPageIndex.set(0);
    this.systemWatchlistTotalCount.set(0);
    this.systemWatchlistCursor.set(null);
    this.systemWatchlistCursors = [null];
    this.systemWatchlistHasNextPage.set(false);
    this.systemWatchlistHasPrevPage.set(false);

    // Set default sort based on watchlist type
    if (newValue === 'recent') {
      // Recent watchlist: sort by most recently accessed by default
      // This is a "special" sort not shown in column headers
      this.sortBy.set(null);
      this.sortDirection.set(null);
    } else if (newValue.startsWith('sector:')) {
      // Sector lists: sort by market cap desc by default
      this.sortBy.set('marketCap');
      this.sortDirection.set('desc');
      const sectorName = newValue.replace('sector:', '');
      this.loadCategorySectorSymbols(sectorName, 'marketCap', 'desc');
    } else if (newValue.startsWith('industry:')) {
      // Industry lists: sort by market cap desc by default
      this.sortBy.set('marketCap');
      this.sortDirection.set('desc');
      const industryName = newValue.replace('industry:', '');
      this.loadCategoryIndustrySymbols(industryName, 'marketCap', 'desc');
    } else if (newValue.startsWith('exchange:')) {
      // Exchange lists: sort by market cap desc by default
      this.sortBy.set('marketCap');
      this.sortDirection.set('desc');
      const exchangeName = newValue.replace('exchange:', '');
      this.loadCategoryExchangeSymbols(exchangeName, 'marketCap', 'desc');
    } else if (newValue.startsWith('assetType:')) {
      // Asset type lists: sort by market cap desc by default
      this.sortBy.set('marketCap');
      this.sortDirection.set('desc');
      const assetTypeName = newValue.replace('assetType:', '');
      this.loadCategoryAssetTypeSymbols(assetTypeName);
    } else {
      // Custom watchlists: default to lastAccessedAt (most recent first)
      this.sortBy.set(null);
      this.sortDirection.set(null);
    }
  }

  /**
   * Load symbols for a specific sector from system catalog with pagination
   */
  private loadCategorySectorSymbols(
    sector: string,
    orderBy = 'marketCap',
    orderDirection = 'desc',
    cursor: string | null = null,
  ): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService
        .loadCatalogSectorSymbols(sector, this.systemWatchlistPageSize, cursor, orderBy, orderDirection)
        .subscribe({
          next: (connection) => {
            this.sectorSymbols.set(
              connection.edges.map((edge) => ({
                symbol: edge.node.symbol,
                displayName: edge.node.displayName,
                assetType: edge.node.assetType,
                exchange: edge.node.exchange,
                sector: edge.node.sector,
                industry: edge.node.industry,
                marketCap: edge.node.marketCap,
              })),
            );
            this.systemWatchlistTotalCount.set(connection.totalCount);
            this.systemWatchlistHasNextPage.set(connection.pageInfo.hasNextPage);
            this.systemWatchlistHasPrevPage.set(connection.pageInfo.hasPreviousPage);
            this.systemWatchlistCursor.set(connection.pageInfo.endCursor);
            this.loading.set(false);
          },
          error: () => {
            this.sectorSymbols.set([]);
            this.systemWatchlistTotalCount.set(0);
            this.loading.set(false);
          },
        }),
    );
  }

  /**
   * Load symbols for a specific industry from system catalog with pagination
   */
  private loadCategoryIndustrySymbols(
    industry: string,
    orderBy = 'marketCap',
    orderDirection = 'desc',
    cursor: string | null = null,
  ): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService
        .loadCatalogIndustrySymbols(industry, this.systemWatchlistPageSize, cursor, orderBy, orderDirection)
        .subscribe({
          next: (connection) => {
            this.industrySymbols.set(
              connection.edges.map((edge) => ({
                symbol: edge.node.symbol,
                displayName: edge.node.displayName,
                assetType: edge.node.assetType,
                exchange: edge.node.exchange,
                sector: edge.node.sector,
                industry: edge.node.industry,
                marketCap: edge.node.marketCap,
              })),
            );
            this.systemWatchlistTotalCount.set(connection.totalCount);
            this.systemWatchlistHasNextPage.set(connection.pageInfo.hasNextPage);
            this.systemWatchlistHasPrevPage.set(connection.pageInfo.hasPreviousPage);
            this.systemWatchlistCursor.set(connection.pageInfo.endCursor);
            this.loading.set(false);
          },
          error: () => {
            this.industrySymbols.set([]);
            this.systemWatchlistTotalCount.set(0);
            this.loading.set(false);
          },
        }),
    );
  }

  /**
   * Load symbols for a specific exchange from system catalog with pagination
   */
  private loadCategoryExchangeSymbols(
    exchange: string,
    orderBy = 'marketCap',
    orderDirection = 'desc',
    cursor: string | null = null,
  ): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.watchlistService
        .loadCatalogExchangeSymbols(exchange, this.systemWatchlistPageSize, cursor, orderBy, orderDirection)
        .subscribe({
          next: (connection) => {
            this.exchangeSymbols.set(
              connection.edges.map((edge) => ({
                symbol: edge.node.symbol,
                displayName: edge.node.displayName,
                assetType: edge.node.assetType,
                exchange: edge.node.exchange,
                sector: edge.node.sector,
                industry: edge.node.industry,
                marketCap: edge.node.marketCap,
              })),
            );
            this.systemWatchlistTotalCount.set(connection.totalCount);
            this.systemWatchlistHasNextPage.set(connection.pageInfo.hasNextPage);
            this.systemWatchlistHasPrevPage.set(connection.pageInfo.hasPreviousPage);
            this.systemWatchlistCursor.set(connection.pageInfo.endCursor);
            this.loading.set(false);
          },
          error: () => {
            this.exchangeSymbols.set([]);
            this.systemWatchlistTotalCount.set(0);
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
   * Handle pagination page change for system watchlists
   */
  onSystemWatchlistPageChange(event: PageEvent): void {
    const newPageIndex = event.pageIndex;
    const currentPageIndex = this.systemWatchlistPageIndex();

    // Update page size if changed
    if (event.pageSize !== this.systemWatchlistPageSize) {
      this.systemWatchlistPageSize = event.pageSize;
      // Reset to first page when page size changes
      this.systemWatchlistPageIndex.set(0);
      this.systemWatchlistCursors = [null];
      this.reloadCurrentSystemWatchlist(null);
      return;
    }

    // Determine the cursor for the target page
    let cursor: string | null = null;

    if (newPageIndex > currentPageIndex) {
      // Going forward - use the endCursor from current page
      cursor = this.systemWatchlistCursor();
      // Store cursor for this new page index
      this.systemWatchlistCursors[newPageIndex] = cursor;
    } else if (newPageIndex < currentPageIndex) {
      // Going backward - use stored cursor
      cursor = this.systemWatchlistCursors[newPageIndex] || null;
    }
    // If newPageIndex === 0, cursor is null (first page)

    this.systemWatchlistPageIndex.set(newPageIndex);
    this.reloadCurrentSystemWatchlist(cursor);
  }

  /**
   * Reload the current system watchlist with the given cursor
   */
  private reloadCurrentSystemWatchlist(cursor: string | null): void {
    const watchlistId = this.selectedWatchlistId();
    const effectiveSort = this.sortBy() || 'marketCap';
    const effectiveDirection = this.sortDirection() || 'desc';

    if (watchlistId.startsWith('sector:')) {
      const sectorName = watchlistId.replace('sector:', '');
      this.loadCategorySectorSymbols(sectorName, effectiveSort, effectiveDirection, cursor);
    } else if (watchlistId.startsWith('industry:')) {
      const industryName = watchlistId.replace('industry:', '');
      this.loadCategoryIndustrySymbols(industryName, effectiveSort, effectiveDirection, cursor);
    } else if (watchlistId.startsWith('exchange:')) {
      const exchangeName = watchlistId.replace('exchange:', '');
      this.loadCategoryExchangeSymbols(exchangeName, effectiveSort, effectiveDirection, cursor);
    }
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

    // Reset progressive loading state for new symbol
    this.hasOlderData.set(true);
    this.atLeftEdge.set(false);
    this.rawCandleData.set([]);
    this.chartPageInfo.set(null);
    this.sameCursorRetryCount = 0;
    this.lastProgressiveCursor = null;
    this.pendingProgressiveJobId = null;

    // Subscribe to real-time updates for this symbol
    this.terminalService.subscribeSymbols([item.symbol]);

    // Track symbol access by adding to watchlist (updates lastAccessedAt on backend)
    // This ensures the symbol moves to the top of Recent list regardless of view
    this.subscriptions.add(
      this.watchlistService
        .addToWatchlist(item.symbol, undefined, item.displayName, item.assetType, item.exchange)
        .subscribe({
          next: () => {
            // Refresh recent list if viewing "recent" watchlist
            if (this.selectedWatchlistId() === 'recent') {
              const sortField = this.sortBy() || 'lastAccessedAt';
              this.watchlistService.loadRecentSymbols(30, sortField).subscribe();
            }
          },
        }),
    );

    // Fetch initial quote data via GraphQL - normalize exchange (replace spaces with underscores)
    const normalizedExchange = item.exchange?.replace(/\s+/g, '_').toUpperCase();
    const fqn = normalizedExchange ? `STOCK:${normalizedExchange}:${item.symbol.toUpperCase()}` : undefined;
    console.log('[WatchlistTab] selectSymbol - fetching quote:', { symbol: item.symbol, fqn });
    this.subscriptions.add(
      this.terminalService.fetchQuote(item.symbol, fqn).subscribe({
        next: (quote) => {
          const currentSymbol = this.selectedSymbol();
          console.log('[WatchlistTab] selectSymbol - quote received:', {
            symbol: item.symbol,
            quote,
            currentSymbol,
          });
          // Only set if this is still the selected symbol (case-insensitive check)
          if (quote && currentSymbol && currentSymbol.toUpperCase() === item.symbol.toUpperCase()) {
            this.quoteData.set(quote);
            console.log('[WatchlistTab] selectSymbol - quoteData SET successfully');
          } else {
            console.log('[WatchlistTab] selectSymbol - quoteData NOT set:', {
              hasQuote: !!quote,
              currentSymbol,
              requestedSymbol: item.symbol,
            });
          }
        },
        error: (err) => {
          console.error('[WatchlistTab] selectSymbol - quote fetch error:', err);
        },
      }),
    );

    // Preserve current view when switching symbols
    // If user is on valuation/fundamentals/dividends view, load that view for the new symbol
    if (this.showValuation()) {
      this.loadValuationView(item.symbol);
    } else if (this.showFundamentals()) {
      this.loadFundamentalsView(item.symbol);
    } else if (this.showDividends()) {
      this.loadDividendsView(item.symbol);
    } else {
      // Default to chart view
      this.loadChart(item.symbol, item.exchange, 'CHART');
    }
  }

  /**
   * Fetch quote data for a symbol (used when switching symbols from command results)
   */
  private fetchQuoteForSymbol(symbol: string): void {
    // Try to get exchange from selectedItem if available - normalize (replace spaces with underscores)
    const item = this.selectedItem();
    const normalizedExchange = item?.exchange?.replace(/\s+/g, '_').toUpperCase();
    const fqn = normalizedExchange ? `STOCK:${normalizedExchange}:${symbol.toUpperCase()}` : undefined;

    console.log('[WatchlistTab] fetchQuoteForSymbol called:', { symbol, fqn, exchange: normalizedExchange });

    this.subscriptions.add(
      this.terminalService.fetchQuote(symbol, fqn).subscribe({
        next: (quote) => {
          console.log('[WatchlistTab] fetchQuote returned:', { symbol, quote, currentSymbol: this.selectedSymbol() });
          // Only update if this is still the selected symbol (case-insensitive)
          const currentSymbol = this.selectedSymbol();
          if (quote && currentSymbol && currentSymbol.toUpperCase() === symbol.toUpperCase()) {
            console.log('[WatchlistTab] Setting quoteData for', symbol);
            this.quoteData.set(quote);
          } else {
            console.log('[WatchlistTab] NOT setting quoteData - symbol mismatch or null quote:', {
              hasQuote: !!quote,
              selectedSymbol: this.selectedSymbol(),
              requestedSymbol: symbol,
            });
          }
        },
        error: (err) => {
          console.error('[WatchlistTab] fetchQuote error:', err);
        },
      }),
    );
  }

  /**
   * Load chart or data for symbol using FQN format.
   * ALWAYS executes the command via terminal service to:
   * 1. Charge credits for the chart/data load
   * 2. Get routing info from backend
   * 3. Track command in history
   */
  private loadChart(symbol: string, exchange: string | undefined, command: string): void {
    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.dataContent.set(null);
    this.tableData.set(null);
    this.showFundamentals.set(false);
    this.fundamentalsCharts.set(null);
    this.showValuation.set(false);
    this.valuationCharts.set(null);
    this.showDividends.set(false);
    this.dividendCharts.set(null);
    this.currentCommand.set(command);
    // Reset progressive loading state
    this.loadingMoreData.set(false);
    this.hasOlderData.set(true);
    this.chartPageInfo.set(null);
    this.lastProgressiveCursor = null;
    this.sameCursorRetryCount = 0;

    // Handle FINANCIALS command directly (no backend execution needed)
    // Also handle legacy FUNDAMENTALS command name
    if (command === 'FINANCIALS' || command === 'FUNDAMENTALS') {
      this.loadFundamentalsView(symbol);
      return;
    }

    // Handle DCF/VALUATION command directly
    if (command === 'DCF' || command === 'VALUATION') {
      this.loadValuationView(symbol);
      return;
    }

    // Handle DIVIDENDS command directly
    if (command === 'DIVIDENDS') {
      this.loadDividendsView(symbol);
      return;
    }

    // Build FQN command - normalize exchange name (replace spaces with underscores)
    const normalizedExchange = (exchange || 'UNKNOWN').replace(/\s+/g, '_').toUpperCase();
    const symbolFqn = `STOCK:${normalizedExchange}:${symbol.toUpperCase()}`;
    const commandFqn = `COMMAND:${command.toUpperCase()}`;

    // For CHART command, include current interval
    let fullCommand: string;
    if (command === 'CHART') {
      const interval = this.selectedInterval();
      const backendInterval = this.mapIntervalToBackend(interval);
      fullCommand = `${symbolFqn} ${commandFqn} -interval ${backendInterval.toLowerCase()}`;
    } else {
      fullCommand = `${symbolFqn} ${commandFqn}`;
    }

    console.log('[WatchlistTab] Executing FQN command:', fullCommand);
    this.terminalService.execute(fullCommand);
  }

  /**
   * Load fundamentals view for a symbol
   */
  private loadFundamentalsView(symbol: string, isRetry = false): void {
    console.log('[WatchlistTab] Loading fundamentals for:', symbol, 'isRetry:', isRetry);
    this.showFundamentals.set(true);
    // Clear chart options so fundamentals view takes precedence
    this.chartOptions.set(null);

    // Reset retry counter on new load (not a retry)
    if (!isRetry) {
      this.fundamentalsFetchRetries = 0;
    }

    // Update URL to reflect financials view with period
    const item = this.selectedItem();
    const isAnnual = this.fundamentalsIsAnnual();
    this.routingService.applyRoute({
      symbol,
      exchange: item?.exchange,
      view: 'financials',
      // Use params for financials-specific settings
      params: { period: isAnnual ? 'annual' : 'quarterly' },
    });

    this.subscriptions.add(
      this.fundamentalsService.loadFundamentals(symbol, isAnnual, 10).subscribe({
        next: (data: FundamentalsData) => {
          console.log('[WatchlistTab] Fundamentals loaded:', {
            balanceSheets: data.balanceSheets.length,
            incomeStatements: data.incomeStatements.length,
            cashFlows: data.cashFlows.length,
          });

          if (data.balanceSheets.length === 0 && data.incomeStatements.length === 0 && data.cashFlows.length === 0) {
            // No data - trigger fetch from provider
            console.log('[WatchlistTab] No fundamentals data, fetching from provider...');
            this.fetchAndLoadFundamentals(symbol);
          } else {
            // Build charts from data (pass isAnnual for proper date formatting)
            const charts = this.fundamentalsChartService.buildAllCharts(data, isAnnual);
            this.fundamentalsCharts.set(charts);
            this.chartLoading.set(false);
          }
        },
        error: (err) => {
          console.error('[WatchlistTab] Error loading fundamentals:', err);
          this.chartError.set('Failed to load fundamentals data');
          this.chartLoading.set(false);
        },
      }),
    );
  }

  /**
   * Fetch fundamentals from provider and reload
   */
  private fetchAndLoadFundamentals(symbol: string): void {
    // Check retry counter to prevent infinite loops
    this.fundamentalsFetchRetries++;
    if (this.fundamentalsFetchRetries > WatchlistTabComponent.MAX_FUNDAMENTALS_RETRIES) {
      console.log('[WatchlistTab] Max fundamentals retries reached, giving up');
      this.chartError.set('No fundamentals data available for this symbol');
      this.chartLoading.set(false);
      return;
    }

    this.subscriptions.add(
      this.fundamentalsService.fetchFundamentalsFromProvider(symbol).subscribe({
        next: (result) => {
          if (result.success && result.jobIds.length > 0) {
            // Wait for jobs to complete then reload
            console.log('[WatchlistTab] Fundamentals fetch jobs started:', result.jobIds);
            this.chartLoadingDetails.set('Fetching fundamentals data...');

            // Wait 5 seconds then retry loading (jobs typically complete quickly)
            setTimeout(() => {
              this.loadFundamentalsView(symbol, true); // Pass isRetry=true
            }, 5000);
          } else {
            this.chartError.set('Failed to fetch fundamentals data');
            this.chartLoading.set(false);
          }
        },
        error: (err) => {
          console.error('[WatchlistTab] Error fetching fundamentals:', err);
          this.chartError.set('Failed to fetch fundamentals data');
          this.chartLoading.set(false);
        },
      }),
    );
  }

  /**
   * Toggle fundamentals period between annual and quarterly
   */
  toggleFundamentalsPeriod(): void {
    const newIsAnnual = !this.fundamentalsIsAnnual();
    this.fundamentalsIsAnnual.set(newIsAnnual);
    this.fundamentalsFetchRetries = 0; // Reset retries for new period

    const symbol = this.selectedSymbol();
    if (symbol) {
      this.chartLoading.set(true);
      this.fundamentalsCharts.set(null); // Clear current charts
      this.loadFundamentalsView(symbol);
    }
  }

  /**
   * Change the number of years shown in historical valuation charts
   */
  onValuationYearsChange(years: number): void {
    this.valuationHistoricalYears.set(years);

    // Rebuild historical valuation charts with new year filter
    const data = this.valuationData();
    if (data) {
      const currentCharts = this.valuationCharts();
      if (currentCharts) {
        this.valuationCharts.set({
          ...currentCharts,
          historicalValuation: this.valuationChartService.buildHistoricalValuationChart(data, years),
          priceVsValuation: this.valuationChartService.buildPriceVsValuationChart(data, years),
        });
      }
    }
  }

  /**
   * Load DCF valuation view for a symbol
   */
  private loadValuationView(symbol: string, isRetry = false): void {
    console.log('[WatchlistTab] Loading valuation for:', symbol, 'isRetry:', isRetry);

    // Check if this is an ETF - ETFs don't support valuation
    const item = this.selectedItem();
    if (item?.assetType?.toUpperCase() === 'ETF') {
      this.showValuation.set(true);
      this.chartOptions.set(null);
      this.chartError.set('Valuation analysis is not available for ETFs. ETFs do not have earnings or cash flow data.');
      this.chartLoading.set(false);
      return;
    }

    this.showValuation.set(true);
    this.valuationDrillDown.set('summary');
    // Clear chart options so valuation view takes precedence
    this.chartOptions.set(null);

    // Reset retry counter on new load (not a retry)
    if (!isRetry) {
      this.valuationFetchRetries = 0;
    }

    // Update URL to reflect valuation view
    this.routingService.applyRoute({
      symbol,
      exchange: item?.exchange,
      view: 'valuation',
    });

    this.subscriptions.add(
      this.valuationService.loadValuation(symbol).subscribe({
        next: (data: DCFAnalysisData | null) => {
          if (!data) {
            // No valuation data - check for service error message
            const serviceError = this.valuationService.error();
            console.log('[WatchlistTab] No valuation data, error:', serviceError);
            this.chartError.set(
              serviceError ||
                'DCF valuation requires fundamental data. Please run Fundamentals first to fetch the data.',
            );
            this.chartLoading.set(false);
            return;
          }

          console.log('[WatchlistTab] Valuation loaded:', {
            symbol: data.symbol,
            companyName: data.companyName,
            baseCase: data.baseCase.intrinsicValuePerShare,
            currentPrice: data.valuationSummary.currentPrice,
          });

          // Store raw data for drill-down
          this.valuationData.set(data);

          // Build all valuation charts
          const charts = {
            fcfProjection: this.valuationChartService.buildFcfProjectionChart(data),
            valuationComparison: this.valuationChartService.buildValuationComparisonChart(data),
            enterpriseValue: this.valuationChartService.buildEnterpriseValueWaterfallChart(data.baseCase),
            sensitivityHeatmap: this.valuationChartService.buildSensitivityHeatmap(data.sensitivityGrid),
            historicalFinancials: this.valuationChartService.buildHistoricalFinancialsChart(data),
            historicalValuation: this.valuationChartService.buildHistoricalValuationChart(data),
            priceVsValuation: this.valuationChartService.buildPriceVsValuationChart(
              data,
              this.valuationHistoricalYears(),
            ),
          };
          this.valuationCharts.set(charts);
          this.chartLoading.set(false);
        },
        error: (err) => {
          console.error('[WatchlistTab] Error loading valuation:', err);
          // Check if this is a schema/API not available error
          const errorMsg = err.message || '';
          if (errorMsg.includes('Cannot query field') || errorMsg.includes('400')) {
            this.chartError.set(
              'DCF Valuation API is not yet available. The backend needs to implement the dcfAnalysis query.',
            );
          } else {
            this.chartError.set(err.message || 'Failed to load valuation data');
          }
          this.chartLoading.set(false);
        },
      }),
    );
  }

  /**
   * Set valuation drill-down view
   */
  setValuationDrillDown(view: 'summary' | 'historical' | 'projections' | 'sensitivity' | 'methodology'): void {
    this.valuationDrillDown.set(view);
  }

  /**
   * Handle valuation model change (DCF vs DDM)
   */
  onValuationModelChange(model: 'dcf' | 'ddm'): void {
    console.log('[WatchlistTab] Valuation model changed to:', model);
    this.selectedValuationModel.set(model);

    // Reload valuation with the selected model
    const symbol = this.selectedSymbol();
    if (symbol) {
      if (model === 'ddm') {
        // Load DDM analysis
        this.chartLoading.set(true);
        this.chartError.set(null);
        this.subscriptions.add(
          this.valuationService.loadDDM(symbol).subscribe({
            next: (data) => {
              console.log('[WatchlistTab] DDM data loaded:', data);
              if (!data || !data.isDividendPayer) {
                this.chartError.set('DDM not applicable - company does not pay dividends');
                this.chartLoading.set(false);
                return;
              }
              // Store DDM data
              this.ddmData.set(data);
              // Build DDM charts
              const charts = {
                dividendProjection: this.valuationChartService.buildDdmDividendChart(data),
                valuation: this.valuationChartService.buildDdmValuationChart(data),
                breakdown: this.valuationChartService.buildDdmBreakdownChart(data),
              };
              this.ddmCharts.set(charts);
              this.chartLoading.set(false);
            },
            error: (err) => {
              console.error('[WatchlistTab] DDM load error:', err);
              this.chartError.set(err.message || 'Failed to load DDM analysis');
              this.chartLoading.set(false);
            },
          }),
        );
      } else {
        // Clear DDM data and reload DCF analysis
        this.ddmData.set(null);
        this.ddmCharts.set(null);
        this.loadValuationView(symbol);
      }
    }
  }

  /**
   * Load dividend analysis view for a symbol
   */
  private loadDividendsView(symbol: string): void {
    console.log('[WatchlistTab] Loading dividends for:', symbol);
    this.showDividends.set(true);
    // Clear chart options so dividends view takes precedence
    this.chartOptions.set(null);

    // Update URL to reflect dividends view
    const item = this.selectedItem();
    this.routingService.applyRoute({
      symbol,
      exchange: item?.exchange,
      view: 'dividends',
    });

    this.subscriptions.add(
      this.dividendService.loadDividendAnalysis(symbol, true).subscribe({
        next: (data: DividendAnalysisData | null) => {
          if (!data) {
            const serviceError = this.dividendService.error();
            console.log('[WatchlistTab] No dividend data, error:', serviceError);
            this.chartError.set(serviceError || 'No dividend data available. This company may not pay dividends.');
            this.chartLoading.set(false);
            return;
          }

          console.log('[WatchlistTab] Dividends loaded:', {
            symbol: data.symbol,
            years: data.yearlyData.length,
            yield: data.metrics.dividendYield,
          });

          // Store raw data
          this.dividendData.set(data);

          // Build dividend charts
          this.buildDividendCharts(data);
          this.chartLoading.set(false);
        },
        error: (err) => {
          console.error('[WatchlistTab] Error loading dividends:', err);
          this.chartError.set(err.message || 'Failed to load dividend data');
          this.chartLoading.set(false);
        },
      }),
    );
  }

  /**
   * Build dividend charts from data
   */
  private buildDividendCharts(data: DividendAnalysisData): void {
    const charts = {
      payoutRatio: this.dividendChartService.buildFcfPayoutRatioChart(data),
      yearlyDividends: this.dividendChartService.buildYearlyDividendsChart(data),
      cashFlowComparison: this.dividendChartService.buildCashFlowComparisonChart(data, this.showOperatingCashFlow()),
    };
    this.dividendCharts.set(charts);
  }

  /**
   * Toggle operating cash flow visibility in dividend comparison chart
   */
  toggleOperatingCashFlow(): void {
    this.showOperatingCashFlow.update((v) => !v);
    const data = this.dividendData();
    if (data) {
      this.buildDividendCharts(data);
    }
  }

  /**
   * Handle OCF toggle change from dividends view component
   */
  onOcfToggleChange(show: boolean): void {
    this.showOperatingCashFlow.set(show);
    const data = this.dividendData();
    if (data) {
      this.buildDividendCharts(data);
    }
  }

  /**
   * Handle view toggle change from mat-button-toggle-group
   */
  onViewToggleChange(event: { value: string }): void {
    const command = event.value;
    const symbol = this.selectedSymbol();
    if (symbol && command) {
      console.log('[WatchlistTab] View toggle changed:', { symbol, command });
      this.runCommand(symbol, command);
    }
  }

  /**
   * Run a command for a symbol
   */
  runCommand(symbol: string, command: string): void {
    console.log('[WatchlistTab] runCommand called:', { symbol, command, currentCommand: this.currentCommand() });

    // Always run the command, even if it's the same as current
    // This ensures clicking the button always triggers the action
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
   * Handle chart setting toggle from ChartHeaderComponent
   */
  onChartSettingChange(event: { setting: keyof ChartSettings; value: boolean }): void {
    switch (event.setting) {
      case 'showCorporateActions':
        this.showCorporateActions.set(event.value);
        break;
      case 'showExtendedHours':
        this.showExtendedHours.set(event.value);
        break;
      case 'useLocalTime':
        this.showLocalTime.set(event.value);
        break;
      case 'adjustForDividends':
        this.showDividendsReinvested.set(event.value);
        break;
      case 'showRawData':
        this.showRawData.set(event.value);
        break;
      case 'showVolume':
        this.showVolume.set(event.value);
        break;
      case 'lockToRight':
        this.lockToRight.set(event.value);
        break;
    }
    // Persist preferences and rebuild chart
    this.saveChartPreferences();
    this.rebuildChart();
  }

  /**
   * Handle lock to right toggle from ChartHeaderComponent
   */
  onLockToRightChange(locked: boolean): void {
    this.lockToRight.set(locked);
    this.saveChartPreferences();
  }

  /**
   * Save chart preferences to backend
   */
  private saveChartPreferences(): void {
    this.chartPreferencesService.updatePreference('showCorporateActions', this.showCorporateActions()).subscribe();
    this.chartPreferencesService.updatePreference('showExtendedHours', this.showExtendedHours()).subscribe();
    this.chartPreferencesService.updatePreference('useExchangeTime', !this.showLocalTime()).subscribe();
    this.chartPreferencesService.updatePreference('adjustForDividends', this.showDividendsReinvested()).subscribe();
    this.chartPreferencesService.updatePreference('showRawData', this.showRawData()).subscribe();
    this.chartPreferencesService.updatePreference('lockToRight', this.lockToRight()).subscribe();
  }

  /**
   * Rebuild the chart with current settings
   */
  private rebuildChart(): void {
    const symbol = this.selectedSymbol();
    const item = this.selectedItem();
    if (symbol) {
      this.loadChart(symbol, item?.exchange, this.currentCommand());
    }
  }

  /**
   * Handle chart initialization - set up zoom behavior and OHLC crosshair.
   * Allows free zooming without boundaries - data loads progressively.
   */
  private zoomCorrectionTimer: ReturnType<typeof setTimeout> | null = null;

  onChartInit(chart: echarts.ECharts): void {
    this.chartInstance = chart;

    // Listen for datazoom events to trigger progressive data loading
    chart.on('datazoom', () => {
      // Skip if we're currently correcting zoom (prevents re-entrance)
      if (this.isCorrectingZoom) return;

      // Get current zoom state from the chart option (most reliable source after zoom)
      const option = chart.getOption();
      const dataZoom = option['dataZoom'] as { type?: string; start?: number; end?: number }[] | undefined;

      if (!dataZoom || dataZoom.length === 0) return;

      // Find the inside dataZoom - read from the actual option state, not params
      // The params may not include the final computed values for wheel zoom
      const insideZoom = dataZoom.find((dz) => dz.type === 'inside') || dataZoom[0];
      // Get values from the option which reflects the current state after the zoom
      const startPercent = insideZoom.start ?? 0;
      const endPercent = insideZoom.end ?? 100;

      console.log('[WatchlistTab] DataZoom event:', {
        start: startPercent.toFixed(2),
        end: endPercent.toFixed(2),
        locked: this.lockToRight(),
      });

      // If locked to right and user scrolled away from 100%, snap back
      // Use a slightly larger threshold (99.5) to catch more edge cases
      if (this.lockToRight() && endPercent < 99.9) {
        // Calculate the zoom range (how zoomed in/out)
        const MIN_RANGE = 3;
        const range = Math.max(endPercent - startPercent, MIN_RANGE);
        // Adjust to keep end at 100%
        const newStart = Math.max(0, 100 - range);

        if (this.zoomCorrectionTimer) {
          clearTimeout(this.zoomCorrectionTimer);
        }

        // Use a very short timeout to batch corrections but keep them frame-instant
        this.zoomCorrectionTimer = setTimeout(() => {
          this.isCorrectingZoom = true;

          chart.dispatchAction({
            type: 'dataZoom',
            start: newStart,
            end: 100,
          });

          // Allow the next zoom event after 100ms
          setTimeout(() => {
            this.isCorrectingZoom = false;
          }, 100);
        }, 16); // 16ms = ~1 frame delay for instant feel

        return; // Don't process further - the new dispatch will trigger another event
      }

      // Track if user is at the left edge (for "no more data" hint)
      // Consider "at edge" when start is at or near 0%
      this.atLeftEdge.set(startPercent <= 1);

      // Trigger progressive data load when zoomed out near the left edge
      // This loads more historical data in the background
      this.checkProgressiveDataLoad(startPercent);

      // Update crosshair position after zoom (data positions have changed)

      if (this.lastMousePosition) {
        // Reset the last data index so it will update
        this.lastCrosshairDataIndex = -1;
        const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [
          this.lastMousePosition.offsetX,
          this.lastMousePosition.offsetY,
        ]);
        if (pointInGrid) {
          const dataIndex = Math.round(pointInGrid[0]);
          // Get current data length from chart for bounds checking
          const instanceOption = chart.getOption();
          const series = instanceOption?.['series'] as { type?: string; data?: unknown[] }[] | undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const candleSeries = Array.isArray(series) ? series.find((s: any) => s.type === 'candlestick') : null;
          const dataLength = candleSeries?.data?.length || 0;

          if (dataIndex >= 0 && dataIndex < dataLength) {
            this.updateCrosshairOHLC(dataIndex);
            this.lastCrosshairDataIndex = dataIndex;

            // Move the visual crosshair lines to the new data position
            // Use dispatchAction to update the axisPointer position
            chart.dispatchAction({
              type: 'updateAxisPointer',
              currTrigger: 'mousemove',
              x: this.lastMousePosition.offsetX,
              y: this.lastMousePosition.offsetY,
            });
          } else {
            // Index out of bounds - clear crosshair
            this.crosshairData.set(null);
          }
        }
      }
    });

    // Listen for mousemove to update OHLC display based on crosshair position
    // Throttled using requestAnimationFrame to prevent lag
    chart.getZr().on('mousemove', (params: { offsetX: number; offsetY: number }) => {
      // Store mouse position for zoom updates
      this.lastMousePosition = { offsetX: params.offsetX, offsetY: params.offsetY };

      // Convert pixel position to data index
      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [params.offsetX, params.offsetY]);
      if (pointInGrid) {
        const dataIndex = Math.round(pointInGrid[0]);
        // Skip if same index as last update (no change needed)
        if (dataIndex === this.lastCrosshairDataIndex) return;
        this.lastCrosshairDataIndex = dataIndex;

        // Throttle updates using requestAnimationFrame
        if (!this.pendingCrosshairUpdate && dataIndex >= 0) {
          this.pendingCrosshairUpdate = true;
          requestAnimationFrame(() => {
            this.updateCrosshairOHLC(dataIndex);
            this.pendingCrosshairUpdate = false;
          });
        }
      }
    });

    // Clear OHLC when mouse leaves chart
    chart.getZr().on('globalout', () => {
      this.crosshairData.set(null);
      this.lastCrosshairDataIndex = -1;
      this.lastMousePosition = null;
    });
  }

  /**
   * Update OHLC display from crosshair position
   * Uses the chart instance directly to ensure data is in sync after progressive loading
   */
  private updateCrosshairOHLC(dataIndex: number): void {
    // Use chart instance directly to get current data (more reliable than signal after updates)
    if (!this.chartInstance) return;

    const instanceOption = this.chartInstance.getOption();
    if (!instanceOption) return;

    // Get series data from the chart instance
    const series = instanceOption['series'] as { type?: string; data?: unknown[] }[] | undefined;
    if (!series || !Array.isArray(series) || series.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candlestickSeries = series.find((s: any) => s.type === 'candlestick');
    if (!candlestickSeries?.data) return;

    // Validate data index bounds
    const dataLength = candlestickSeries.data.length;
    if (dataIndex < 0 || dataIndex >= dataLength) {
      // Index out of bounds - clear crosshair data
      this.crosshairData.set(null);
      return;
    }

    const candleData = candlestickSeries.data[dataIndex];
    if (!candleData || !Array.isArray(candleData)) {
      this.crosshairData.set(null);
      return;
    }

    // Get the date from xAxis data (from chart instance)
    const xAxis = instanceOption['xAxis'] as { data?: string[] }[] | { data?: string[] } | undefined;
    const xAxisData = Array.isArray(xAxis) ? xAxis[0]?.data : (xAxis as { data?: string[] })?.data;

    if (!xAxisData || dataIndex >= xAxisData.length) {
      this.crosshairData.set(null);
      return;
    }

    const dateStr = xAxisData[dataIndex];

    // ECharts candlestick data format: [open, close, low, high]
    const [open, close, low, high] = candleData;
    const isPositive = close >= open;

    // Get volume and actual date from rawCandleData for proper formatting
    let volume: number | undefined;
    let actualDate: string = dateStr || '';
    const candles = this.rawCandleData();
    if (candles && dataIndex < candles.length) {
      const candle = candles[dataIndex];
      if (candle?.volume) {
        volume = candle.volume;
      }
      // Use the actual ISO date string for proper formatting in formatCrosshairDate
      if (candle?.date) {
        actualDate = candle.date instanceof Date ? candle.date.toISOString() : String(candle.date);
      }
    }

    this.crosshairData.set({
      date: actualDate,
      open,
      high,
      low,
      close,
      volume,
      isPositive,
    });
  }

  /**
   * Check if we need to load more data when zooming out.
   * Triggers loading when user approaches the left edge of available data.
   * No boundary enforcement - user can zoom freely, data loads in background.
   */
  private checkProgressiveDataLoad(startPercent: number): void {
    // Trigger loading when showing data from the left 30% of the chart
    // This gives ample buffer to load data before user sees empty space
    const loadThreshold = 30;
    const pageInfo = this.chartPageInfo();
    const hasOlder = this.hasOlderData();
    const isLoading = this.loadingMoreData();

    // Debug logging
    console.log('[WatchlistTab] checkProgressiveDataLoad:', {
      startPercent,
      threshold: loadThreshold,
      hasOlderData: hasOlder,
      loadingMoreData: isLoading,
      hasEndCursor: !!pageInfo?.endCursor,
      interval: this.selectedInterval(),
    });

    if (startPercent <= loadThreshold && !isLoading && hasOlder) {
      console.log(
        '[WatchlistTab] Triggering progressive data load at',
        startPercent,
        '% (threshold:',
        loadThreshold,
        '%)',
      );
      this.loadOlderChartData();
    }
  }

  /**
   * Load older historical data when user zooms out.
   * Uses Relay cursor pagination when available, falls back to date range.
   * Backend should auto-fetch from Alpha Vantage if data is missing.
   */
  private loadOlderChartData(): void {
    const symbol = this.selectedSymbol();
    const candles = this.rawCandleData();
    const item = this.selectedItem();
    const pageInfo = this.chartPageInfo();

    if (!symbol || candles.length === 0) {
      console.log('[WatchlistTab] Cannot load older data: no symbol or candles');
      return;
    }

    this.loadingMoreData.set(true);

    const interval = this.selectedInterval();
    const backendInterval = this.mapIntervalToBackend(interval);
    const fqn = item?.exchange ? `STOCK:${item.exchange.toUpperCase()}:${symbol.toUpperCase()}` : undefined;

    // Prefer cursor-based pagination if we have an endCursor
    if (pageInfo?.endCursor) {
      console.log('[WatchlistTab] Using cursor-based pagination:', {
        symbol,
        interval: backendInterval,
        cursor: pageInfo.endCursor.substring(0, 30) + '...',
        currentHasOlderData: pageInfo.hasOlderData,
      });

      this.subscriptions.add(
        this.chartDataService.loadOlderData(symbol, backendInterval, pageInfo.endCursor, undefined, fqn).subscribe({
          next: (result) => this.handleOlderDataResult(result, candles, backendInterval),
          error: (err) => {
            console.error('[WatchlistTab] Failed to load older data:', err);
            this.loadingMoreData.set(false);
          },
        }),
      );
    } else {
      // Fallback to date-range based loading
      console.log('[WatchlistTab] No endCursor available, falling back to date-range loading. pageInfo:', pageInfo);
      const oldestCandle = candles[0];
      const endDate = new Date(oldestCandle.date);
      const startDate = new Date(endDate);

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

      console.log('[WatchlistTab] Using date-range loading:', {
        symbol,
        startDate,
        endDate,
        interval: backendInterval,
      });

      this.subscriptions.add(
        this.chartDataService.loadDataByRange(symbol, startDate, endDate, backendInterval, fqn).subscribe({
          next: (result) => this.handleOlderDataResult(result, candles, backendInterval),
          error: (err) => {
            console.error('[WatchlistTab] Failed to load older data:', err);
            this.loadingMoreData.set(false);
          },
        }),
      );
    }
  }

  /**
   * Handle result from loading older data.
   * If no data but hasOlderData is true (backend is fetching), retry after delay.
   */
  private handleOlderDataResult(result: ChartDataResult, existingCandles: ChartCandle[], interval: string): void {
    const cursorPreview = result.pageInfo.endCursor?.substring(0, 20) + '...';
    console.log(
      '[WatchlistTab] Received older data:',
      result.candles.length,
      'candles, hasOlderData:',
      result.pageInfo.hasOlderData,
      'endCursor:',
      cursorPreview,
    );

    if (result.candles.length > 0) {
      // Merge with existing candles (avoid duplicates)
      const mergedCandles = this.mergeCandles(existingCandles, result.candles);
      this.rawCandleData.set(mergedCandles);

      // Check if backend returned the same cursor (data still being fetched)
      const newCursor = result.pageInfo.endCursor;
      const sameCursorReturned = newCursor && newCursor === this.lastProgressiveCursor;

      if (sameCursorReturned && result.pageInfo.hasOlderData) {
        this.sameCursorRetryCount++;
        console.log('[WatchlistTab] Same cursor returned, retry count:', this.sameCursorRetryCount);

        if (this.sameCursorRetryCount >= WatchlistTabComponent.MAX_SAME_CURSOR_RETRIES) {
          // Max retries reached - backend likely has no more data despite hasOlderData=true
          console.log('[WatchlistTab] Max retries with same cursor reached, stopping progressive loading');
          this.hasOlderData.set(false);
          this.pendingProgressiveJobId = null;
          this.updateChartWithMergedData(mergedCandles);
          this.loadingMoreData.set(false);
          return;
        }

        if (this.pendingProgressiveJobId) {
          // Backend returned same cursor - wait for job to complete before retrying
          console.log('[WatchlistTab] Waiting for job completion:', this.pendingProgressiveJobId);
          this.hasOlderData.set(true);
          this.updateChartWithMergedData(mergedCandles);
          this.loadingMoreData.set(false);
          // Don't update chartPageInfo or lastProgressiveCursor - we'll retry with same cursor after job
          return;
        }
      } else if (newCursor && newCursor !== this.lastProgressiveCursor) {
        // New cursor returned - reset retry count
        this.sameCursorRetryCount = 0;
      }

      // Update tracking for next iteration
      if (newCursor) {
        this.lastProgressiveCursor = newCursor;
        this.chartPageInfo.set(result.pageInfo);
        this.hasOlderData.set(result.pageInfo.hasOlderData);
      } else if (result.pageInfo.hasOlderData) {
        // Backend returned data without cursor but says more exists
        console.log(
          '[WatchlistTab] Incomplete pageInfo (no endCursor but hasOlderData=true)',
          '- keeping existing cursor',
        );
        this.hasOlderData.set(true);
      } else {
        // No more data available
        this.chartPageInfo.set(result.pageInfo);
        this.hasOlderData.set(false);
      }

      // Update the chart with merged data
      this.updateChartWithMergedData(mergedCandles);
      this.loadingMoreData.set(false);
    } else if (result.pageInfo.hasOlderData && this.isIntradayInterval(interval)) {
      // No data returned, but backend says more exists - it may be auto-fetching
      // Retry after a delay to allow backend to fetch from Alpha Vantage
      console.log('[WatchlistTab] No data yet but hasOlderData=true, backend may be fetching. Retrying in 3s...');
      setTimeout(() => {
        this.loadingMoreData.set(false);
        // Don't auto-retry - let user trigger another zoom action
        // This prevents infinite loops if backend isn't auto-fetching
      }, 3000);
    } else {
      // No more data available
      this.hasOlderData.set(false);
      this.loadingMoreData.set(false);
    }
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
   * Update the chart with merged candle data.
   * Maintains the user's current zoom position when new data is prepended.
   */
  private updateChartWithMergedData(candles: ChartCandle[]): void {
    if (!this.chartInstance) return;

    // Get current state from the CHART INSTANCE (not the signal)
    const instanceOption = this.chartInstance.getOption();

    // Get current zoom state
    const dataZoom = instanceOption['dataZoom'] as { type?: string; start?: number; end?: number }[] | undefined;
    let currentStart = 0;
    let currentEnd = 100;
    if (dataZoom && dataZoom.length > 0) {
      const insideZoom = dataZoom.find((dz) => dz.type === 'inside') || dataZoom[0];
      currentStart = insideZoom.start ?? 0;
      currentEnd = insideZoom.end ?? 100;
    }

    // Get old data count from the chart instance
    const series = instanceOption['series'] as { type?: string; data?: unknown[] }[] | undefined;
    let oldDataCount = 0;
    if (series && Array.isArray(series)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candlestickSeries = series.find((s: any) => s.type === 'candlestick');
      oldDataCount = candlestickSeries?.data?.length || 0;
    }

    // Build new series data from candles
    const candlestickData = candles.map((c) => [c.open, c.close, c.low, c.high]);
    // Use ISO dates for proper parsing in axis labels and crosshair
    const xAxisData = candles.map((c) => c.date.toISOString());
    // Build volume data with colors based on candle direction
    const volumeData = candles.map((c) => ({
      value: c.volume || 0,
      itemStyle: {
        color: c.close >= c.open ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
      },
    }));

    // Calculate new zoom position to maintain the same visible data range
    const newDataCount = candles.length;
    let newStart = currentStart;
    let newEnd = currentEnd;

    if (newDataCount > oldDataCount && oldDataCount > 0) {
      // New data was prepended to the left
      const addedDataCount = newDataCount - oldDataCount;
      const shiftPercent = (addedDataCount / newDataCount) * 100;

      // Shift the view to the right to keep same visible data
      newStart = currentStart + shiftPercent;
      newEnd = currentEnd + shiftPercent;

      // Clamp to valid range
      newStart = Math.min(100, newStart);
      newEnd = Math.min(100, newEnd);

      console.log('[WatchlistTab] Adjusted zoom:', {
        oldDataCount,
        newDataCount,
        shiftPercent: shiftPercent.toFixed(1),
        zoom: `${currentStart.toFixed(1)}-${currentEnd.toFixed(1)} → ${newStart.toFixed(1)}-${newEnd.toFixed(1)}`,
      });
    }

    // If locked to right, ensure end is at 100%
    if (this.lockToRight()) {
      const range = newEnd - newStart;
      newStart = Math.max(0, 100 - range);
      newEnd = 100;
    }

    // Clear crosshair data before update to prevent stale data display
    this.crosshairData.set(null);
    this.lastCrosshairDataIndex = -1;

    // Set flag to prevent datazoom event handler from interfering with our explicit zoom
    this.isCorrectingZoom = true;

    // Check if we have volume series (dual-chart mode)
    const currentSeries = instanceOption['series'] as unknown[] | undefined;
    const hasVolumeSeries = Array.isArray(currentSeries) && currentSeries.length > 1;

    // Update the data and zoom
    // When volume is shown, we have 2 x-axes and 2 series that need updating
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOption: any = {
      dataZoom: [{ start: newStart, end: newEnd }],
    };

    if (hasVolumeSeries) {
      // Dual-chart mode: update both x-axes and both series
      updateOption.xAxis = [{ data: xAxisData }, { data: xAxisData }];
      updateOption.series = [{ data: candlestickData }, { data: volumeData }];
    } else {
      // Single chart mode: update only candlestick
      updateOption.xAxis = { data: xAxisData };
      updateOption.series = [{ data: candlestickData }];
    }

    this.chartInstance.setOption(updateOption, { notMerge: false, lazyUpdate: false });

    // Reset flag after a brief delay to allow the zoom to complete
    setTimeout(() => {
      this.isCorrectingZoom = false;
    }, 50);

    // Wait for chart to finish rendering before updating crosshair
    // Use setTimeout to ensure the chart has processed the new data
    setTimeout(() => {
      if (this.lastMousePosition && this.chartInstance) {
        const pointInGrid = this.chartInstance.convertFromPixel({ seriesIndex: 0 }, [
          this.lastMousePosition.offsetX,
          this.lastMousePosition.offsetY,
        ]);
        if (pointInGrid) {
          const dataIndex = Math.round(pointInGrid[0]);
          if (dataIndex >= 0 && dataIndex < candles.length) {
            this.updateCrosshairOHLC(dataIndex);
            this.lastCrosshairDataIndex = dataIndex;

            // Move the visual crosshair lines to the new data position
            this.chartInstance.dispatchAction({
              type: 'updateAxisPointer',
              currTrigger: 'mousemove',
              x: this.lastMousePosition.offsetX,
              y: this.lastMousePosition.offsetY,
            });
          }
        }
      }
    }, 100);
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
   * Fetch pageInfo from GraphQL for cursor-based progressive loading.
   * This is needed when chart data comes from command result (which doesn't include pageInfo).
   */
  private fetchChartPageInfo(symbol: string | null): void {
    if (!symbol) {
      this.chartPageInfo.set(null);
      return;
    }

    const interval = this.selectedInterval();
    const backendInterval = this.mapIntervalToBackend(interval);
    const item = this.selectedItem();
    const fqn = item?.exchange ? `STOCK:${item.exchange.toUpperCase()}:${symbol.toUpperCase()}` : undefined;

    console.log('[WatchlistTab] Fetching pageInfo for:', { symbol, interval: backendInterval });

    // Query a small amount of data just to get the pageInfo
    this.subscriptions.add(
      this.chartDataService.loadChartData(symbol, backendInterval, 1, fqn).subscribe({
        next: (result) => {
          console.log('[WatchlistTab] Got pageInfo:', {
            hasOlderData: result.pageInfo.hasOlderData,
            endCursor: result.pageInfo.endCursor?.substring(0, 20) + '...',
          });
          this.chartPageInfo.set(result.pageInfo);
          this.hasOlderData.set(result.pageInfo.hasOlderData);
        },
        error: (err) => {
          console.error('[WatchlistTab] Failed to fetch pageInfo:', err);
          this.chartPageInfo.set(null);
        },
      }),
    );
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
      { icon: 'account_balance', label: 'Financials', command: 'FINANCIALS' },
      { icon: 'analytics', label: 'Valuation', command: 'DCF' },
      { icon: 'payments', label: 'Dividends', command: 'DIVIDENDS' },
      { icon: 'table_chart', label: 'Table', command: 'HP' },
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

  // ============================================
  // Selection Mode & Copy/Export Functionality
  // ============================================

  /**
   * Toggle selection mode for multi-select
   */
  toggleSelectionMode(): void {
    this.selectionMode.update((v) => !v);
    if (!this.selectionMode()) {
      // Clear selections when exiting selection mode
      this.selectedSymbols.set(new Set());
    }
    // Update columns to show/hide select column
    this.updateWatchlistColumns();
  }

  /**
   * Toggle selection of a single symbol
   */
  toggleSymbolSelection(symbol: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.selectedSymbols.update((current) => {
      const newSet = new Set(current);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  }

  /**
   * Check if a symbol is selected
   */
  isSymbolSelected(symbol: string): boolean {
    return this.selectedSymbols().has(symbol);
  }

  /**
   * Select all symbols in the current list
   */
  selectAllSymbols(): void {
    const allSymbols = this.currentSymbols().map((s) => s.symbol);
    this.selectedSymbols.set(new Set(allSymbols));
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedSymbols.set(new Set());
  }

  /**
   * Get count of selected symbols
   */
  selectedCount(): number {
    return this.selectedSymbols().size;
  }

  /**
   * Copy selected symbols to clipboard
   */
  copySelectedSymbols(): void {
    const symbols = Array.from(this.selectedSymbols());
    if (symbols.length === 0) {
      this.messageService.warning('No symbols selected');
      return;
    }

    const text = symbols.join(', ');
    navigator.clipboard.writeText(text).then(
      () => {
        this.messageService.success(`Copied ${symbols.length} symbol${symbols.length > 1 ? 's' : ''} to clipboard`);
      },
      (err) => {
        this.messageService.error(`Failed to copy: ${err.message}`);
      },
    );
  }

  /**
   * Copy all symbols in the current watchlist to clipboard
   */
  copyAllSymbols(): void {
    const symbols = this.currentSymbols().map((s) => s.symbol);
    if (symbols.length === 0) {
      this.messageService.warning('No symbols to copy');
      return;
    }

    const text = symbols.join(', ');
    navigator.clipboard.writeText(text).then(
      () => {
        this.messageService.success(`Copied ${symbols.length} symbol${symbols.length > 1 ? 's' : ''} to clipboard`);
      },
      (err) => {
        this.messageService.error(`Failed to copy: ${err.message}`);
      },
    );
  }

  /**
   * Open create watchlist dialog
   * @param prefilledSymbols Optional symbols to pre-fill in the dialog
   */
  openCreateWatchlistDialog(prefilledSymbols?: string[]): void {
    const dialogRef = this.dialog.open(CreateWatchlistDialogComponent, {
      width: '500px',
      data: { symbols: prefilledSymbols } as CreateWatchlistDialogData,
    });

    dialogRef.afterClosed().subscribe((result: CreateWatchlistDialogResult | undefined) => {
      if (result) {
        this.createWatchlistWithSymbols(result);
      }
    });
  }

  /**
   * Create a watchlist from dialog result, adding symbols sequentially
   */
  private createWatchlistWithSymbols(result: CreateWatchlistDialogResult): void {
    this.subscriptions.add(
      this.watchlistService.createWatchlist(result.name, result.description).subscribe({
        next: (response) => {
          if (response.success && response.watchlist) {
            const watchlistId = response.watchlist.uuid;

            if (result.symbols.length > 0) {
              // Add symbols sequentially
              this.addSymbolsToWatchlistSequentially(watchlistId, result.symbols, 0, () => {
                const count = result.symbols.length;
                const plural = count > 1 ? 's' : '';
                this.messageService.success(`Created "${result.name}" with ${count} symbol${plural}`);
                // Switch to the new watchlist
                this.onWatchlistChange(watchlistId);
              });
            } else {
              this.messageService.success(`Created watchlist "${result.name}"`);
              this.onWatchlistChange(watchlistId);
            }

            // Exit selection mode if active
            if (this.selectionMode()) {
              this.toggleSelectionMode();
            }
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to create watchlist: ${err.message}`);
        },
      }),
    );
  }

  /**
   * Add symbols to a watchlist one at a time
   */
  private addSymbolsToWatchlistSequentially(
    watchlistId: string,
    symbols: string[],
    index: number,
    onComplete: () => void,
  ): void {
    if (index >= symbols.length) {
      onComplete();
      return;
    }

    const symbol = symbols[index];
    this.watchlistService.addToWatchlist(symbol, watchlistId).subscribe({
      next: () => {
        // Continue with next symbol
        this.addSymbolsToWatchlistSequentially(watchlistId, symbols, index + 1, onComplete);
      },
      error: () => {
        // Skip failed symbol, continue with next
        this.addSymbolsToWatchlistSequentially(watchlistId, symbols, index + 1, onComplete);
      },
    });
  }

  /**
   * Create new watchlist from selected symbols
   */
  createWatchlistFromSelection(): void {
    const symbols = Array.from(this.selectedSymbols());
    this.openCreateWatchlistDialog(symbols);
  }

  /**
   * Handle keyboard shortcuts for copy (Ctrl+C)
   */
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+C or Cmd+C to copy selected symbols
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      if (this.selectionMode() && this.selectedCount() > 0) {
        event.preventDefault();
        this.copySelectedSymbols();
      }
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
    console.log('[WatchlistTab] onIntervalChange called with:', interval);
    console.log('[WatchlistTab] Current intervalOptions:', this.intervalOptions());
    console.log('[WatchlistTab] Previous selectedInterval:', this.selectedInterval());

    this.selectedInterval.set(interval);
    console.log('[WatchlistTab] New selectedInterval:', this.selectedInterval());

    const symbol = this.selectedSymbol();
    if (symbol) {
      // Update URL with new interval
      const item = this.selectedItem();
      this.routingService.applyRoute({
        symbol,
        exchange: item?.exchange,
        interval: interval as RouteInfo['interval'],
        view: 'chart',
      });

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

    // Ensure selectedInterval matches an available option (case-insensitive)
    this.syncSelectedIntervalWithOptions(interval);

    console.log('[WatchlistTab] loadChartWithOptions:', {
      symbol,
      exchange,
      frontendInterval: interval,
      backendInterval,
      fqn,
      intervalOptions: this.intervalOptions(),
      selectedIntervalAfterSync: this.selectedInterval(),
    });

    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.hasOlderData.set(true); // Reset - assume there's more data
    this.sameCursorRetryCount = 0;
    this.lastProgressiveCursor = null;
    this.pendingProgressiveJobId = null;

    // Build chart options from toggle states
    const chartDataOptions = {
      includeExtendedHours: this.showExtendedHours(),
      adjustForDividends: this.showDividendsReinvested(),
      includeRawData: this.showRawData(),
    };

    // Use ChartDataService for progressive loading
    this.subscriptions.add(
      this.chartDataService.loadChartData(symbol, backendInterval, undefined, fqn, chartDataOptions).subscribe({
        next: (result) => {
          console.log('[WatchlistTab] Received chart data:', {
            candles: result.candles.length,
            symbol,
            interval: backendInterval,
            hasOlderData: result.pageInfo.hasOlderData,
            endCursor: result.pageInfo.endCursor?.substring(0, 20) + '...',
            totalCount: result.totalCount,
          });
          if (result.candles.length > 0) {
            this.rawCandleData.set(result.candles);
            this.chartPageInfo.set(result.pageInfo);
            this.hasOlderData.set(result.pageInfo.hasOlderData);
            this.buildChartFromCandles(result.candles, symbol);
            this.chartLoading.set(false);

            // Also refresh quote data if not already loaded
            if (!this.quoteData()) {
              console.log('[WatchlistTab] Chart loaded but no quote data, fetching quote for:', symbol);
              this.fetchQuoteForSymbol(symbol);
            }
          } else {
            // No data returned - trigger fetch via CHART command
            console.log('[WatchlistTab] No data, triggering fetch via CHART command');
            this.triggerDataFetchAndPoll(symbol, backendInterval, fqn);
          }
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
   * Trigger data fetch via CHART command and poll for results
   * Called when stockPriceConnection returns no data (backend needs to fetch)
   */
  private triggerDataFetchAndPoll(symbol: string, interval: ChartInterval, fqn: string): void {
    // Show user-friendly loading message
    this.chartError.set(`Loading chart data...`);
    // Store technical details for de-emphasized display
    this.chartLoadingDetails.set(`Requesting ${this.formatInterval(interval.toLowerCase())} data for ${symbol}`);

    // Execute CHART command to trigger backend fetch
    const command = `${fqn} COMMAND:CHART -interval ${interval.toLowerCase()}`;
    console.log('[WatchlistTab] Triggering fetch:', command);

    // Subscribe to command result before executing
    const resultSubscription = this.terminalWsService.onCommandResult
      .pipe(
        // Take only the first result (for this command)
        take(1),
      )
      .subscribe({
        next: (result: CommandResult) => {
          console.log('[WatchlistTab] Fetch command result:', result);

          // Check if the result indicates data is being fetched
          const message = result?.message || '';
          const metadata = result?.metadata;
          let jobId: string | undefined;

          // Check for jobId in metadata (using bracket notation for index signature)
          if (metadata?.['jobId']) {
            jobId = metadata['jobId'] as string;
          }

          // If we have chartOptions, the data is ready - use it directly
          if (result?.chartOptions) {
            console.log('[WatchlistTab] Data returned from CHART command');
            this.chartLoadingDetails.set(null);
            this.handleChartCommandResult(result);
            return;
          }

          // If we have a jobId, subscribe to job completion instead of polling
          if (jobId) {
            console.log('[WatchlistTab] Waiting for job completion:', jobId);
            this.chartLoadingDetails.set(`Fetching data from market provider...`);
            this.waitForJobAndLoadData(jobId, symbol, interval, fqn);
            return;
          }

          // Detect if backend returned mismatched interval (daily when we requested intraday)
          const isMismatchedInterval =
            message.includes('Changed interval') ||
            message.includes('interval from') ||
            (message.includes('daily') && this.isIntradayInterval(interval));

          if (isMismatchedInterval || message.includes('Fetching') || message.includes('fetching')) {
            console.log('[WatchlistTab] Data fetch in progress, starting poll');
            this.chartError.set(`Loading chart data...`);
            this.chartLoadingDetails.set(`Fetching ${this.formatInterval(interval.toLowerCase())} data...`);
            // Fallback to polling if no jobId (shouldn't happen normally)
            this.pollForChartData(symbol, interval, fqn, 8, 2000);
          } else {
            this.chartError.set('No data available for this symbol and interval');
            this.chartLoadingDetails.set(null);
            this.chartLoading.set(false);
          }
        },
        error: (err: Error) => {
          console.error('[WatchlistTab] Fetch command failed:', err);
          this.chartError.set('Failed to fetch chart data');
          this.chartLoadingDetails.set(null);
          this.chartLoading.set(false);
        },
      });

    this.subscriptions.add(resultSubscription);

    // Execute the command
    this.terminalWsService.execute(command);
  }

  /**
   * Wait for a specific job to complete, then load chart data
   * Uses WebSocket job subscription instead of polling
   */
  private waitForJobAndLoadData(jobId: string, symbol: string, interval: ChartInterval, fqn: string): void {
    // Set a timeout in case job never completes
    const timeout = setTimeout(() => {
      console.warn('[WatchlistTab] Job timeout, falling back to data query');
      this.loadChartDataAfterFetch(symbol, interval, fqn);
    }, 30000); // 30 second timeout

    // Subscribe to job completion
    const jobSub = this.jobsWsService.jobCompleted$
      .pipe(
        filter((job) => job.uuid === jobId),
        take(1),
      )
      .subscribe({
        next: (job) => {
          clearTimeout(timeout);
          console.log('[WatchlistTab] Job completed:', job.uuid);
          this.loadChartDataAfterFetch(symbol, interval, fqn);
        },
      });

    // Also subscribe to job failure
    const failSub = this.jobsWsService.jobFailed$
      .pipe(
        filter((job) => job.uuid === jobId),
        take(1),
      )
      .subscribe({
        next: (job) => {
          clearTimeout(timeout);
          console.error('[WatchlistTab] Job failed:', job.uuid, job.error);
          this.chartError.set(`Failed to fetch data: ${job.error || 'Unknown error'}`);
          this.chartLoadingDetails.set(null);
          this.chartLoading.set(false);
        },
      });

    this.subscriptions.add(jobSub);
    this.subscriptions.add(failSub);
  }

  /**
   * Load chart data after a fetch job has completed
   */
  private loadChartDataAfterFetch(symbol: string, interval: ChartInterval, fqn: string): void {
    // Check if symbol is still selected
    if (this.selectedSymbol() !== symbol) {
      console.log('[WatchlistTab] Symbol changed, not loading data');
      return;
    }

    const chartDataOptions = {
      includeExtendedHours: this.showExtendedHours(),
      adjustForDividends: this.showDividendsReinvested(),
      includeRawData: this.showRawData(),
    };

    this.subscriptions.add(
      this.chartDataService.loadChartData(symbol, interval, undefined, fqn, chartDataOptions).subscribe({
        next: (result) => {
          if (result.candles.length > 0) {
            console.log('[WatchlistTab] Data loaded after fetch:', result.candles.length, 'candles');
            this.rawCandleData.set(result.candles);
            this.chartPageInfo.set(result.pageInfo);
            this.hasOlderData.set(result.pageInfo.hasOlderData);
            this.chartError.set(null);
            this.chartLoadingDetails.set(null);
            this.buildChartFromCandles(result.candles, symbol);
            this.chartLoading.set(false);
          } else {
            this.chartError.set('No data available after fetch completed');
            this.chartLoadingDetails.set(null);
            this.chartLoading.set(false);
          }
        },
        error: (err) => {
          console.error('[WatchlistTab] Failed to load data after fetch:', err);
          this.chartError.set('Failed to load chart data');
          this.chartLoadingDetails.set(null);
          this.chartLoading.set(false);
        },
      }),
    );
  }

  /**
   * Check if an interval is intraday (less than daily)
   */
  private isIntradayInterval(interval: ChartInterval | string): boolean {
    const lower = interval.toLowerCase();
    return (
      lower.includes('min') ||
      lower.includes('hour') ||
      lower === '60min' ||
      lower === 'min_1' ||
      lower === 'min_5' ||
      lower === 'min_15' ||
      lower === 'min_30' ||
      lower === 'min_60'
    );
  }

  /**
   * Poll for chart data after fetch has been triggered (fallback if no jobId)
   */
  private pollForChartData(
    symbol: string,
    interval: ChartInterval,
    fqn: string,
    retriesLeft: number,
    delayMs: number,
  ): void {
    if (retriesLeft <= 0) {
      this.chartError.set('Data fetch timed out. Please try again later.');
      this.chartLoadingDetails.set(null);
      this.chartLoading.set(false);
      return;
    }

    console.log('[WatchlistTab] Polling for data, retries left:', retriesLeft);
    // Update loading details with retry count
    this.chartLoadingDetails.set(`Waiting for data... (attempt ${9 - retriesLeft}/8)`);

    setTimeout(() => {
      // Check if component is still expecting this data
      if (this.selectedSymbol() !== symbol) {
        console.log('[WatchlistTab] Symbol changed, stopping poll');
        this.chartLoadingDetails.set(null);
        return;
      }

      // Build chart options from toggle states
      const chartDataOptions = {
        includeExtendedHours: this.showExtendedHours(),
        adjustForDividends: this.showDividendsReinvested(),
        includeRawData: this.showRawData(),
      };

      this.subscriptions.add(
        this.chartDataService.loadChartData(symbol, interval, undefined, fqn, chartDataOptions).subscribe({
          next: (result) => {
            if (result.candles.length > 0) {
              console.log('[WatchlistTab] Poll successful, got', result.candles.length, 'candles');
              this.rawCandleData.set(result.candles);
              this.chartPageInfo.set(result.pageInfo);
              this.hasOlderData.set(result.pageInfo.hasOlderData);
              this.chartError.set(null);
              this.chartLoadingDetails.set(null);
              this.buildChartFromCandles(result.candles, symbol);
              this.chartLoading.set(false);
            } else {
              // Still no data, continue polling
              console.log('[WatchlistTab] Still no data, continuing poll');
              this.pollForChartData(symbol, interval, fqn, retriesLeft - 1, delayMs);
            }
          },
          error: () => {
            // Error polling, continue anyway
            this.pollForChartData(symbol, interval, fqn, retriesLeft - 1, delayMs);
          },
        }),
      );
    }, delayMs);
  }

  /**
   * Handle chart data returned from CHART command result
   */
  private handleChartCommandResult(result: CommandResult): void {
    const chartOptions = result?.chartOptions;
    // If chartOptions is a string, parse it
    const options = typeof chartOptions === 'string' ? JSON.parse(chartOptions) : chartOptions;

    if (options?.series) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candleSeries = options.series.find((s: any) => s.type === 'candlestick');
      if (candleSeries?.data?.length > 0) {
        // Extract candle data from chart options
        // Note: This is a fallback - normally we use stockPriceConnection
        console.log('[WatchlistTab] Using chart data from command result');
        this.chartOptions.set(options);
        this.chartError.set(null);
        this.chartLoading.set(false);
        return;
      }
    }
    this.chartError.set('No data available for this symbol and interval');
    this.chartLoading.set(false);
  }

  /**
   * Sync selectedInterval with available options (case-insensitive matching)
   * This ensures the dropdown shows the correct selected value
   */
  private syncSelectedIntervalWithOptions(interval: string): void {
    const options = this.intervalOptions();
    const lowerInterval = interval.toLowerCase();

    console.log('[WatchlistTab] syncSelectedIntervalWithOptions:', {
      inputInterval: interval,
      options,
      lowerInterval,
    });

    // Find matching option (case-insensitive)
    const matchingOption = options.find((opt) => opt.toLowerCase() === lowerInterval);

    if (matchingOption && matchingOption !== interval) {
      // Update to match the exact case in options
      console.log('[WatchlistTab] Syncing interval from', interval, 'to', matchingOption);
      this.selectedInterval.set(matchingOption);
    } else if (!matchingOption) {
      // If no match found, try to find by normalized name
      const normalized = this.normalizeIntervalName(interval);
      const normalizedMatch = options.find((opt) => this.normalizeIntervalName(opt) === normalized);
      if (normalizedMatch) {
        console.log('[WatchlistTab] Syncing interval via normalization from', interval, 'to', normalizedMatch);
        this.selectedInterval.set(normalizedMatch);
      } else {
        console.warn('[WatchlistTab] No matching interval option found for:', interval, 'in options:', options);
      }
    }
  }

  /**
   * Normalize interval name for comparison (handles various formats)
   */
  private normalizeIntervalName(interval: string): string {
    const lower = interval.toLowerCase();
    // Map various formats to canonical names
    const mappings: Record<string, string> = {
      min_1: '1min',
      min_5: '5min',
      min_15: '15min',
      min_30: '30min',
      min_60: '60min',
      hourly: '60min',
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '60m': '60min',
      '1h': '60min',
      d: 'daily',
      w: 'weekly',
      m: 'monthly',
    };
    return mappings[lower] || lower;
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
    const mapped = intervalMap[interval];
    if (!mapped) {
      console.warn('[WatchlistTab] ⚠️ Unrecognized interval, defaulting to DAILY:', interval);
      return 'DAILY';
    }
    return mapped;
  }

  /**
   * Build ECharts options from candle data using ChartConfigService.
   * This ensures all charts (from command or progressive loading) look identical.
   */
  private buildChartFromCandles(candles: ChartCandle[], symbol: string): void {
    const interval = this.selectedInterval();
    const showCorporateActions = this.showCorporateActions();
    const lockToRight = this.lockToRight();
    const showExtendedHours = this.showExtendedHours();

    console.log('[WatchlistTab] buildChartFromCandles:', {
      symbol,
      interval,
      candleCount: candles.length,
      showCorporateActions,
      lockToRight,
      showExtendedHours,
    });

    // Use ChartConfigService for consistent chart building and theming
    const options = this.chartConfigService.buildChartFromCandles(candles, symbol, interval, {
      showCorporateActions,
      lockToRight,
      showVolume: true, // Always show volume when data is available
      showExtendedHoursBackground: showExtendedHours, // Show gray background when extended hours enabled
    });
    this.chartOptions.set(options);
  }

  /**
   * Format period for display - delegate to ChartConfigService
   */
  formatPeriod(period: string): string {
    return this.chartConfigService.formatPeriod(period);
  }

  /**
   * Format interval for display - delegate to ChartConfigService
   */
  formatInterval(interval: string): string {
    return this.chartConfigService.formatInterval(interval);
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
   * Format date for OHLC display (human-friendly with time)
   * Respects the showLocalTime setting for timezone display
   */
  formatCrosshairDate(dateStr: string): string {
    if (!dateStr) return '';

    const useLocalTime = this.showLocalTime();

    // Check if this is intraday data (has meaningful time component)
    const interval = this.selectedInterval().toLowerCase();
    const isIntraday = interval.includes('min') || interval.includes('hour') || interval === '60min';

    if (isIntraday) {
      // For intraday, parse as Date and apply timezone
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      if (useLocalTime) {
        // Local time
        return date.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } else {
        // EST/ET (Eastern Time)
        return (
          date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/New_York',
          }) + ' ET'
        );
      }
    } else {
      // Daily/Weekly/Monthly - extract date portion from ISO string to avoid timezone shift
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        // Create date at noon UTC to avoid any DST issues
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC', // Use UTC to match the date we extracted
        });
      }
      // Fallback to original parsing if not ISO format
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
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
    const newValue = this.showLocalTime();
    console.log(
      '[WatchlistTab] toggleLocalTime:',
      JSON.stringify({
        showLocalTime: newValue,
        chartConfigValueBefore: this.chartConfigService.useLocalTime(),
      }),
    );
    // Sync with chartConfigService for axis label formatting
    this.chartConfigService.useLocalTime.set(newValue);
    console.log(
      '[WatchlistTab] After sync:',
      JSON.stringify({ chartConfigValue: this.chartConfigService.useLocalTime() }),
    );
    // Re-render chart with new time zone setting
    this.rebuildChartForTimezone();
    // Persist setting - note: useExchangeTime is the inverse of showLocalTime
    this.saveChartPreference('useExchangeTime', !newValue);
  }

  /**
   * Rebuild the chart to apply new timezone setting.
   * This updates the axis labels without re-fetching data.
   * Uses notMerge: true to force complete re-render of axis labels.
   */
  private rebuildChartForTimezone(): void {
    const candles = this.rawCandleData();
    const symbol = this.selectedSymbol();
    if (!candles.length || !symbol) return;

    // Force chart re-render: clear instance first, then rebuild
    // This ensures the axis formatters are completely recreated
    if (this.chartInstance) {
      this.chartInstance.clear();
    }

    // Rebuild chart options with current data (axis formatters will use new timezone)
    this.buildChartFromCandles(candles, symbol);

    // Force complete re-render with notMerge to ensure axis formatters are recreated
    const options = this.chartOptions();
    if (this.chartInstance && options) {
      this.chartInstance.setOption(options, { notMerge: true, replaceMerge: ['xAxis', 'yAxis', 'series'] });
    }
  }

  toggleExtendedHours(): void {
    this.showExtendedHours.update((v) => !v);
    // Persist setting
    this.saveChartPreference('showExtendedHours', this.showExtendedHours());
    // Re-fetch chart data with new setting
    this.reloadChartWithCurrentSettings();
  }

  toggleDividendsReinvested(): void {
    this.showDividendsReinvested.update((v) => !v);
    // Persist setting
    this.saveChartPreference('adjustForDividends', this.showDividendsReinvested());
    // Re-fetch chart data with total return view
    this.reloadChartWithCurrentSettings();
  }

  toggleRawData(): void {
    this.showRawData.update((v) => !v);
    // Persist setting
    this.saveChartPreference('showRawData', this.showRawData());
    // Re-fetch chart data with raw/sanitized toggle
    this.reloadChartWithCurrentSettings();
  }

  toggleCorporateActions(): void {
    this.showCorporateActions.update((v) => !v);
    // Persist setting
    this.saveChartPreference('showCorporateActions', this.showCorporateActions());
    // Rebuild chart with/without corporate action markers
    const candles = this.rawCandleData();
    const symbol = this.selectedSymbol();
    if (candles.length && symbol) {
      this.buildChartFromCandles(candles, symbol);
    }
  }

  /**
   * Reload chart with current toggle settings
   */
  private reloadChartWithCurrentSettings(): void {
    const symbol = this.selectedSymbol();
    if (symbol) {
      this.loadChartWithOptions(symbol);
    }
  }

  toggleLockToRight(): void {
    this.lockToRight.update((v) => !v);
    // Persist setting
    this.saveChartPreference('lockToRight', this.lockToRight());

    // Rebuild the chart with the new lock setting
    // This updates the dataZoom config (rangeMode, endValue, moveOnMouseMove)
    const candles = this.rawCandleData();
    const symbol = this.selectedSymbol();
    if (candles.length && symbol) {
      this.buildChartFromCandles(candles, symbol);
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
    if (quote.previousClose !== undefined) {
      lines.push(`Prev Close: ${this.formatPrice(quote.previousClose)}`);
    }
    if (quote.volume !== undefined) {
      lines.push(`Volume: ${this.formatVolume(quote.volume)}`);
    }
    if (quote.timestamp) {
      lines.push(`As of: ${this.formatQuoteTimestamp(quote.timestamp)}`);
    }

    return lines.length > 0 ? lines.join('\n') : 'Quote data';
  }

  /**
   * Format quote timestamp respecting the showLocalTime setting
   * When showLocalTime is true: Display in user's local timezone
   * When showLocalTime is false: Display in Eastern Time (exchange time)
   */
  formatQuoteTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const useLocalTime = this.showLocalTime();

    if (useLocalTime) {
      // Display in user's local time with timezone abbreviation
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      });
    } else {
      // Display in Eastern Time with "ET" suffix
      return (
        date.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) + ' ET'
      );
    }
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

  /**
   * Get a compact tooltip for a watchlist symbol item
   */
  getSymbolTooltip(item: SymbolListItem): string {
    const lines: string[] = [];

    if (item.displayName && item.displayName !== item.symbol) {
      lines.push(item.displayName);
    }
    if (item.exchange) {
      lines.push(`Exchange: ${item.exchange}`);
    }
    if (item.assetType && item.assetType !== 'Stock') {
      lines.push(`Type: ${item.assetType}`);
    }
    if (item.sector) {
      lines.push(`Sector: ${item.sector}`);
    }
    if (item.industry) {
      lines.push(`Industry: ${item.industry}`);
    }
    if (item.marketCap) {
      lines.push(`Market Cap: ${this.formatMarketCap(item.marketCap)}`);
    }

    return lines.join('\n');
  }

  /**
   * Update displayed columns based on user selection
   */
  updateWatchlistColumns(): void {
    const selectedColumns = this.watchlistColumns.filter((col) => col.selected).map((col) => col.id);
    // Include select column when in selection mode
    if (this.selectionMode()) {
      this.displayedWatchlistColumns = ['select', 'actions', ...selectedColumns];
    } else {
      this.displayedWatchlistColumns = ['actions', ...selectedColumns];
    }
  }

  /**
   * Navigate to a system watchlist (sector, industry, exchange)
   */
  navigateToSystemWatchlist(type: 'sector' | 'industry' | 'exchange', value: string): void {
    console.log(`[WatchlistTab] Navigating to ${type}: ${value}`);
    // Update the selected watchlist ID to the system category
    const newId = `${type}:${value}`;
    this.onWatchlistChange(newId);
  }

  /**
   * Check if an error message indicates data is being fetched (loading state)
   * Used in template to show spinner instead of error icon
   */
  isDataFetchingMessage(message: string | null): boolean {
    if (!message) return false;
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('fetching') || lowerMessage.includes('loading') || lowerMessage.includes('please wait')
    );
  }

  // Resize handle methods
  onResizeStart(event: MouseEvent): void {
    console.time('[Resize] Total drag session');
    console.log('[Resize] START - clientX:', event.clientX);
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.sidebarWidth();
    event.preventDefault();

    // Add event listeners to document for smooth dragging
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private resizeMoveCount = 0;

  private onResizeMove = (event: MouseEvent): void => {
    if (!this.isResizing) return;

    this.resizeMoveCount++;

    // Throttle updates using requestAnimationFrame
    if (this.pendingResizeFrame !== null) {
      return;
    }

    this.pendingResizeFrame = requestAnimationFrame(() => {
      this.pendingResizeFrame = null;

      // Calculate the new width
      const deltaX = event.clientX - this.resizeStartX;
      let newWidth = this.resizeStartWidth + deltaX;

      // Constrain width between min and max
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.5; // Max 50% of viewport
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

      // Using signal.set() triggers change detection in OnPush components
      this.sidebarWidth.set(newWidth);
    });
  };

  private onResizeEnd = (): void => {
    console.log('[Resize] END - total moves:', this.resizeMoveCount);
    console.timeEnd('[Resize] Total drag session');
    this.resizeMoveCount = 0;
    this.isResizing = false;
    if (this.pendingResizeFrame !== null) {
      cancelAnimationFrame(this.pendingResizeFrame);
      this.pendingResizeFrame = null;
    }
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  };
}
