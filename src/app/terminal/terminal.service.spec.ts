// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, Subject, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { TerminalService } from './terminal.service';
import { TerminalWebSocketService } from './terminal-websocket.service';
import { JobsWebSocketService } from '../jobs/jobs-websocket.service';
import { WatchlistService } from './watchlist.service';

describe('TerminalService', () => {
  let service: TerminalService;
  let apollo: jasmine.SpyObj<Apollo>;
  let wsService: jasmine.SpyObj<TerminalWebSocketService>;
  let jobsWsService: jasmine.SpyObj<JobsWebSocketService>;
  let watchlistService: jasmine.SpyObj<WatchlistService>;
  let commandResult$: Subject<unknown>;
  let commandProgress$: Subject<unknown>;
  let chartUpdate$: Subject<unknown>;
  let symbolUpdate$: Subject<unknown>;
  let wsError$: Subject<string>;
  let jobCompleted$: Subject<{ uuid: string; error?: string }>;
  let jobFailed$: Subject<{ uuid: string; error?: string }>;
  let connectionStateSignal: ReturnType<typeof signal<'connected' | 'disconnected' | 'connecting'>>;

  beforeEach(() => {
    commandResult$ = new Subject();
    commandProgress$ = new Subject();
    chartUpdate$ = new Subject();
    symbolUpdate$ = new Subject();
    wsError$ = new Subject<string>();
    jobCompleted$ = new Subject();
    jobFailed$ = new Subject();
    connectionStateSignal = signal<'connected' | 'disconnected' | 'connecting'>('disconnected');

    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.returnValue(of({ data: { commands: [], terminalHints: null } } as any));
    apollo.mutate.and.returnValue(of({ data: {} } as any));

    wsService = jasmine.createSpyObj<TerminalWebSocketService>(
      'TerminalWebSocketService',
      [
        'connect',
        'disconnect',
        'execute',
        'subscribeChart',
        'unsubscribeChart',
        'subscribeSymbols',
        'unsubscribeSymbols',
      ],
      {
        onCommandResult: commandResult$.asObservable(),
        onCommandProgress: commandProgress$.asObservable(),
        onChartUpdate: chartUpdate$.asObservable(),
        onSymbolUpdate: symbolUpdate$.asObservable(),
        onError: wsError$.asObservable(),
        connectionState: connectionStateSignal,
      } as Partial<TerminalWebSocketService> as TerminalWebSocketService,
    );

    jobsWsService = jasmine.createSpyObj<JobsWebSocketService>('JobsWebSocketService', [], {
      jobCompleted$: jobCompleted$.asObservable(),
      jobFailed$: jobFailed$.asObservable(),
    } as Partial<JobsWebSocketService> as JobsWebSocketService);

    watchlistService = jasmine.createSpyObj<WatchlistService>('WatchlistService', ['loadWatchlists']);

    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        { provide: Apollo, useValue: apollo },
        { provide: TerminalWebSocketService, useValue: wsService },
        { provide: JobsWebSocketService, useValue: jobsWsService },
        { provide: WatchlistService, useValue: watchlistService },
      ],
    });
    service = TestBed.inject(TerminalService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('is created and exposes getters for history/charts', () => {
    expect(service).toBeTruthy();
    expect(service.history()).toEqual([]);
    expect(service.commandHistory()).toEqual([]);
    expect(service.userHistory()).toEqual([]);
    expect(service.activeCharts().size).toBe(0);
    expect(service.hasMoreHistory).toBeTrue();
  });

  describe('connect / disconnect / isConnected', () => {
    it('connect delegates to wsService.connect', () => {
      service.connect();
      expect(wsService.connect).toHaveBeenCalled();
    });

    it('disconnect delegates to wsService.disconnect', () => {
      service.disconnect();
      expect(wsService.disconnect).toHaveBeenCalled();
    });

    it('isConnected reflects connection state signal', () => {
      connectionStateSignal.set('disconnected');
      expect(service.isConnected()).toBeFalse();
      connectionStateSignal.set('connected');
      expect(service.isConnected()).toBeTrue();
      connectionStateSignal.set('connecting');
      expect(service.isConnected()).toBeFalse();
    });
  });

  describe('subscribe/unsubscribe pass-throughs', () => {
    it('subscribeChart and unsubscribeChart delegate to wsService', () => {
      service.subscribeChart('c1');
      expect(wsService.subscribeChart).toHaveBeenCalledWith('c1');
      // Seed an active chart so unsubscribeChart has something to remove
      service.activeCharts().set('c1', {} as never);
      service.unsubscribeChart('c1');
      expect(wsService.unsubscribeChart).toHaveBeenCalledWith('c1');
      expect(service.activeCharts().has('c1')).toBeFalse();
    });

    it('subscribeSymbols / unsubscribeSymbols delegate', () => {
      service.subscribeSymbols(['AAPL', 'TSLA']);
      expect(wsService.subscribeSymbols).toHaveBeenCalledWith(['AAPL', 'TSLA']);
      service.unsubscribeSymbols(['AAPL']);
      expect(wsService.unsubscribeSymbols).toHaveBeenCalledWith(['AAPL']);
    });
  });

  describe('execute (WebSocket path)', () => {
    it('throws on empty command', () => {
      expect(() => service.execute('   ')).toThrowError(/Empty command/);
    });

    it('records the command in history and delegates to ws.execute', () => {
      const entry = service.execute('CHART AAPL');
      expect(entry.input).toBe('CHART AAPL');
      expect(entry.isLoading).toBeTrue();
      expect(service.history().length).toBe(1);
      expect(service.commandHistory()).toEqual(['CHART AAPL']);
      expect(wsService.execute).toHaveBeenCalledWith('CHART AAPL');
    });

    it('throttles duplicate commands within COMMAND_THROTTLE_MS', () => {
      service.execute('PING');
      service.execute('PING');
      // Only one ws.execute call — the second is throttled
      expect(wsService.execute).toHaveBeenCalledTimes(1);
      // History only grows once
      expect(service.history().length).toBe(1);
    });
  });

  describe('executeViaGraphQL', () => {
    it('returns the unwrapped result on success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { executeCommand: { result: { type: 'TEXT', value: 'hi' } } } } as any));
      service.executeViaGraphQL('PING').subscribe((result) => {
        expect((result as { type?: string }).type).toBe('TEXT');
        const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['input']).toBe('PING');
        expect(vars['useAiFallback']).toBeTrue();
        done();
      });
    });
  });

  describe('navigateHistory / resetHistoryIndex', () => {
    beforeEach(() => {
      service.commandHistory.set(['a', 'b', 'c']);
      service['historyIndex'] = 3; // past the newest
    });

    it('moves to older commands with direction -1', () => {
      expect(service.navigateHistory(-1)).toBe('c');
      expect(service.navigateHistory(-1)).toBe('b');
      expect(service.navigateHistory(-1)).toBe('a');
    });

    it('returns "" when stepping past the newest', () => {
      service['historyIndex'] = 2;
      expect(service.navigateHistory(1)).toBe('');
    });

    it('returns the current entry when newIndex is negative', () => {
      service['historyIndex'] = 0;
      expect(service.navigateHistory(-1)).toBe('a');
    });

    it('resetHistoryIndex moves index to past the newest', () => {
      service['historyIndex'] = 0;
      service.resetHistoryIndex();
      expect(service['historyIndex']).toBe(3);
    });
  });

  describe('clearHistory', () => {
    it('empties the session history', () => {
      service.execute('foo');
      expect(service.history().length).toBe(1);
      service.clearHistory();
      expect(service.history()).toEqual([]);
    });
  });

  describe('getSuggestions (deprecated)', () => {
    it('filters cached commands by case-insensitive name prefix', () => {
      service['commandsCache$'].next([
        { name: 'CHART', aliases: ['C'] } as never,
        { name: 'CHAT', aliases: [] } as never,
        { name: 'HELP', aliases: ['?'] } as never,
      ]);
      const results = service.getSuggestions('ch');
      expect(results.map((r) => r.name).sort()).toEqual(['CHART', 'CHAT']);
    });

    it('matches aliases', () => {
      service['commandsCache$'].next([
        { name: 'HELP', aliases: ['?'] } as never,
        { name: 'QUIT', aliases: [] } as never,
      ]);
      expect(service.getSuggestions('?').map((r) => r.name)).toEqual(['HELP']);
    });
  });

  describe('getLocalAutocompleteSuggestions (via fetch fallback)', () => {
    function fallback(): (typeof apollo.query)['calls'] {
      apollo.query.and.returnValue(throwError(() => new Error('500')));
      return apollo.query.calls;
    }

    it('returns command suggestions on empty input', (done) => {
      service['commandsCache$'].next([
        { name: 'CHART', description: 'Render chart', category: 'data' } as never,
        { name: 'HELP', description: 'Show help', category: 'misc' } as never,
      ]);
      fallback();
      service.fetchAutocompleteSuggestions('').subscribe((suggestions) => {
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s) => s.type === 'command')).toBeTrue();
        done();
      });
    });

    it('proposes a stock symbol when the input looks like a ticker', (done) => {
      service['commandsCache$'].next([
        { name: 'CHART', description: 'chart', category: 'd', requiresSymbol: true } as never,
        { name: 'HELP', description: 'help', category: 'm', requiresSymbol: false } as never,
      ]);
      fallback();
      service.fetchAutocompleteSuggestions('AAPL').subscribe((suggestions) => {
        expect(suggestions[0].type).toBe('symbol');
        expect(suggestions[0].display).toBe('AAPL');
        // Should also include commands that requiresSymbol
        expect(suggestions.some((s) => s.type === 'command' && s.requiresSymbol)).toBeTrue();
        done();
      });
    });

    it('completes command names by prefix', (done) => {
      service['commandsCache$'].next([
        { name: 'CHART', description: 'chart', category: 'd' } as never,
        { name: 'CHAT', description: 'chat', category: 'd' } as never,
        { name: 'HELP', description: 'help', category: 'd' } as never,
      ]);
      fallback();
      service.fetchAutocompleteSuggestions('chart').subscribe((suggestions) => {
        const names = suggestions.map((s) => s.display);
        expect(names).toContain('CHART');
        done();
      });
    });
  });

  describe('Apollo wrappers', () => {
    it('loadCommands unwraps result.data.commands', (done) => {
      apollo.query.and.returnValue(of({ data: { commands: [{ name: 'X' }] } } as any));
      service.loadCommands().subscribe((commands) => {
        expect(commands.length).toBe(1);
        done();
      });
    });

    it('getCommand returns command on success', (done) => {
      apollo.query.and.returnValue(of({ data: { command: { name: 'X' } } } as any));
      service.getCommand('X').subscribe((cmd) => {
        expect(cmd.name).toBe('X');
        done();
      });
    });

    it('loadTerminalHints caches and uses cache on second call', (done) => {
      const hints = {
        quickExamples: ['AAPL CHART'],
        placeholderText: 'p',
        emptyStateMessage: 'e',
        dashboardHint: '',
        chartSuggestion: '',
      };
      apollo.query.and.returnValue(of({ data: { terminalHints: hints } } as any));
      service.loadTerminalHints().subscribe(() => {
        apollo.query.calls.reset();
        service.loadTerminalHints().subscribe((cached) => {
          expect(cached).toEqual(hints);
          expect(apollo.query).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('loadTerminalHints returns empty hints on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('500')));
      service.loadTerminalHints().subscribe((hints) => {
        expect(hints.quickExamples).toEqual([]);
        done();
      });
    });

    it('loadTerminalHelp returns help on success', (done) => {
      apollo.query.and.returnValue(
        of({ data: { terminalHelp: { overview: 'help', categories: [], aiNote: 'n' } } } as any),
      );
      service.loadTerminalHelp().subscribe((help) => {
        expect(help.overview).toBe('help');
        done();
      });
    });

    it('loadTerminalHelp returns fallback on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('500')));
      service.loadTerminalHelp().subscribe((help) => {
        expect(help.overview).toBe('');
        done();
      });
    });

    it('fetchQuote returns the quote object', (done) => {
      const quote = { symbol: 'AAPL', price: 200 };
      apollo.query.and.returnValue(of({ data: { quote } } as any));
      service.fetchQuote('AAPL').subscribe((result) => {
        expect(result).toEqual(quote as never);
        done();
      });
    });

    it('loadDashboards returns the array', (done) => {
      apollo.query.and.returnValue(of({ data: { dashboards: [{ id: 'd1' }] } } as any));
      service.loadDashboards().subscribe((dashboards) => {
        expect(dashboards.length).toBe(1);
        done();
      });
    });

    it('createDashboard returns the new dashboard', (done) => {
      apollo.mutate.and.returnValue(of({ data: { createDashboard: { dashboard: { id: 'd1', name: 'D' } } } } as any));
      service.createDashboard('D', 'desc').subscribe((dashboard) => {
        expect(dashboard.id).toBe('d1');
        done();
      });
    });
  });

  describe('chart update WS handler', () => {
    it('stores updates in activeCharts signal', () => {
      chartUpdate$.next({ chartId: 'c1', options: { title: { text: 'x' } } });
      expect(service.activeCharts().has('c1')).toBeTrue();
    });
  });

  describe('observable getters', () => {
    it('onCommandResult and friends return the ws service observables', () => {
      expect(service.onCommandResult).toBeDefined();
      expect(service.onCommandProgress).toBeDefined();
      expect(service.onChartUpdate).toBeDefined();
      expect(service.onSymbolUpdate).toBeDefined();
      expect(service.onError).toBeDefined();
      expect(service.commands$).toBeDefined();
    });
  });

  describe('GraphQL loaders', () => {
    it('fetchQuote unwraps the quote and falls back to null on errors', (done) => {
      apollo.query.and.returnValue(of({ data: { quote: { symbol: 'AAPL' } } }) as never);
      service.fetchQuote('AAPL').subscribe((result) => {
        expect(result?.symbol).toBe('AAPL');

        spyOn(console, 'warn');
        apollo.query.and.returnValue(throwError(() => new Error('offline')));
        service.fetchQuote('AAPL').subscribe((fallback) => {
          expect(fallback).toBeNull();
          done();
        });
      });
    });

    it('loadCommands caches results and recovers with an empty list', (done) => {
      apollo.query.and.returnValue(of({ data: { commands: [{ name: 'CHART' }] } }) as never);
      service.loadCommands('charting').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('CHART');

        apollo.query.and.returnValue(throwError(() => new Error('offline')));
        service.loadCommands().subscribe((fallback) => {
          expect(fallback).toEqual([]);
          done();
        });
      });
    });

    it('getCommand unwraps a single command', (done) => {
      apollo.query.and.returnValue(of({ data: { command: { name: 'HP' } } }) as never);
      service.getCommand('HP').subscribe((command) => {
        expect(command.name).toBe('HP');
        done();
      });
    });

    it('loadTerminalHints caches the first result and serves it thereafter', (done) => {
      const hints = {
        quickExamples: [],
        placeholderText: 'p',
        emptyStateMessage: 'e',
        dashboardHint: '',
        chartSuggestion: '',
      };
      apollo.query.and.returnValue(of({ data: { terminalHints: hints } }) as never);
      service.loadTerminalHints().subscribe((first) => {
        expect(first.placeholderText).toBe('p');
        apollo.query.calls.reset();
        service.loadTerminalHints().subscribe((cached) => {
          expect(cached).toEqual(first);
          expect(apollo.query).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('loadTerminalHints falls back to safe defaults on failure', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('offline')));
      service.loadTerminalHints().subscribe((hints) => {
        expect(hints.placeholderText).toContain('Type a command');
        expect(hints.quickExamples).toEqual([]);
        done();
      });
    });

    it('loadTerminalHelp unwraps help and falls back on failure', (done) => {
      apollo.query.and.returnValue(
        of({ data: { terminalHelp: { overview: 'o', categories: [], aiNote: 'n' } } }) as never,
      );
      service.loadTerminalHelp().subscribe((result) => {
        expect(result.overview).toBe('o');

        apollo.query.and.returnValue(throwError(() => new Error('offline')));
        service.loadTerminalHelp().subscribe((fallback) => {
          expect(fallback.overview).toBe('');
          expect(fallback.aiNote).toContain('natural language');
          done();
        });
      });
    });
  });
});
