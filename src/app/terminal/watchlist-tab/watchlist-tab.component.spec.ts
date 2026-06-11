// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { WatchlistTabComponent } from './watchlist-tab.component';
import { Sort } from '@angular/material/sort';
import { MessageService } from '../../message.service';
import { TerminalRoutingService } from '../terminal-routing.service';
import { TerminalService } from '../terminal.service';
import { TerminalWebSocketService } from '../terminal-websocket.service';
import { StockListing, WatchlistService } from '../watchlist.service';
import { ChartPreferencesService } from '../chart-preferences.service';
import { JobsWebSocketService } from '../../jobs/jobs-websocket.service';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-helpers';
import { signal } from '@angular/core';
import { CommandResult, SymbolUpdate } from '../terminal.types';

// Mock SymbolListItem interface to match the component's internal interface
interface MockSymbolListItem {
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

describe('WatchlistTabComponent', () => {
  let component: WatchlistTabComponent;
  let fixture: ComponentFixture<WatchlistTabComponent>;
  let mockRoutingService: jasmine.SpyObj<TerminalRoutingService>;
  let mockTerminalService: jasmine.SpyObj<TerminalService>;
  let mockTerminalWsService: jasmine.SpyObj<TerminalWebSocketService>;
  let mockWatchlistService: jasmine.SpyObj<WatchlistService>;
  let mockChartPreferencesService: jasmine.SpyObj<ChartPreferencesService>;
  let mockJobsWsService: jasmine.SpyObj<JobsWebSocketService>;
  let queryParamsSubject: Subject<Record<string, string>>;
  let commandResultSubject: Subject<CommandResult>;
  let symbolUpdateSubject: Subject<SymbolUpdate>;
  let jobCreatedSubject: Subject<{ uuid: string; kind: string }>;
  let jobCompletedSubject: Subject<{ uuid: string }>;
  let jobFailedSubject: Subject<{ uuid: string }>;

  beforeEach(async () => {
    queryParamsSubject = new Subject<Record<string, string>>();
    commandResultSubject = new Subject<CommandResult>();
    symbolUpdateSubject = new Subject<SymbolUpdate>();
    jobCreatedSubject = new Subject<{ uuid: string; kind: string }>();
    jobCompletedSubject = new Subject<{ uuid: string }>();
    jobFailedSubject = new Subject<{ uuid: string }>();

    mockRoutingService = jasmine.createSpyObj('TerminalRoutingService', ['applyRoute', 'state', 'setInterval'], {
      symbol: jasmine.createSpy().and.returnValue(null),
      exchange: jasmine.createSpy().and.returnValue(null),
      interval: jasmine.createSpy().and.returnValue('daily'),
      tab: jasmine.createSpy().and.returnValue('watchlists'),
    });
    mockRoutingService.state.and.returnValue({
      tab: 'watchlists',
      symbol: null,
      exchange: null,
      view: 'chart',
      interval: 'daily',
      period: '1Y',
      watchlistId: 'recent',
      dashboardId: null,
      listCollapsed: false,
      detailCollapsed: false,
    });
    mockRoutingService.applyRoute.and.returnValue(null);

    mockTerminalService = jasmine.createSpyObj(
      'TerminalService',
      ['execute', 'subscribeSymbols', 'unsubscribeSymbols', 'fetchQuote'],
      {
        onSymbolUpdate: symbolUpdateSubject.asObservable(),
      },
    );
    mockTerminalService.fetchQuote.and.returnValue(of(null));

    mockTerminalWsService = jasmine.createSpyObj('TerminalWebSocketService', ['connect', 'disconnect', 'send'], {
      onCommandResult: commandResultSubject.asObservable(),
      onSymbolUpdate: symbolUpdateSubject.asObservable(),
      onJobCreated: jobCreatedSubject.asObservable(),
      onJobCompleted: jobCompletedSubject.asObservable(),
      onJobFailed: jobFailedSubject.asObservable(),
      isConnected: signal(false),
    });

    mockWatchlistService = jasmine.createSpyObj(
      'WatchlistService',
      [
        'loadWatchlists',
        'loadRecentSymbols',
        'loadSearchHistory',
        'searchStockListings',
        'loadGicsSectors',
        'loadGicsIndustries',
        'loadExchanges',
        'addToWatchlist',
      ],
      {
        searchHistory: signal(null),
        customWatchlists: signal([]),
        recentSymbols: signal([]),
        gicsIndustries: signal([]),
        exchanges: signal([]),
        gicsSectors: signal([]),
      },
    );
    mockWatchlistService.loadWatchlists.and.returnValue(of([]));
    mockWatchlistService.loadRecentSymbols.and.returnValue(of([]));
    mockWatchlistService.loadSearchHistory.and.returnValue(of(null));
    mockWatchlistService.searchStockListings.and.returnValue(of([]));
    mockWatchlistService.loadGicsSectors.and.returnValue(of([]));
    mockWatchlistService.loadGicsIndustries.and.returnValue(of([]));
    mockWatchlistService.loadExchanges.and.returnValue(of([]));
    mockWatchlistService.addToWatchlist.and.returnValue(of({ success: true, message: 'Added' }));

    mockChartPreferencesService = jasmine.createSpyObj(
      'ChartPreferencesService',
      ['loadPreferences', 'updatePreference'],
      {
        preferences: signal({
          showExtendedHours: false,
          adjustForDividends: false,
          showRawData: false,
          showCorporateActions: true,
          defaultInterval: 'daily',
          lockToRight: true,
          useExchangeTime: true,
        }),
      },
    );
    mockChartPreferencesService.loadPreferences.and.returnValue(
      of({
        showExtendedHours: false,
        adjustForDividends: false,
        showRawData: false,
        showCorporateActions: true,
        defaultInterval: 'daily',
        lockToRight: true,
        useExchangeTime: true,
      }),
    );
    mockChartPreferencesService.updatePreference.and.returnValue(
      of({
        showExtendedHours: false,
        adjustForDividends: false,
        showRawData: false,
        showCorporateActions: true,
        defaultInterval: 'daily',
        lockToRight: true,
        useExchangeTime: true,
      }),
    );

    mockJobsWsService = jasmine.createSpyObj('JobsWebSocketService', ['connect'], {
      jobs$: of([]),
      isConnected: signal(false),
    });

    const mockActivatedRoute = {
      snapshot: { queryParams: {} },
      queryParams: queryParamsSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [WatchlistTabComponent, NoopAnimationsModule],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: TerminalRoutingService, useValue: mockRoutingService },
        { provide: TerminalService, useValue: mockTerminalService },
        { provide: TerminalWebSocketService, useValue: mockTerminalWsService },
        { provide: WatchlistService, useValue: mockWatchlistService },
        { provide: ChartPreferencesService, useValue: mockChartPreferencesService },
        { provide: JobsWebSocketService, useValue: mockJobsWsService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WatchlistTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    queryParamsSubject.complete();
    commandResultSubject.complete();
    symbolUpdateSubject.complete();
    jobCreatedSubject.complete();
    jobCompletedSubject.complete();
    jobFailedSubject.complete();
  });

  describe('basic functionality', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have initial loading state as false', () => {
      expect(component.loading()).toBeFalse();
    });

    it('should return symbol actions with proper commands', () => {
      const actions = component.symbolActions;
      expect(actions.length).toBe(6);
      expect(actions[0].command).toBe('CHART');
      expect(actions[1].command).toBe('FINANCIALS');
      expect(actions[4].command).toBe('HP');
    });

    it('should return correct asset icons', () => {
      expect(component.getAssetIcon('ETF')).toBe('account_balance');
      expect(component.getAssetIcon('CRYPTO')).toBe('currency_bitcoin');
      expect(component.getAssetIcon('STOCK')).toBe('trending_up');
    });

    it('should return correct watchlist icons', () => {
      expect(component.getWatchlistIcon('SEARCH_HISTORY')).toBe('history');
      expect(component.getWatchlistIcon('FAVORITES')).toBe('star');
      expect(component.getWatchlistIcon('CUSTOM')).toBe('list');
    });
  });

