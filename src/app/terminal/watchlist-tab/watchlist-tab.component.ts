// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { Subscription } from 'rxjs';
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
import { WatchlistService } from '../watchlist.service';
import { TerminalService } from '../terminal.service';
import { TerminalWebSocketService } from '../terminal-websocket.service';
import { CommandResult } from '../terminal.types';

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
    NgxEchartsDirective,
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

  // Chart controls
  selectedPeriod = signal('1Y');
  selectedInterval = signal('daily');
  periodOptions = ['1D', '5D', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
  intervalOptions = ['1min', '5min', '15min', '30min', '60min', 'daily', 'weekly', 'monthly'];

  // Create watchlist form
  newWatchlistName = '';
  newWatchlistDescription = '';
  showCreateForm = signal(false);

  // Add symbol form
  newSymbolInput = '';
  showAddSymbolForm = signal(false);

  private subscriptions = new Subscription();

  // Computed: get symbols for current selection
  currentSymbols = computed<SymbolListItem[]>(() => {
    const watchlistId = this.selectedWatchlistId();

    if (watchlistId === 'recent') {
      const recentSymbols = this.watchlistService.recentSymbols() || [];
      return recentSymbols.map((item) => ({
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

    // Find the watchlist by uuid
    const searchHistory = this.watchlistService.searchHistory();
    if (searchHistory && searchHistory.uuid === watchlistId) {
      return (searchHistory.items || []).map((item) => ({
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

    const customWatchlists = this.watchlistService.customWatchlists() || [];
    const customList = customWatchlists.find((wl) => wl.uuid === watchlistId);
    if (customList) {
      return (customList.items || []).map((item) => ({
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

    return [];
  });

  /**
   * Check if current watchlist allows adding symbols
   */
  canAddToWatchlist = computed<boolean>(() => {
    const id = this.selectedWatchlistId();
    // Can't add to recent (auto-populated) but can add to search history and custom
    return id !== 'recent';
  });

  /**
   * Check if current watchlist allows removing symbols
   */
  canRemoveFromWatchlist = computed<boolean>(() => {
    // Can remove from any watchlist
    return true;
  });

  constructor(
    protected watchlistService: WatchlistService,
    protected terminalService: TerminalService,
    private terminalWsService: TerminalWebSocketService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.subscribeToCommandResults();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load initial data
   */
  loadData(): void {
    this.loading.set(true);

    // Load search history
    this.subscriptions.add(
      this.watchlistService.loadSearchHistory().subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
      }),
    );

    // Load custom watchlists
    this.subscriptions.add(this.watchlistService.loadWatchlists().subscribe());

    // Load recent symbols
    this.subscriptions.add(this.watchlistService.loadRecentSymbols(20).subscribe());
  }

  /**
   * Subscribe to command results from terminal to update chart
   */
  private subscribeToCommandResults(): void {
    this.subscriptions.add(
      this.terminalWsService.onCommandResult.subscribe((result: CommandResult) => {
        if (!result) return;

        // Get symbol from metadata - try multiple access patterns
        const resultSymbol = result.metadata?.symbol as string | undefined;
        const selectedSym = this.selectedSymbol();

        // Check if this result is for our selected symbol
        if (resultSymbol && selectedSym && resultSymbol.toUpperCase() === selectedSym.toUpperCase()) {
          this.chartLoading.set(false);

          if (result.success && result.chartOptions) {
            this.chartOptions.set(result.chartOptions as EChartsOption);
            this.chartError.set(null);
          } else if (result.success && result.outputType === 'chart' && !result.chartOptions) {
            // Chart result but no options - might be fetching
            this.chartError.set('Chart data is loading...');
          } else if (!result.success) {
            this.chartError.set(result.message || 'Failed to load chart');
            this.chartOptions.set(null);
          }
        } else if (this.chartLoading() && result.outputType === 'chart' && result.chartOptions) {
          // Fallback: if we're loading a chart and this result has chart options, use it
          // This handles cases where symbol matching might fail due to case or format differences
          this.chartLoading.set(false);
          this.chartOptions.set(result.chartOptions as EChartsOption);
          this.chartError.set(null);
        }
      }),
    );
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
  }

  /**
   * Select a symbol and load its chart
   */
  selectSymbol(item: SymbolListItem): void {
    this.selectedSymbol.set(item.symbol);
    this.selectedItem.set(item);
    this.chartError.set(null);

    // Load chart with default command
    this.loadChart(item.symbol, this.currentCommand());
  }

  /**
   * Load chart for symbol
   */
  private loadChart(symbol: string, command: string): void {
    console.debug('[WatchlistTab] Loading chart:', { symbol, command });
    this.chartLoading.set(true);
    this.chartOptions.set(null);
    this.chartError.set(null);
    this.currentCommand.set(command);

    // For GP command, include period and interval
    let fullCommand = `${symbol} ${command}`;
    if (command === 'GP') {
      const period = this.selectedPeriod();
      const interval = this.selectedInterval();
      fullCommand = `${symbol} GP -period ${period} -interval ${interval}`;
    }

    console.debug('[WatchlistTab] Executing command:', fullCommand);
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
   * Toggle add symbol form
   */
  toggleAddSymbolForm(): void {
    this.showAddSymbolForm.update((v) => !v);
    if (!this.showAddSymbolForm()) {
      this.newSymbolInput = '';
    }
  }

  /**
   * Add a symbol to the current watchlist
   */
  addSymbol(): void {
    const symbol = this.newSymbolInput.trim().toUpperCase();
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

    this.subscriptions.add(
      this.watchlistService.addToWatchlist(symbol, targetId).subscribe({
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
      '1M': '1 Month',
      '3M': '3 Months',
      '6M': '6 Months',
      '1Y': '1 Year',
      '2Y': '2 Years',
      '5Y': '5 Years',
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
   * Get chip color class for exchange
   */
  getExchangeClass(): string {
    return 'chip-exchange';
  }

  /**
   * Get chip color class for sector
   */
  getSectorClass(): string {
    return 'chip-sector';
  }

  /**
   * Get chip color class for industry
   */
  getIndustryClass(): string {
    return 'chip-industry';
  }
}
