// Copyright (c) 2026 Perpetuator LLC

/**
 * Terminal Routing Types
 *
 * These types define the routing/navigation structure that the backend can use
 * to control frontend navigation and state. This enables:
 * - Tab navigation (watchlists, dashboards, history)
 * - Symbol selection and synchronization
 * - View switching (chart, info, fundamentals, etc.)
 * - Deep linking via URL query parameters
 *
 * The backend includes a `route` object in command results to direct the
 * frontend to the appropriate state after command execution.
 */

// ============================================================================
// Main Tab Types
// ============================================================================

/**
 * Main terminal tabs
 */
export type TerminalTab = 'watchlists' | 'dashboards' | 'history' | 'help' | 'settings';

/**
 * Detail view types within a tab
 * - chart: Price chart with candlesticks
 * - info: Company information/description
 * - fundamentals/financials: Financial statements, ratios (both work, financials is the command name)
 * - valuation: Valuation metrics, DCF
 * - history: Command history for the symbol
 * - news: News and events
 * - earnings: Earnings reports
 */
export type TerminalView =
  | 'chart'
  | 'info'
  | 'financials'
  | 'valuation'
  | 'dividends'
  | 'history'
  | 'news'
  | 'earnings';

/**
 * Chart interval types
 */
export type ChartInterval = '1min' | '5min' | '15min' | '30min' | '60min' | 'daily' | 'weekly' | 'monthly';

/**
 * Chart period types
 */
export type ChartPeriod = '1D' | '5D' | '1W' | '2W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y' | '20Y' | 'MAX';

// ============================================================================
// Route Information
// ============================================================================

/**
 * Route information returned by backend in command results.
 * This tells the frontend where to navigate and what state to set.
 *
 * Example for MSFT CHART command:
 * {
 *   tab: 'watchlists',
 *   symbol: 'MSFT',
 *   view: 'chart',
 *   interval: 'daily',
 *   period: '1Y'
 * }
 *
 * Example for navigating to a specific watchlist:
 * {
 *   tab: 'watchlists',
 *   watchlistId: 'uuid-here',
 *   symbol: 'AAPL',
 *   view: 'info'
 * }
 */
export interface RouteInfo {
  /** Main tab to navigate to */
  tab?: TerminalTab;

  /** Symbol to select (e.g., 'MSFT') */
  symbol?: string;

  /** Exchange for the symbol (e.g., 'NASDAQ') */
  exchange?: string;

  /** View to show (e.g., 'chart', 'info') */
  view?: TerminalView;

  /** Chart interval (for chart view) */
  interval?: ChartInterval;

  /** Chart period (for chart view) */
  period?: ChartPeriod;

  /** Specific watchlist to select */
  watchlistId?: string;

  /** Specific dashboard to select */
  dashboardId?: string;

  /** Command execution ID for tracking */
  commandId?: string;

  /** Any additional parameters for future extensibility */
  params?: Record<string, string>;
}

// ============================================================================
// Route State (Frontend Internal)
// ============================================================================

/**
 * Complete terminal state that can be serialized to URL or stored.
 * This is the frontend's internal representation of the current state.
 */
export interface TerminalState {
  /** Current main tab */
  tab: TerminalTab;

  /** Currently selected symbol */
  symbol: string | null;

  /** Exchange for the selected symbol */
  exchange: string | null;

  /** Current detail view */
  view: TerminalView;

  /** Current chart interval */
  interval: ChartInterval;

  /** Current chart period */
  period: ChartPeriod;

  /** Selected watchlist ID (or 'recent' for recent symbols) */
  watchlistId: string | null;

  /** Selected dashboard ID */
  dashboardId: string | null;

  /** Whether the symbol list panel is collapsed */
  listCollapsed: boolean;

  /** Whether the detail panel is collapsed */
  detailCollapsed: boolean;

  /** Additional parameters (e.g., fundamentals period) */
  params?: Record<string, string>;
}

/**
 * Default terminal state
 */
export const DEFAULT_TERMINAL_STATE: TerminalState = {
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
};

// ============================================================================
// URL Query Parameters
// ============================================================================

