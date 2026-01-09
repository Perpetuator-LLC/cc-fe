// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { TerminalRoutingService } from './terminal-routing.service';
import { RouteInfo } from './terminal-routing.types';

describe('TerminalRoutingService', () => {
  let service: TerminalRoutingService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: { snapshot: { queryParams: Record<string, string> } };

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      },
    };

    TestBed.configureTestingModule({
      providers: [
        TerminalRoutingService,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    service = TestBed.inject(TerminalRoutingService);
  });

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default tab as watchlists', () => {
      expect(service.tab()).toBe('watchlists');
    });

    it('should have no symbol selected initially', () => {
      expect(service.symbol()).toBeNull();
    });

    it('should have default interval as daily', () => {
      expect(service.interval()).toBe('daily');
    });

    it('should have default view as chart', () => {
      expect(service.view()).toBe('chart');
    });

    it('should have default watchlistId as recent', () => {
      expect(service.watchlistId()).toBe('recent');
    });
  });

  describe('applyRoute', () => {
    it('should update symbol when route has symbol', () => {
      const route: RouteInfo = { symbol: 'MSFT', exchange: 'NASDAQ' };

      service.applyRoute(route);

      expect(service.symbol()).toBe('MSFT');
      expect(service.exchange()).toBe('NASDAQ');
    });

    it('should update symbol to uppercase', () => {
      const route: RouteInfo = { symbol: 'msft' };

      service.applyRoute(route);

      expect(service.symbol()).toBe('MSFT');
    });

    it('should update interval when provided', () => {
      const route: RouteInfo = { symbol: 'AAPL', interval: '30min' };

      service.applyRoute(route);

      expect(service.interval()).toBe('30min');
    });

    it('should update tab when provided', () => {
      const route: RouteInfo = { tab: 'history' };

      service.applyRoute(route);

      expect(service.tab()).toBe('history');
    });

    it('should update view when provided', () => {
      const route: RouteInfo = { view: 'info' };

      service.applyRoute(route);

      expect(service.view()).toBe('info');
    });

    it('should update URL by default', () => {
      const route: RouteInfo = { symbol: 'GOOGL' };

      service.applyRoute(route);

      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should not update URL when updateUrl is false', () => {
      const route: RouteInfo = { symbol: 'GOOGL' };

      service.applyRoute(route, { updateUrl: false });

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should return previous symbol', () => {
      service.applyRoute({ symbol: 'AAPL' }, { updateUrl: false });

      const previousSymbol = service.applyRoute({ symbol: 'MSFT' }, { updateUrl: false });

      expect(previousSymbol).toBe('AAPL');
    });

    it('should update multiple properties atomically', () => {
      const route: RouteInfo = {
        tab: 'watchlists',
        symbol: 'NVDA',
        exchange: 'NASDAQ',
        view: 'chart',
        interval: '15min',
        watchlistId: 'favorites',
      };

      service.applyRoute(route, { updateUrl: false });

      expect(service.tab()).toBe('watchlists');
      expect(service.symbol()).toBe('NVDA');
      expect(service.exchange()).toBe('NASDAQ');
      expect(service.view()).toBe('chart');
      expect(service.interval()).toBe('15min');
      expect(service.watchlistId()).toBe('favorites');
    });
  });

  describe('URL update behavior', () => {
    it('should use replaceUrl: false for browser history', () => {
      const route: RouteInfo = { symbol: 'TSLA' };

      service.applyRoute(route);

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          replaceUrl: false,
        }),
      );
    });

    it('should not include period in query params', () => {
      const route: RouteInfo = { symbol: 'AMZN', interval: 'daily' };

      service.applyRoute(route);

      const callArgs = mockRouter.navigate.calls.mostRecent().args;
      const queryParams = callArgs[1]?.queryParams || {};

      expect(queryParams['period']).toBeUndefined();
    });

    it('should include symbol in query params', () => {
      const route: RouteInfo = { symbol: 'META' };

      service.applyRoute(route);

      const callArgs = mockRouter.navigate.calls.mostRecent().args;
      const queryParams = callArgs[1]?.queryParams || {};

      expect(queryParams['symbol']).toBe('META');
    });

    it('should include interval in query params', () => {
      const route: RouteInfo = { symbol: 'AMD', interval: '30min' };

      service.applyRoute(route);

      const callArgs = mockRouter.navigate.calls.mostRecent().args;
      const queryParams = callArgs[1]?.queryParams || {};

      expect(queryParams['interval']).toBe('30min');
    });
  });

  describe('init from query params', () => {
    it('should initialize from URL query params on creation', () => {
      // Create a new service with query params
      const routeWithParams = {
        snapshot: {
          queryParams: {
            symbol: 'INTC',
            exchange: 'NASDAQ',
            interval: 'weekly',
          },
        },
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          TerminalRoutingService,
          { provide: Router, useValue: mockRouter },
          { provide: ActivatedRoute, useValue: routeWithParams },
        ],
      });

      const newService = TestBed.inject(TerminalRoutingService);

      expect(newService.symbol()).toBe('INTC');
      expect(newService.exchange()).toBe('NASDAQ');
      expect(newService.interval()).toBe('weekly');
    });
  });

  describe('computed values', () => {
    it('should compute hasSymbol correctly', () => {
      expect(service.hasSymbol()).toBeFalse();

      service.applyRoute({ symbol: 'ORCL' }, { updateUrl: false });

      expect(service.hasSymbol()).toBeTrue();
    });

    it('should compute symbolFqn correctly', () => {
      service.applyRoute({ symbol: 'CSCO', exchange: 'NASDAQ' }, { updateUrl: false });

      expect(service.symbolFqn()).toBe('STOCK:NASDAQ:CSCO');
    });

    it('should return null for symbolFqn when no symbol', () => {
      expect(service.symbolFqn()).toBeNull();
    });

    it('should compute state object correctly', () => {
      service.applyRoute(
        {
          tab: 'watchlists',
          symbol: 'JPM',
          exchange: 'NYSE',
          view: 'chart',
          interval: 'daily',
        },
        { updateUrl: false },
      );

      const state = service.state();

      expect(state.tab).toBe('watchlists');
      expect(state.symbol).toBe('JPM');
      expect(state.exchange).toBe('NYSE');
      expect(state.view).toBe('chart');
      expect(state.interval).toBe('daily');
    });
  });

  describe('setInterval', () => {
    it('should update interval and trigger URL update', () => {
      service.setInterval('60min');

      expect(service.interval()).toBe('60min');
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      // Set some state first
      service.applyRoute(
        {
          tab: 'history',
          symbol: 'BABA',
          exchange: 'NYSE',
          view: 'info',
          interval: 'weekly',
        },
        { updateUrl: false },
      );

      // Reset
      service.reset();

      expect(service.tab()).toBe('watchlists');
      expect(service.symbol()).toBeNull();
      expect(service.exchange()).toBeNull();
      expect(service.view()).toBe('chart');
      expect(service.interval()).toBe('daily');
      expect(service.watchlistId()).toBe('recent');
    });
  });
});
