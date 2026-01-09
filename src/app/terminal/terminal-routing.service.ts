// Copyright (c) 2026 Perpetuator LLC

import { Injectable, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  RouteInfo,
  TerminalState,
  TerminalTab,
  TerminalView,
  ChartInterval,
  ChartPeriod,
  DEFAULT_TERMINAL_STATE,
  routeToQueryParams,
  queryParamsToRoute,
  parseRouteInfo,
} from './terminal-routing.types';

/**
 * Terminal Routing Service
 *
 * Centralized state management for terminal navigation.
 * This service is the single source of truth for:
 * - Current tab
 * - Selected symbol
 * - Current view (chart, info, etc.)
 * - Chart interval/period
 * - Selected watchlist/dashboard
 *
 * Components subscribe to this service's signals to stay in sync.
 * When a command result comes in with route info, this service
 * updates all state atomically.
 */
@Injectable({
  providedIn: 'root',
})
export class TerminalRoutingService {
  // =========================================================================
  // State Signals (Angular Signals for reactive UI)
  // =========================================================================

  /** Current main tab */
  readonly tab = signal<TerminalTab>('watchlists');

  /** Currently selected symbol (e.g., 'MSFT') */
  readonly symbol = signal<string | null>(null);

  /** Exchange for the selected symbol (e.g., 'NASDAQ') */
  readonly exchange = signal<string | null>(null);

  /** Current detail view */
  readonly view = signal<TerminalView>('chart');

  /** Current chart interval */
  readonly interval = signal<ChartInterval>('daily');

  /** Current chart period */
  readonly period = signal<ChartPeriod>('1Y');

  /** Selected watchlist ID (or 'recent') */
  readonly watchlistId = signal<string | null>('recent');

  /** Selected dashboard ID */
  readonly dashboardId = signal<string | null>(null);

  /** Symbol list panel collapsed state */
  readonly listCollapsed = signal<boolean>(false);

  /** Detail panel collapsed state */
  readonly detailCollapsed = signal<boolean>(false);

  // =========================================================================
  // Computed Values
  // =========================================================================

  /** Full FQN for current symbol (e.g., 'STOCK:NASDAQ:MSFT') */
  readonly symbolFqn = computed(() => {
    const sym = this.symbol();
    const exch = this.exchange();
    if (!sym) return null;
    return `STOCK:${(exch || 'UNKNOWN').toUpperCase()}:${sym.toUpperCase()}`;
  });

  /** Whether a symbol is currently selected */
  readonly hasSymbol = computed(() => !!this.symbol());

  /** Current state as an object */
  readonly state = computed<TerminalState>(() => ({
    tab: this.tab(),
    symbol: this.symbol(),
    exchange: this.exchange(),
    view: this.view(),
    interval: this.interval(),
    period: this.period(),
    watchlistId: this.watchlistId(),
    dashboardId: this.dashboardId(),
    listCollapsed: this.listCollapsed(),
    detailCollapsed: this.detailCollapsed(),
  }));

  // =========================================================================
  // Observable Subjects (for RxJS compatibility)
  // =========================================================================

  private readonly symbolChange$ = new BehaviorSubject<string | null>(null);

  /** Observable for symbol changes (for components that prefer RxJS) */
  get onSymbolChange(): Observable<string | null> {
    return this.symbolChange$.asObservable();
  }