/**
 * Query parameter names for URL-based routing.
 * Example: /terminal?tab=watchlists&symbol=MSFT&view=chart&interval=daily
 */
export const ROUTE_QUERY_PARAMS = {
  TAB: 'tab',
  SYMBOL: 'symbol',
  EXCHANGE: 'exchange',
  VIEW: 'view',
  INTERVAL: 'interval',
  PERIOD: 'period',
  WATCHLIST: 'watchlist',
  DASHBOARD: 'dashboard',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse route info from a command result.
 * Falls back to extracting from metadata if route is not present.
 */
export function parseRouteInfo(result: {
  route?: RouteInfo;
  metadata?: { symbol?: string; interval?: string; period?: string };
}): RouteInfo | null {
  // Prefer explicit route info
  if (result.route) {
    return result.route;
  }

  // Fall back to metadata
  if (result.metadata?.symbol) {
    return {
      symbol: result.metadata.symbol,
      interval: result.metadata.interval as ChartInterval | undefined,
      period: result.metadata.period as ChartPeriod | undefined,
    };
  }

  return null;
}

/**
 * Convert route info to URL query parameters
 */
export function routeToQueryParams(route: RouteInfo): Record<string, string> {
  const params: Record<string, string> = {};

  if (route.tab) params[ROUTE_QUERY_PARAMS.TAB] = route.tab;
  if (route.symbol) params[ROUTE_QUERY_PARAMS.SYMBOL] = route.symbol;
  if (route.exchange) params[ROUTE_QUERY_PARAMS.EXCHANGE] = route.exchange;
  if (route.view) params[ROUTE_QUERY_PARAMS.VIEW] = route.view;
  if (route.interval) params[ROUTE_QUERY_PARAMS.INTERVAL] = route.interval;
  // Note: period is intentionally excluded - chart data uses 'first' (record count) instead
  if (route.watchlistId) params[ROUTE_QUERY_PARAMS.WATCHLIST] = route.watchlistId;
  if (route.dashboardId) params[ROUTE_QUERY_PARAMS.DASHBOARD] = route.dashboardId;

  // Add any extra params (e.g., fundamentals period)
  if (route.params) {
    Object.entries(route.params).forEach(([key, value]) => {
      params[key] = value;
    });
  }

  return params;
}

/**
 * Parse URL query parameters to route info
 */
export function queryParamsToRoute(params: Record<string, string>): RouteInfo {
  const route: RouteInfo = {
    tab: params[ROUTE_QUERY_PARAMS.TAB] as TerminalTab | undefined,
    symbol: params[ROUTE_QUERY_PARAMS.SYMBOL],
    exchange: params[ROUTE_QUERY_PARAMS.EXCHANGE],
    view: params[ROUTE_QUERY_PARAMS.VIEW] as TerminalView | undefined,
    interval: params[ROUTE_QUERY_PARAMS.INTERVAL] as ChartInterval | undefined,
    period: params[ROUTE_QUERY_PARAMS.PERIOD] as ChartPeriod | undefined,
    watchlistId: params[ROUTE_QUERY_PARAMS.WATCHLIST],
    dashboardId: params[ROUTE_QUERY_PARAMS.DASHBOARD],
  };

  // Extract any extra params (e.g., period for fundamentals)
  const knownParamValues = Object.values(ROUTE_QUERY_PARAMS) as string[];
  const extraParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (!knownParamValues.includes(key) && value) {
      extraParams[key] = value;
    }
  });
  if (Object.keys(extraParams).length > 0) {
    route.params = extraParams;
  }

  return route;
}

/**
 * Apply route info to terminal state (partial update)
 */
export function applyRouteToState(state: TerminalState, route: RouteInfo): TerminalState {
  return {
    ...state,
    tab: route.tab ?? state.tab,
    symbol: route.symbol ?? state.symbol,
    exchange: route.exchange ?? state.exchange,
    view: route.view ?? state.view,
    interval: route.interval ?? state.interval,
    period: route.period ?? state.period,
    watchlistId: route.watchlistId ?? state.watchlistId,
    dashboardId: route.dashboardId ?? state.dashboardId,
  };
}
