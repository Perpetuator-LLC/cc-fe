// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal, inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, Subscription } from 'rxjs';
import { createClient, Client } from 'graphql-ws';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  CommandProgress,
  CommandResult,
  SymbolUpdate,
  TerminalConnectionState,
  AutocompleteSuggestion,
} from './terminal.types';
import { EChartsOption } from 'echarts';
import { Job } from '../jobs/job.service';

export interface ChartUpdate {
  chartId: string;
  options: EChartsOption;
  isNew: boolean;
}

export interface AutocompleteResponse {
  input: string;
  suggestions: AutocompleteSuggestion[];
  timestamp: string;
}

export interface HistorySearchResponse {
  query: string;
  results: HistorySearchResult[];
  total: number;
  timestamp: string;
}

export interface HistorySearchResult {
  id: string;
  rawInput: string;
  parsedCommand?: string;
  parsedSymbols?: string[];
  status: string;
  isAiInterpreted?: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class TerminalWebSocketService implements OnDestroy {
  private client: Client | null = null;
  private subscriptions = new Subscription();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: Subscription | null = null;
  private injector = inject(Injector);

  // Active GraphQL subscriptions
  private activeSubscriptions = new Map<string, () => void>();

  // Signals for reactive state
  private connectionStateSignal: WritableSignal<TerminalConnectionState> = signal('disconnected');

  // Subjects for different message types
  private commandResult$ = new Subject<CommandResult>();
  private commandProgress$ = new Subject<CommandProgress>();
  private chartUpdate$ = new Subject<ChartUpdate>();
  private symbolUpdate$ = new Subject<SymbolUpdate>();
  private autocomplete$ = new Subject<AutocompleteResponse>();
  private historySearch$ = new Subject<HistorySearchResponse>();
  private error$ = new Subject<string>();
  private connected$ = new Subject<{ userId: string; timestamp: string }>();

  // Job message subjects - forwarded to JobsWebSocketService
  private jobInitial$ = new Subject<Job[]>();
  private jobCreated$ = new Subject<Job>();
  private jobUpdated$ = new Subject<Job>();
  private jobCompleted$ = new Subject<Job>();
  private jobFailed$ = new Subject<Job>();

  constructor(private authService: AuthService) {
    // Auto-connect/disconnect based on auth state
    this.subscriptions.add(
      toObservable(this.authService.isLoggedIn).subscribe({
        next: (isLoggedIn) => {
          if (isLoggedIn) {
            this.connect();
          } else {
            this.disconnect();
          }
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscriptions.unsubscribe();
    this.commandResult$.complete();
    this.commandProgress$.complete();
    this.chartUpdate$.complete();
    this.symbolUpdate$.complete();
    this.autocomplete$.complete();
    this.historySearch$.complete();
    this.error$.complete();
    this.connected$.complete();
  }

  // ============================================================================
  // Public Getters
  // ============================================================================

  get connectionState(): WritableSignal<TerminalConnectionState> {
    return this.connectionStateSignal;
  }

  get onCommandResult() {
    return this.commandResult$.asObservable();
  }

  get onCommandProgress() {
    return this.commandProgress$.asObservable();
  }

  get onChartUpdate() {
    return this.chartUpdate$.asObservable();
  }

  get onSymbolUpdate() {
    return this.symbolUpdate$.asObservable();
  }

  get onAutocomplete() {
    return this.autocomplete$.asObservable();
  }

  get onHistorySearch() {
    return this.historySearch$.asObservable();
  }

  get onError() {
    return this.error$.asObservable();
  }

  get onConnected() {
    return this.connected$.asObservable();
  }

  // Job message observables - components can subscribe to these
  get onJobInitial() {
    return this.jobInitial$.asObservable();
  }

  get onJobCreated() {
    return this.jobCreated$.asObservable();
  }

  get onJobUpdated() {
    return this.jobUpdated$.asObservable();
  }

  get onJobCompleted() {
    return this.jobCompleted$.asObservable();
  }

  get onJobFailed() {
    return this.jobFailed$.asObservable();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  connect(): void {
    if (this.client) {
      return; // Already connected or connecting
    }

    this.connectionStateSignal.set('connecting');

    const wsUrl = this.buildWebSocketUrl();

    this.client = createClient({
      url: wsUrl,
      connectionParams: () => {
        const token = this.authService.getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      // Reconnection settings
      retryAttempts: this.maxReconnectAttempts,
      shouldRetry: () => this.authService.isLoggedIn(),
      retryWait: async (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
        const delay = Math.min(1000 * Math.pow(2, retries), 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      },
      keepAlive: 30000, // Send ping every 30 seconds
      lazy: false, // Connect immediately
      on: {
        connected: (socket) => {
          this.connectionStateSignal.set('connected');
          this.reconnectAttempts = 0;
          this.connected$.next({ userId: '', timestamp: new Date().toISOString() });
          const ws = socket as WebSocket;
          console.log('[TerminalWS] GraphQL WebSocket connected', { readyState: ws?.readyState });
        },
        closed: (event) => {
          this.connectionStateSignal.set('disconnected');
          const closeEvent = event as CloseEvent;
          console.log('[TerminalWS] GraphQL WebSocket CLOSED', {
            code: closeEvent?.code,
            reason: closeEvent?.reason,
            wasClean: closeEvent?.wasClean,
          });
        },
        error: (error) => {
          console.error('[TerminalWS] GraphQL WebSocket ERROR:', error);
          this.error$.next(error instanceof Error ? error.message : String(error));
        },
        connecting: () => {
          this.connectionStateSignal.set('connecting');
          console.log('[TerminalWS] GraphQL WebSocket connecting...');
        },
        message: (message) => {
          // Log all incoming messages to debug the disconnect issue
          console.log('[TerminalWS] Received message:', message);

          // Handle job-related custom messages
          // These are sent by the backend outside of the graphql-transport-ws protocol
          this.handleJobMessage(message);
        },
      },
    });
  }

  disconnect(): void {
    this.stopReconnectTimer();

    // Unsubscribe all active subscriptions
    this.activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.activeSubscriptions.clear();

    if (this.client) {
      this.client.dispose();
      this.client = null;
    }

    this.connectionStateSignal.set('disconnected');
  }

  // ============================================================================
  // Send Actions - Using GraphQL over WebSocket
  // ============================================================================

  /**
   * Execute a terminal command
   */
  execute(input: string): void {
    if (!this.client) {
      console.warn('[TerminalWS] Not connected, cannot execute command');
      return;
    }

    const mutation = `
      mutation ExecuteCommand($input: String!) {
        executeCommand(input: $input) {
          success
          message
          result {
            success
            message
            outputType
            data
            chartOptions
            metadata
            route {
              tab
              symbol
              exchange
              view
              interval
              period
              watchlistId
              dashboardId
              commandId
            }
          }
          execution {
            uuid
            rawInput
            parsedCommand
            status
          }
        }
      }
    `;

    const subId = `execute_${Date.now()}`;
    const unsubscribe = this.client.subscribe(
      { query: mutation, variables: { input: input.trim() } },
      {
        next: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = result.data as any;
          if (data?.executeCommand) {
            const execResult = data.executeCommand;
            this.commandResult$.next({
              success: execResult.success,
              message: execResult.message,
              outputType: execResult.result?.outputType || 'message',
              data: this.parseJsonField(execResult.result?.data) as CommandResult['data'],
              chartOptions: this.parseJsonField(execResult.result?.chartOptions) as CommandResult['chartOptions'],
              metadata: this.parseJsonField(execResult.result?.metadata) as CommandResult['metadata'],
              executionId: execResult.execution?.uuid,
              route: execResult.result?.route,
            });
          }
          if (result.errors) {
            this.error$.next(result.errors.map((e) => e.message).join(', '));
          }
        },
        error: (error) => {
          console.error('[TerminalWS] Execute error:', error);
          this.error$.next(error instanceof Error ? error.message : String(error));
        },
        complete: () => {
          this.activeSubscriptions.delete(subId);
        },
      },
    );
    this.activeSubscriptions.set(subId, unsubscribe);
  }

  /**
   * Request autocomplete suggestions
   */
  autocomplete(input: string, limit = 10): void {
    if (!this.client) {
      console.warn('[TerminalWS] Not connected, cannot autocomplete');
      return;
    }

    const query = `
      query Autocomplete($input: String!, $limit: Int) {
        autocomplete(input: $input, limit: $limit) {
          fqn
          display
          displaySecondary
          type
          description
          score
          category
          requiresSymbol
          aliasFor
          symbol
          name
          assetType
          exchange
          country
          currency
          isAmbiguous
        }
      }
    `;

    const subId = `autocomplete_${Date.now()}`;
    const unsubscribe = this.client.subscribe(
      { query, variables: { input: input.trim(), limit } },
      {
        next: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = result.data as any;
          if (data?.autocomplete) {
            this.autocomplete$.next({
              input: input.trim(),
              suggestions: data.autocomplete || [],
              timestamp: new Date().toISOString(),
            });
          }
          if (result.errors) {
            console.error('[TerminalWS] Autocomplete errors:', result.errors);
          }
        },
        error: (error) => {
          console.error('[TerminalWS] Autocomplete error:', error);
        },
        complete: () => {
          this.activeSubscriptions.delete(subId);
        },
      },
    );
    this.activeSubscriptions.set(subId, unsubscribe);
  }

  /**
   * Search command history with optional substring matching
   * @param query Search string
   * @param limit Maximum number of results
   * @param uniqueLatest If true (default), deduplicate results by command
   */
  searchHistory(query: string, limit = 5, uniqueLatest = true): void {
    if (!this.client) {
      console.warn('[TerminalWS] Not connected, cannot search history');
      return;
    }

    const gqlQuery = `
      query CommandHistory($first: Int, $search: String, $uniqueLatest: Boolean) {
        commandHistory(first: $first, search: $search, uniqueLatest: $uniqueLatest) {
          edges {
            node {
              id
              rawInput
              parsedCommand
              parsedSymbols
              status
              isAiInterpreted
              createdAt
            }
            cursor
            executionCount
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;

    const subId = `history_${Date.now()}`;
    const unsubscribe = this.client.subscribe(
      { query: gqlQuery, variables: { first: limit, search: query.trim() || null, uniqueLatest } },
      {
        next: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = result.data as any;
          if (data?.commandHistory) {
            const edges = data.commandHistory.edges || [];
            this.historySearch$.next({
              query: query.trim(),
              results: edges.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (edge: any) => ({
                  id: edge.node.id,
                  rawInput: edge.node.rawInput,
                  parsedCommand: edge.node.parsedCommand,
                  parsedSymbols: edge.node.parsedSymbols,
                  status: edge.node.status,
                  isAiInterpreted: edge.node.isAiInterpreted,
                  createdAt: edge.node.createdAt,
                }),
              ),
              total: data.commandHistory.totalCount || edges.length,
              timestamp: new Date().toISOString(),
            });
          }
          if (result.errors) {
            console.error('[TerminalWS] History search errors:', result.errors);
          }
        },
        error: (error) => {
          console.error('[TerminalWS] History search error:', error);
        },
        complete: () => {
          this.activeSubscriptions.delete(subId);
        },
      },
    );
    this.activeSubscriptions.set(subId, unsubscribe);
  }

  /**
   * Subscribe to chart updates via GraphQL subscription
   * Note: This uses a query to get initial chart data. Real-time updates
   * will come via subscriptions when the backend supports them.
   */
  subscribeChart(chartId: string): void {
    // For now, we'll use query to get chart data
    // Future: Use GraphQL subscription when backend adds support
    console.debug('[TerminalWS] Chart subscription requested:', chartId);
  }

  /**
   * Unsubscribe from chart updates
   */
  unsubscribeChart(chartId: string): void {
    const subId = `chart_${chartId}`;
    const unsubscribe = this.activeSubscriptions.get(subId);
    if (unsubscribe) {
      unsubscribe();
      this.activeSubscriptions.delete(subId);
    }
  }

  /**
   * Subscribe to real-time symbol price updates
   * Note: Currently a placeholder - will use GraphQL subscription when backend supports it
   */
  subscribeSymbols(symbols: string[]): void {
    // For now, log the subscription request
    // Future: Use GraphQL subscription for real-time symbol updates
    console.debug('[TerminalWS] Symbol subscription requested:', symbols);
  }

  /**
   * Unsubscribe from real-time symbol price updates
   */
  unsubscribeSymbols(symbols: string[]): void {
    symbols.forEach((symbol) => {
      const subId = `symbol_${symbol.toUpperCase()}`;
      const unsubscribe = this.activeSubscriptions.get(subId);
      if (unsubscribe) {
        unsubscribe();
        this.activeSubscriptions.delete(subId);
      }
    });
  }

  /**
   * Send a ping to keep the connection alive
   * Note: graphql-ws handles keep-alive automatically
   */
  ping(): void {
    // graphql-ws handles keep-alive automatically via the keepAlive option
    console.debug('[TerminalWS] Ping (handled automatically by graphql-ws)');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildWebSocketUrl(): string {
    const apiUrl = environment.API_URL;
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    // Use the unified GraphQL WebSocket endpoint
    return `${wsProtocol}://${wsHost}/ws/graphql/`;
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }
  }

  /**
   * Handle job-related messages from the backend.
   *
   * The backend now wraps job messages in valid graphql-transport-ws format:
   * { type: "next", id: "_jobs", payload: { data: { __typename: "JobsInitial", jobs: [...] } } }
   *
   * This allows them to pass through the graphql-ws library without causing protocol errors.
   */
  private handleJobMessage(message: unknown): void {
    // The message from graphql-ws callback is already parsed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = message as any;
    if (!msg) return;

    // NEW FORMAT: Check for wrapped graphql-transport-ws format (type: "next", id: "_jobs")
    if (msg.type === 'next' && msg.id === '_jobs') {
      const data = msg.payload?.data;
      if (!data) return;

      const typename = data.__typename;
      console.log(`[TerminalWS] Received job message: ${typename}`);

      switch (typename) {
        case 'JobsInitial':
          console.log(`[TerminalWS] Received JobsInitial: ${data.jobs?.length || 0} jobs`);
          if (data.jobs && Array.isArray(data.jobs)) {
            this.jobInitial$.next(data.jobs);
            this.forwardToJobsService('initial', data.jobs);
          }
          break;

        case 'JobCreated':
          console.log(`[TerminalWS] Job created: ${data.job?.uuid}`);
          if (data.job) {
            this.jobCreated$.next(data.job);
            this.forwardToJobsService('created', data.job);
          }
          break;

        case 'JobUpdate':
          console.log(`[TerminalWS] Job updated: ${data.job?.uuid} -> ${data.job?.status}`);
          if (data.job) {
            this.jobUpdated$.next(data.job);
            this.forwardToJobsService('update', data.job);
          }
          break;

        case 'JobCompleted':
          console.log(`[TerminalWS] Job completed: ${data.job?.uuid}`);
          if (data.job) {
            this.jobCompleted$.next(data.job);
            this.forwardToJobsService('completed', data.job);
          }
          break;

        case 'JobFailed':
          console.log(`[TerminalWS] Job failed: ${data.job?.uuid}`);
          if (data.job) {
            this.jobFailed$.next(data.job);
            this.forwardToJobsService('failed', data.job);
          }
          break;
      }
      return;
    }

    // LEGACY FORMAT: Handle old-style messages (type: "jobs.initial", etc.) for backwards compatibility
    if (!msg.type) return;

    switch (msg.type) {
      case 'jobs.initial':
        console.log(`[TerminalWS] Received jobs.initial (legacy): ${msg.jobs?.length || 0} jobs`);
        if (msg.jobs && Array.isArray(msg.jobs)) {
          this.jobInitial$.next(msg.jobs);
          this.forwardToJobsService('initial', msg.jobs);
        }
        break;

      case 'jobs.created':
        console.log(`[TerminalWS] Job created (legacy): ${msg.job?.uuid}`);
        if (msg.job) {
          this.jobCreated$.next(msg.job);
          this.forwardToJobsService('created', msg.job);
        }
        break;

      case 'jobs.update':
        console.log(`[TerminalWS] Job updated (legacy): ${msg.job?.uuid} -> ${msg.job?.status}`);
        if (msg.job) {
          this.jobUpdated$.next(msg.job);
          this.forwardToJobsService('update', msg.job);
        }
        break;

      case 'jobs.completed':
        console.log(`[TerminalWS] Job completed (legacy): ${msg.job?.uuid}`);
        if (msg.job) {
          this.jobCompleted$.next(msg.job);
          this.forwardToJobsService('completed', msg.job);
        }
        break;

      case 'jobs.failed':
        console.log(`[TerminalWS] Job failed (legacy): ${msg.job?.uuid}`);
        if (msg.job) {
          this.jobFailed$.next(msg.job);
          this.forwardToJobsService('failed', msg.job);
        }
        break;
    }
  }

  /**
   * Forward job messages to JobsWebSocketService
   * Uses lazy injection to avoid circular dependency
   */
  private forwardToJobsService(
    type: 'initial' | 'created' | 'update' | 'completed' | 'failed',
    data: Job | Job[],
  ): void {
    // Import JobsWebSocketService lazily to avoid circular dependency
    import('../jobs/jobs-websocket.service')
      .then(({ JobsWebSocketService }) => {
        const jobsService = this.injector.get(JobsWebSocketService);
        switch (type) {
          case 'initial':
            jobsService.handleInitialJobs(data as Job[]);
            break;
          case 'created':
          case 'update':
            jobsService.addJob(data as Job);
            break;
          case 'completed':
            jobsService.handleJobCompleted(data as Job);
            break;
          case 'failed':
            jobsService.handleJobFailed(data as Job);
            break;
        }
      })
      .catch((err) => {
        console.error('[TerminalWS] Failed to forward job message:', err);
      });
  }

  /**
   * Parse a JSON string field safely. Handles double-encoded JSON from GraphQL.
   * Returns the parsed object if input is a string, or the original value if already an object.
   */
  private parseJsonField(value: unknown): unknown {
    if (value === null || value === undefined) {
      return undefined;
    }

    // Keep parsing while it's a string (handles double-encoded JSON)
    let result = value;
    let parseAttempts = 0;
    const maxAttempts = 5; // Safety limit

    while (typeof result === 'string' && parseAttempts < maxAttempts) {
      try {
        result = JSON.parse(result);
        parseAttempts++;
        console.debug('[TerminalWS] parseJsonField: parse attempt', parseAttempts, 'result type:', typeof result);
      } catch {
        // Not valid JSON, return as-is
        console.debug('[TerminalWS] parseJsonField: not JSON, keeping as string');
        return result;
      }
    }

    if (parseAttempts > 0) {
      console.debug('[TerminalWS] parseJsonField: parsed', parseAttempts, 'time(s), final type:', typeof result);
    }

    return result;
  }
}
