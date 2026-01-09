// Copyright (c) 2026 Perpetuator LLC
import {
  RouteInfo,
  TerminalState,
  DEFAULT_TERMINAL_STATE,
  ROUTE_QUERY_PARAMS,
  parseRouteInfo,
  routeToQueryParams,
  queryParamsToRoute,
  applyRouteToState,
} from './terminal-routing.types';

describe('Terminal Routing Types', () => {
  describe('DEFAULT_TERMINAL_STATE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_TERMINAL_STATE.tab).toBe('watchlists');
      expect(DEFAULT_TERMINAL_STATE.symbol).toBeNull();
      expect(DEFAULT_TERMINAL_STATE.exchange).toBeNull();
      expect(DEFAULT_TERMINAL_STATE.view).toBe('chart');
      expect(DEFAULT_TERMINAL_STATE.interval).toBe('daily');
      expect(DEFAULT_TERMINAL_STATE.period).toBe('1Y');
      expect(DEFAULT_TERMINAL_STATE.watchlistId).toBe('recent');
      expect(DEFAULT_TERMINAL_STATE.dashboardId).toBeNull();
      expect(DEFAULT_TERMINAL_STATE.listCollapsed).toBeFalse();
      expect(DEFAULT_TERMINAL_STATE.detailCollapsed).toBeFalse();
    });
  });

  describe('ROUTE_QUERY_PARAMS', () => {
    it('should have correct query param names', () => {
      expect(ROUTE_QUERY_PARAMS.TAB).toBe('tab');
      expect(ROUTE_QUERY_PARAMS.SYMBOL).toBe('symbol');
      expect(ROUTE_QUERY_PARAMS.EXCHANGE).toBe('exchange');
      expect(ROUTE_QUERY_PARAMS.VIEW).toBe('view');
      expect(ROUTE_QUERY_PARAMS.INTERVAL).toBe('interval');
      expect(ROUTE_QUERY_PARAMS.PERIOD).toBe('period');
      expect(ROUTE_QUERY_PARAMS.WATCHLIST).toBe('watchlist');
      expect(ROUTE_QUERY_PARAMS.DASHBOARD).toBe('dashboard');
    });
  });

  describe('parseRouteInfo', () => {
    it('should return route if present', () => {
      const route: RouteInfo = { symbol: 'MSFT', exchange: 'NASDAQ' };
      const result = { route };

      expect(parseRouteInfo(result)).toEqual(route);
    });

    it('should fall back to metadata if no route', () => {
      const result = {
        metadata: { symbol: 'AAPL', interval: 'daily', period: '1Y' },
      };

      const parsed = parseRouteInfo(result);

      expect(parsed?.symbol).toBe('AAPL');
      expect(parsed?.interval).toBe('daily');
      expect(parsed?.period).toBe('1Y');
    });

    it('should return null if no route or metadata', () => {
      expect(parseRouteInfo({})).toBeNull();
    });

    it('should return null if metadata has no symbol', () => {
      const result = { metadata: { interval: 'daily' } };

      expect(parseRouteInfo(result)).toBeNull();
    });

    it('should prefer route over metadata', () => {
      const result = {
        route: { symbol: 'GOOGL' },
        metadata: { symbol: 'AAPL' },
      };

      expect(parseRouteInfo(result)?.symbol).toBe('GOOGL');
    });
  });

  describe('routeToQueryParams', () => {
    it('should convert route to query params', () => {
      const route: RouteInfo = {
        tab: 'watchlists',
        symbol: 'NVDA',
        exchange: 'NASDAQ',
        view: 'chart',
        interval: '30min',
        watchlistId: 'recent',
      };

      const params = routeToQueryParams(route);

      expect(params['tab']).toBe('watchlists');
      expect(params['symbol']).toBe('NVDA');
      expect(params['exchange']).toBe('NASDAQ');
      expect(params['view']).toBe('chart');
      expect(params['interval']).toBe('30min');
      expect(params['watchlist']).toBe('recent');
    });

    it('should NOT include period (intentionally excluded)', () => {
      const route: RouteInfo = {
        symbol: 'AMZN',
        period: '2Y', // This should be excluded
      };

      const params = routeToQueryParams(route);

      expect(params['period']).toBeUndefined();
      expect(params['symbol']).toBe('AMZN');
    });

    it('should omit undefined values', () => {
      const route: RouteInfo = {
        symbol: 'META',
      };

      const params = routeToQueryParams(route);

      expect(Object.keys(params)).toEqual(['symbol']);
    });

    it('should include dashboardId when provided', () => {
      const route: RouteInfo = {
        dashboardId: 'dashboard-uuid-123',
      };

      const params = routeToQueryParams(route);

      expect(params['dashboard']).toBe('dashboard-uuid-123');
    });
  });

  describe('queryParamsToRoute', () => {
    it('should convert query params to route', () => {
      const params: Record<string, string> = {
        tab: 'history',
        symbol: 'TSLA',
        exchange: 'NASDAQ',
        view: 'info',
        interval: 'weekly',
        period: '1Y',
        watchlist: 'favorites',
        dashboard: 'dash-123',
      };

      const route = queryParamsToRoute(params);

      expect(route.tab).toBe('history');
      expect(route.symbol).toBe('TSLA');
      expect(route.exchange).toBe('NASDAQ');
      expect(route.view).toBe('info');
      expect(route.interval).toBe('weekly');
      expect(route.period).toBe('1Y');
      expect(route.watchlistId).toBe('favorites');
      expect(route.dashboardId).toBe('dash-123');
    });

    it('should handle empty params', () => {
      const route = queryParamsToRoute({});

      expect(route.tab).toBeUndefined();
      expect(route.symbol).toBeUndefined();
    });

    it('should handle partial params', () => {
      const params: Record<string, string> = {
        symbol: 'AMD',
        interval: 'daily',
      };

      const route = queryParamsToRoute(params);

      expect(route.symbol).toBe('AMD');
      expect(route.interval).toBe('daily');
      expect(route.tab).toBeUndefined();
      expect(route.exchange).toBeUndefined();
    });
  });

  describe('applyRouteToState', () => {
    it('should apply route to state', () => {
      const state = { ...DEFAULT_TERMINAL_STATE };
      const route: RouteInfo = {
        tab: 'dashboards',
        symbol: 'INTC',
        exchange: 'NASDAQ',
        view: 'fundamentals',
        interval: 'monthly',
      };

      const newState = applyRouteToState(state, route);

      expect(newState.tab).toBe('dashboards');
      expect(newState.symbol).toBe('INTC');
      expect(newState.exchange).toBe('NASDAQ');
      expect(newState.view).toBe('fundamentals');
      expect(newState.interval).toBe('monthly');
    });

    it('should preserve existing state for undefined route values', () => {
      const state: TerminalState = {
        ...DEFAULT_TERMINAL_STATE,
        symbol: 'ORCL',
        exchange: 'NYSE',
        interval: 'weekly',
      };
      const route: RouteInfo = {
        view: 'info',
      };

      const newState = applyRouteToState(state, route);

      expect(newState.symbol).toBe('ORCL'); // Preserved
      expect(newState.exchange).toBe('NYSE'); // Preserved
      expect(newState.interval).toBe('weekly'); // Preserved
      expect(newState.view).toBe('info'); // Updated
    });

    it('should not mutate original state', () => {
      const state = { ...DEFAULT_TERMINAL_STATE };
      const originalSymbol = state.symbol;
      const route: RouteInfo = { symbol: 'BABA' };

      applyRouteToState(state, route);

      expect(state.symbol).toBe(originalSymbol);
    });
  });
});