  // =========================================================================
  // Constructor
  // =========================================================================

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // Initialize from URL query parameters on service creation
    this.initFromQueryParams();
  }

  // =========================================================================
  // Route Application (Main Entry Point)
  // =========================================================================

  /**
   * Apply route info from a command result.
   * This is the main method called when a command returns navigation info.
   *
   * @param route Route info from backend command result
   * @param options Additional options
   * @returns The previous symbol (for cleanup) or null
   */
  applyRoute(route: RouteInfo, options: { updateUrl?: boolean; silent?: boolean } = {}): string | null {
    const previousSymbol = this.symbol();
    const { updateUrl = true, silent = false } = options;

    if (!silent) {
      console.log('[TerminalRouting] Applying route:', route);
      console.log('[TerminalRouting] Previous state:', this.state());
    }

    // Update all state atomically
    if (route.tab !== undefined) this.tab.set(route.tab);
    if (route.symbol !== undefined) {
      const newSymbol = route.symbol.toUpperCase();
      this.symbol.set(newSymbol);
      this.symbolChange$.next(newSymbol);
    }
    if (route.exchange !== undefined) this.exchange.set(route.exchange.toUpperCase());
    if (route.view !== undefined) this.view.set(route.view);
    if (route.interval !== undefined) this.interval.set(route.interval);
    if (route.period !== undefined) this.period.set(route.period);
    if (route.watchlistId !== undefined) this.watchlistId.set(route.watchlistId);
    if (route.dashboardId !== undefined) this.dashboardId.set(route.dashboardId);

    if (!silent) {
      console.log('[TerminalRouting] New state:', this.state());
    }

    // Optionally update URL
    if (updateUrl) {
      this.updateUrlQueryParams();
    }

    return previousSymbol;
  }

  /**
   * Apply route info from a command result (convenience method).
   * Extracts route info from result.route or result.metadata.
   */
  applyCommandResult(result: {
    route?: RouteInfo;
    metadata?: { symbol?: string; interval?: string; period?: string };
  }): string | null {
    const route = parseRouteInfo(result);
    if (route) {
      return this.applyRoute(route);
    }
    return null;
  }

  // =========================================================================
  // Individual State Setters
  // =========================================================================

  /**
   * Set the current tab
   */
  setTab(tab: TerminalTab): void {
    this.tab.set(tab);
    this.updateUrlQueryParams();
  }

  /**
   * Set the selected symbol (and optionally exchange)
   */
  setSymbol(symbol: string | null, exchange?: string | null): string | null {
    const previousSymbol = this.symbol();

    if (symbol) {
      this.symbol.set(symbol.toUpperCase());
      if (exchange !== undefined) {
        this.exchange.set(exchange?.toUpperCase() || null);
      }
      this.symbolChange$.next(symbol.toUpperCase());
    } else {
      this.symbol.set(null);
      this.exchange.set(null);
      this.symbolChange$.next(null);
    }

    this.updateUrlQueryParams();
    return previousSymbol;
  }

  /**
   * Set the current view
   */
  setView(view: TerminalView): void {
    this.view.set(view);
    this.updateUrlQueryParams();
  }

  /**
   * Set the chart interval
   */
  setInterval(interval: ChartInterval): void {
    this.interval.set(interval);
    this.updateUrlQueryParams();
  }

  /**
   * Set the chart period
   */
  setPeriod(period: ChartPeriod): void {
    this.period.set(period);
    this.updateUrlQueryParams();
  }

  /**
   * Set the selected watchlist
   */
  setWatchlist(watchlistId: string | null): void {
    this.watchlistId.set(watchlistId);
    this.updateUrlQueryParams();
  }

  /**
   * Set the selected dashboard
   */
  setDashboard(dashboardId: string | null): void {
    this.dashboardId.set(dashboardId);
    this.updateUrlQueryParams();
  }

  // =========================================================================
  // Panel State
  // =========================================================================

  toggleListPanel(): void {
    this.listCollapsed.set(!this.listCollapsed());
  }

  toggleDetailPanel(): void {
    this.detailCollapsed.set(!this.detailCollapsed());
  }

  // =========================================================================
  // URL Synchronization
  // =========================================================================

  /**
   * Initialize state from URL query parameters
   */
  private initFromQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    if (Object.keys(params).length > 0) {
      const route = queryParamsToRoute(params);
      this.applyRoute(route, { updateUrl: false, silent: true });
    }
  }

  /**
   * Update URL query parameters to reflect current state
   */
  private updateUrlQueryParams(): void {
    const route: RouteInfo = {
      tab: this.tab(),
      symbol: this.symbol() || undefined,
      exchange: this.exchange() || undefined,
      view: this.view(),
      interval: this.interval(),
      // Note: period is excluded - chart uses 'first' (record count) instead
      watchlistId: this.watchlistId() || undefined,
      dashboardId: this.dashboardId() || undefined,
    };

    const queryParams = routeToQueryParams(route);

    // Update URL - use replaceUrl: false to enable browser back/forward navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: false, // Push to history for back/forward navigation
    });
  }

  // =========================================================================
  // State Reset
  // =========================================================================

  /**
   * Reset to default state
   */
  reset(): void {
    this.tab.set(DEFAULT_TERMINAL_STATE.tab);
    this.symbol.set(DEFAULT_TERMINAL_STATE.symbol);
    this.exchange.set(DEFAULT_TERMINAL_STATE.exchange);
    this.view.set(DEFAULT_TERMINAL_STATE.view);
    this.interval.set(DEFAULT_TERMINAL_STATE.interval);
    this.period.set(DEFAULT_TERMINAL_STATE.period);
    this.watchlistId.set(DEFAULT_TERMINAL_STATE.watchlistId);
    this.dashboardId.set(DEFAULT_TERMINAL_STATE.dashboardId);
    this.listCollapsed.set(DEFAULT_TERMINAL_STATE.listCollapsed);
    this.detailCollapsed.set(DEFAULT_TERMINAL_STATE.detailCollapsed);
    this.symbolChange$.next(null);
    this.updateUrlQueryParams();
  }

  /**
   * Clear symbol selection (keeps other state)
   */
  clearSymbol(): void {
    this.symbol.set(null);
    this.exchange.set(null);
    this.symbolChange$.next(null);
    this.updateUrlQueryParams();
  }
}