  describe('selectSymbol', () => {
    it('should set selected symbol', () => {
      const item: MockSymbolListItem = { symbol: 'TSLA', exchange: 'NASDAQ' };

      component.selectSymbol(item as Parameters<typeof component.selectSymbol>[0]);

      expect(component.selectedSymbol()).toBe('TSLA');
    });

    it('should execute CHART command', () => {
      const item: MockSymbolListItem = { symbol: 'META', exchange: 'NASDAQ' };

      component.selectSymbol(item as Parameters<typeof component.selectSymbol>[0]);

      expect(mockTerminalService.execute).toHaveBeenCalled();
      const command = mockTerminalService.execute.calls.mostRecent().args[0];
      expect(command).toContain('STOCK:NASDAQ:META');
      expect(command).toContain('COMMAND:CHART');
    });

    it('should subscribe to real-time updates', () => {
      const item: MockSymbolListItem = { symbol: 'AMZN', exchange: 'NASDAQ' };

      component.selectSymbol(item as Parameters<typeof component.selectSymbol>[0]);

      expect(mockTerminalService.subscribeSymbols).toHaveBeenCalledWith(['AMZN']);
    });

    it('should unsubscribe from previous symbol', () => {
      component.selectedSymbol.set('AAPL');

      const item: MockSymbolListItem = { symbol: 'MSFT', exchange: 'NASDAQ' };
      component.selectSymbol(item as Parameters<typeof component.selectSymbol>[0]);

      expect(mockTerminalService.unsubscribeSymbols).toHaveBeenCalledWith(['AAPL']);
    });
  });

