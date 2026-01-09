// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { WatchlistTabComponent } from './watchlist-tab.component';
import { TerminalRoutingService } from '../terminal-routing.service';
import { TerminalService } from '../terminal.service';
import { TerminalWebSocketService } from '../terminal-websocket.service';
import { WatchlistService } from '../watchlist.service';
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

  beforeEach(async () => {
    queryParamsSubject = new Subject<Record<string, string>>();
    commandResultSubject = new Subject<CommandResult>();
    symbolUpdateSubject = new Subject<SymbolUpdate>();

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

    mockTerminalService = jasmine.createSpyObj('TerminalService', [
      'execute',
      'subscribeSymbols',
      'unsubscribeSymbols',
      'fetchQuote',
    ]);
    mockTerminalService.fetchQuote.and.returnValue(of(null));

    mockTerminalWsService = jasmine.createSpyObj('TerminalWebSocketService', ['connect', 'disconnect', 'send'], {
      onCommandResult: commandResultSubject.asObservable(),
      onSymbolUpdate: symbolUpdateSubject.asObservable(),
      isConnected: signal(false),
    });

    mockWatchlistService = jasmine.createSpyObj('WatchlistService', [
      'loadWatchlists',
      'loadRecentSymbols',
      'loadSearchHistory',
      'searchStockListings',
      'loadSymbolsForWatchlist',
    ]);
    mockWatchlistService.loadWatchlists.and.returnValue(of([]));
    mockWatchlistService.loadRecentSymbols.and.returnValue(of([]));
    mockWatchlistService.loadSearchHistory.and.returnValue(of([]));
    mockWatchlistService.searchStockListings.and.returnValue(of([]));
    mockWatchlistService.loadSymbolsForWatchlist.and.returnValue(of([]));

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
    mockChartPreferencesService.updatePreference.and.returnValue(of(void 0));

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
  });

  describe('basic functionality', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have initial loading state as false', () => {
      expect(component.loading()).toBeFalse();
    });

    it('should return symbol actions with proper commands', () => {
      const actions = component.getSymbolActions();
      expect(actions.length).toBe(3);
      expect(actions[0].command).toBe('CHART');
      expect(actions[1].command).toBe('HP');
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
    it('should reload chart when route params change', fakeAsync(() => {
      // Initial state - no symbol
      expect(component.selectedSymbol()).toBeNull();

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
});