  describe('interval handling', () => {
    it('should map frontend interval to backend format', () => {
      component.selectedInterval.set('30min');

      const item: MockSymbolListItem = { symbol: 'INTC', exchange: 'NASDAQ' };
      component.selectSymbol(item as Parameters<typeof component.selectSymbol>[0]);

      const command = mockTerminalService.execute.calls.mostRecent().args[0];
      expect(command).toContain('-interval min_30');
    });

    it('should handle daily interval', () => {
      component.selectedInterval.set('daily');

      const item: MockSymbolListItem = { symbol: 'ORCL', exchange: 'NYSE' };
      component.selectSymbol(item as Parameters<typeof component.selectSymbol>[0]);

      const command = mockTerminalService.execute.calls.mostRecent().args[0];
      expect(command).toContain('-interval daily');
    });
  });

  describe('route changes subscription (browser back/forward)', () => {
    // The component uses `skip(1)` on route.queryParams to ignore the initial
    // emission (handled by restoreStateFromUrl). Tests must emit once to
    // consume the skip, then emit again to exercise the subscription.

    it('should reload chart when route params change', fakeAsync(() => {
      // Initial state - no symbol
      expect(component.selectedSymbol()).toBeNull();

      // Consume the skip(1) with an initial empty emission
      queryParamsSubject.next({});
      tick();

      mockRoutingService.applyRoute.calls.reset();
      mockTerminalService.execute.calls.reset();

      // Simulate browser navigation (back/forward)
      queryParamsSubject.next({
        symbol: 'GOOGL',
        exchange: 'NASDAQ',
        interval: 'weekly',
      });
      tick();

      // Should have called routing service
      expect(mockRoutingService.applyRoute).toHaveBeenCalledWith(
        jasmine.objectContaining({
          symbol: 'GOOGL',
          exchange: 'NASDAQ',
          interval: 'weekly',
        }),
        jasmine.objectContaining({
          updateUrl: false,
          silent: true,
        }),
      );

      // Should have executed the command
      expect(mockTerminalService.execute).toHaveBeenCalled();
    }));

    it('should update interval when route changes', fakeAsync(() => {
      component.selectedInterval.set('daily');

      // Consume the skip(1)
      queryParamsSubject.next({});
      tick();

      queryParamsSubject.next({
        symbol: 'NVDA',
        interval: '60min',
      });
      tick();

      expect(component.selectedInterval()).toBe('60min');
    }));

    it('should not reload if symbol and interval unchanged', fakeAsync(() => {
      component.selectedSymbol.set('AMD');
      component.selectedInterval.set('daily');
      component.currentCommand.set('CHART');

      // Consume the skip(1)
      queryParamsSubject.next({});
      tick();

      const callsBefore = mockTerminalService.execute.calls.count();

      // Same symbol and interval
      queryParamsSubject.next({
        symbol: 'AMD',
        interval: 'daily',
      });
      tick();

      // Should not have made additional calls
      expect(mockTerminalService.execute.calls.count()).toBe(callsBefore);
    }));
  });

  describe('system categories and sort helpers', () => {
    it('identifies system categories by prefix', () => {
      expect(component.isSystemCategory('sector:Energy')).toBeTrue();
      expect(component.isSystemCategory('industry:Banks')).toBeTrue();
      expect(component.isSystemCategory('exchange:NYSE')).toBeTrue();
      expect(component.isSystemCategory('assetType:ETF')).toBeTrue();
      expect(component.isSystemCategory('recent')).toBeFalse();
      expect(component.isSystemCategory('custom-uuid')).toBeFalse();
    });

    it('describes the sort state in tooltips', () => {
      component.sortBy.set(null);
      component.sortDirection.set(null);
      expect(component.getSortTooltip('marketCap', 'Market Cap')).toBe('Sort by Market Cap');
      component.sortBy.set('marketCap');
      component.sortDirection.set('desc');
      expect(component.getSortTooltip('marketCap', 'Market Cap')).toContain('Click for Asc');
      component.sortDirection.set('asc');
      expect(component.getSortTooltip('marketCap', 'Market Cap')).toContain('Click to Clear');
    });

    it('swaps sort icons with the active sort', () => {
      component.sortBy.set(null);
      expect(component.getSortIcon('symbol', 'sort_by_alpha')).toBe('sort_by_alpha');
      component.sortBy.set('symbol');
      component.sortDirection.set('asc');
      expect(component.getSortIcon('symbol', 'sort_by_alpha')).toBe('arrow_upward');
      component.sortDirection.set('desc');
      expect(component.getSortIcon('symbol', 'sort_by_alpha')).toBe('arrow_downward');
    });

    it('summarizes the sort menu state', () => {
      component.sortBy.set(null);
      component.sortDirection.set(null);
      expect(component.getSortMenuTooltip()).toBe('Sort Options');
      expect(component.getSortMenuIcon()).toBe('sort');
      component.sortBy.set('lastAccessedAt');
      component.sortDirection.set('desc');
      expect(component.getSortMenuTooltip()).toContain('Most Recent');
      expect(component.getSortMenuIcon()).toBe('schedule');
      component.sortBy.set('accessCount');
      expect(component.getSortMenuTooltip()).toContain('Most Viewed');
      expect(component.getSortMenuIcon()).toBe('trending_up');
    });
  });

  describe('sort cycling', () => {
    beforeEach(() => {
      component.sortBy.set(null);
      component.sortDirection.set(null);
    });

    it('cycles special sorts desc, asc, then off', () => {
      component.applySpecialSort('lastAccessedAt');
      expect(component.sortBy()).toBe('lastAccessedAt');
      expect(component.sortDirection()).toBe('desc');
      component.applySpecialSort('lastAccessedAt');
      expect(component.sortDirection()).toBe('asc');
      component.applySpecialSort('lastAccessedAt');
      expect(component.sortBy()).toBeNull();
      component.applySpecialSort('accessCount');
      expect(component.sortBy()).toBe('accessCount');
      expect(component.sortDirection()).toBe('desc');
      component.clearSpecialSort();
      expect(component.sortBy()).toBeNull();
      expect(component.sortDirection()).toBeNull();
    });

    it('maps table header sorts to sort fields', () => {
      component.onTableSortChange({ active: 'name', direction: 'asc' } as Sort);
      expect(component.sortBy()).toBe('symbol');
      expect(component.sortDirection()).toBe('asc');
      component.onTableSortChange({ active: 'marketCap', direction: 'desc' } as Sort);
      expect(component.sortBy()).toBe('marketCap');
      component.onTableSortChange({ active: 'exchange', direction: 'asc' } as Sort);
      expect(component.sortBy()).toBeNull();
      component.onTableSortChange({ active: 'symbol', direction: '' } as Sort);
      expect(component.sortBy()).toBeNull();
    });

    it('cycles menu sorts asc, desc, off and reloads recent symbols', () => {
      mockWatchlistService.loadRecentSymbols.calls.reset();
      component.onSortChange('symbol');
      expect(component.sortDirection()).toBe('asc');
      expect(mockWatchlistService.loadRecentSymbols).toHaveBeenCalledWith(30, 'symbol');
      component.onSortChange('symbol');
      expect(component.sortDirection()).toBe('desc');
      component.onSortChange('symbol');
      expect(component.sortBy()).toBeNull();
    });
  });

  describe('selection mode and clipboard', () => {
    it('toggles selection mode and clears picks on exit', () => {
      expect(component.selectionMode()).toBeFalse();
      component.toggleSelectionMode();
      expect(component.selectionMode()).toBeTrue();
      component.toggleSymbolSelection('AAPL');
      component.toggleSymbolSelection('MSFT');
      expect(component.selectedCount()).toBe(2);
      expect(component.isSymbolSelected('AAPL')).toBeTrue();
      component.toggleSymbolSelection('AAPL');
      expect(component.isSymbolSelected('AAPL')).toBeFalse();
      component.toggleSelectionMode();
      expect(component.selectionMode()).toBeFalse();
      expect(component.selectedCount()).toBe(0);
    });

    it('stops event propagation when toggling from a row click', () => {
      const event = new MouseEvent('click');
      const stop = spyOn(event, 'stopPropagation');
      component.toggleSymbolSelection('TSLA', event);
      expect(stop).toHaveBeenCalled();
    });

    it('copies selected symbols to the clipboard', fakeAsync(() => {
      const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
      const success = spyOn(TestBed.inject(MessageService), 'success');
      component.toggleSymbolSelection('AAPL');
      component.toggleSymbolSelection('MSFT');
      component.copySelectedSymbols();
      tick();
      const copied = write.calls.mostRecent().args[0];
      expect(copied).toContain('AAPL');
      expect(copied).toContain('MSFT');
      expect(success).toHaveBeenCalled();
    }));

    it('warns when copying with nothing selected', () => {
      const warning = spyOn(TestBed.inject(MessageService), 'warning');
      component.clearSelection();
      component.copySelectedSymbols();
      expect(warning).toHaveBeenCalledWith('No symbols selected');
    });

    it('warns when copying an empty watchlist', () => {
      const warning = spyOn(TestBed.inject(MessageService), 'warning');
      component.copyAllSymbols();
      expect(warning).toHaveBeenCalledWith('No symbols to copy');
    });

    it('copies via Ctrl+C only in selection mode with picks', () => {
      const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
      const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
      const prevent = spyOn(event, 'preventDefault');

      component.onKeyDown(event);
      expect(prevent).not.toHaveBeenCalled();

      component.toggleSelectionMode();
      component.toggleSymbolSelection('NVDA');
      component.onKeyDown(event);
      expect(prevent).toHaveBeenCalled();
      expect(write).toHaveBeenCalled();
    });
  });

  describe('add-symbol form and autocomplete', () => {
    it('toggles the form and resets state on close', () => {
      component.toggleAddSymbolForm();
      expect(component.showAddSymbolForm()).toBeTrue();
      component.newSymbolInput = 'AAP';
      component.toggleAddSymbolForm();
      expect(component.showAddSymbolForm()).toBeFalse();
      expect(component.newSymbolInput).toBe('');
    });

    it('tracks input changes and clears the chosen listing', () => {
      component.onSymbolInputChange('  msft ');
      expect(component.newSymbolInputTrimmed).toBe('msft');
      expect(component.selectedStockListing()).toBeNull();
    });

    it('selects a stock listing and closes the dropdown', () => {
      component.selectStockListing({ symbol: 'AAPL' } as StockListing);
      expect(component.newSymbolInput).toBe('AAPL');
      expect(component.symbolSearchResults()).toEqual([]);
      expect(component.displayStockListing({ symbol: 'TSLA' } as StockListing)).toBe('TSLA');
      expect(component.displayStockListing(null)).toBe('');
    });
  });

  describe('view state changes', () => {
    it('sets the valuation drill-down view', () => {
      component.setValuationDrillDown('historical');
      expect(component.valuationDrillDown()).toBe('historical');
    });

    it('flips the operating-cash-flow toggle', () => {
      const before = component.showOperatingCashFlow();
      component.toggleOperatingCashFlow();
      expect(component.showOperatingCashFlow()).toBe(!before);
      component.onOcfToggleChange(true);
      expect(component.showOperatingCashFlow()).toBeTrue();
    });

    it('runs the toggled view command only with a symbol selected', () => {
      mockTerminalService.execute.calls.reset();
      component.selectedSymbol.set(null);
      component.onViewToggleChange({ value: 'CHART' });
      expect(mockTerminalService.execute).not.toHaveBeenCalled();

      component.selectedSymbol.set('AAPL');
      component.onViewToggleChange({ value: 'CHART' });
      expect(component.currentCommand()).toBe('CHART');
      expect(mockTerminalService.execute).toHaveBeenCalled();
    });

    it('resets selection state when switching watchlists', () => {
      component.selectedSymbol.set('AAPL');
      component.onWatchlistChange('recent');
      expect(component.selectedWatchlistId()).toBe('recent');
      expect(component.selectedSymbol()).toBeNull();
    });
  });
});
