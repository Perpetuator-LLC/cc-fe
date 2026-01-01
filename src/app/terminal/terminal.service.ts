// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap, take } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';
import { TerminalWebSocketService, ChartUpdate } from './terminal-websocket.service';
import { JobsWebSocketService } from '../jobs/jobs-websocket.service';
import { WatchlistService } from './watchlist.service';
import {
  AutocompleteSuggestion,
  Command,
  CommandHistoryItem,
  CommandProgress,
  CommandResult,
  Dashboard,
  HistoryEntry,
  SymbolUpdate,
  TerminalConnectionState,
  TerminalHints,
  TerminalHelp,
} from './terminal.types';
import { EChartsOption } from 'echarts';

// ============================================================================
// GraphQL Queries
// ============================================================================

const GET_COMMANDS = gql`
  query GetCommands($category: String, $isActive: Boolean) {
    commands(category: $category, isActive: $isActive) {
      id
      name
      description
      category
      aliases
      requiresSymbol
      exampleUsage
      outputType
      chartType
      creditsCost
    }
  }
`;

const GET_COMMAND = gql`
  query GetCommand($name: String!) {
    command(name: $name) {
      id
      name
      description
      category
      requiresSymbol
      parametersSchema
      exampleUsage
      outputType
      chartType
      creditsCost
      aliases
    }
  }
`;

const GET_COMMAND_HISTORY = gql`
  query GetCommandHistory($limit: Int) {
    commandHistory(limit: $limit) {
      id
      rawInput
      parsedCommand
      parsedSymbols
      isAiInterpreted
      aiReasoning
      status
      result
      error
      createdAt
      completedAt
      creditsCharged
    }
  }
`;

const EXECUTE_COMMAND = gql`
  mutation ExecuteCommand($input: String!, $useAiFallback: Boolean) {
    executeCommand(input: $input, useAiFallback: $useAiFallback) {
      success
      message
      result {
        success
        message
        outputType
        data
        chartOptions
        metadata
      }
      execution {
        id
        status
        rawInput
        parsedCommand
      }
      job {
        id
        status
      }
    }
  }
`;

const CREATE_DASHBOARD = gql`
  mutation CreateDashboard($name: String!, $description: String) {
    createDashboard(name: $name, description: $description) {
      success
      message
      dashboard {
        id
        name
        description
        columns
        rowHeight
        isDefault
        panels {
          id
          gridX
          gridY
          gridW
          gridH
          titleOverride
          chart {
            id
            name
            chartType
            options
          }
        }
      }
    }
  }
`;

const GET_DASHBOARDS = gql`
  query GetDashboards {
    dashboards {
      id
      name
      description
      columns
      rowHeight
      isDefault
      isPublic
      autoRefresh
      refreshInterval
      createdAt
      updatedAt
    }
  }
`;

const GET_TERMINAL_HINTS = gql`
  query GetTerminalHints {
    terminalHints {
      quickExamples
      placeholderText
      emptyStateMessage
      dashboardHint
      chartSuggestion
    }
  }
`;

const GET_TERMINAL_HELP = gql`
  query GetTerminalHelp {
    terminalHelp {
      overview
      categories {
        name
        categoryKey
        commands {
          name
          description
          exampleUsage
          aliases
        }
      }
      aiNote
    }
  }
`;

const GET_AUTOCOMPLETE = gql`
  query GetAutocomplete($input: String!, $limit: Int) {
    autocomplete(input: $input, limit: $limit) {
      fqn
      display
      displaySecondary
      type
      description
      category
      symbol
      name
      exchange
      assetType
    }
  }
`;

// ============================================================================
// Response Interfaces
// ============================================================================

interface CommandsResult {
  commands: Command[];
}

interface CommandQueryResult {
  command: Command;
}

interface CommandHistoryResult {
  commandHistory: CommandHistoryItem[];
}

interface ExecuteCommandResult {
  executeCommand: {
    success: boolean;
    message: string;
    result: CommandResult;
    execution: { id: string; status: string };
    job: { id: string; status: string };
  };
}

interface CreateDashboardResult {
  createDashboard: {
    success: boolean;
    dashboard: Dashboard;
  };
}

interface DashboardsResult {
  dashboards: Dashboard[];
}

interface TerminalHintsResult {
  terminalHints: TerminalHints;
}

interface TerminalHelpResult {
  terminalHelp: TerminalHelp;
}

interface AutocompleteResult {
  autocomplete: AutocompleteSuggestion[];
}

@Injectable({
  providedIn: 'root',
})
export class TerminalService implements OnDestroy {
  private subscriptions = new Subscription();

  // Session history (in-memory for current session, shows in terminal modal)
  private historySignal: WritableSignal<HistoryEntry[]> = signal([]);

  // Full command history (strings only, for up/down arrow navigation)
  private commandHistorySignal: WritableSignal<string[]> = signal([]);
  private historyIndex = -1;

  // User history from server (persists across sessions, shows in History tab)
  private userHistorySignal: WritableSignal<CommandHistoryItem[]> = signal([]);

  // Commands registry cache
  private commandsCache$ = new BehaviorSubject<Command[]>([]);

  // Terminal hints cache (loaded from backend)
  private hintsCache$ = new BehaviorSubject<TerminalHints | null>(null);

  // Currently active charts (subscribed for real-time updates)
  private activeChartsSignal: WritableSignal<Map<string, EChartsOption>> = signal(new Map());

  // Track pending jobs for auto-retry (jobId -> original command input)
  private pendingJobCommands = new Map<string, string>();

  // Track background refresh jobs (refreshJobId -> { command, historyIndex })
  // These silently update the chart when complete, don't re-execute
  private backgroundRefreshJobs = new Map<string, { command: string; historyIndex: number }>();

  // Throttle protection: track recent commands to prevent rapid re-execution
  private recentCommands = new Map<string, number>(); // command -> timestamp
  private readonly COMMAND_THROTTLE_MS = 1000; // Minimum 1 second between identical commands

  constructor(
    private wsService: TerminalWebSocketService,
    private jobsWsService: JobsWebSocketService,
    private watchlistService: WatchlistService,
    private apollo: Apollo,
  ) {
    this.setupSubscriptions();
    this.initializeFromBackend();
  }

  /**
   * Load initial data from backend (commands and hints)
   */
  private initializeFromBackend(): void {
    // Load commands for local autocomplete fallback
    this.loadCommands().pipe(take(1)).subscribe();
    // Load hints for example suggestions
    this.loadTerminalHints().pipe(take(1)).subscribe();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ============================================================================
  // Public Getters
  // ============================================================================

  get connectionState(): WritableSignal<TerminalConnectionState> {
    return this.wsService.connectionState;
  }

  /**
   * Session history - in-memory for current session, shows in terminal modal
   */
  get history(): WritableSignal<HistoryEntry[]> {
    return this.historySignal;
  }

  /**
   * Command strings only - for up/down arrow navigation
   */
  get commandHistory(): WritableSignal<string[]> {
    return this.commandHistorySignal;
  }

  /**
   * User history from server - persists across sessions, shows in History tab
   */
  get userHistory(): WritableSignal<CommandHistoryItem[]> {
    return this.userHistorySignal;
  }

  get activeCharts(): WritableSignal<Map<string, EChartsOption>> {
    return this.activeChartsSignal;
  }

  get onCommandResult(): Observable<CommandResult> {
    return this.wsService.onCommandResult;
  }

  get onCommandProgress(): Observable<CommandProgress> {
    return this.wsService.onCommandProgress;
  }

  get onChartUpdate(): Observable<ChartUpdate> {
    return this.wsService.onChartUpdate;
  }

  get onSymbolUpdate(): Observable<SymbolUpdate> {
    return this.wsService.onSymbolUpdate;
  }

  get onError(): Observable<string> {
    return this.wsService.onError;
  }

  get commands$(): Observable<Command[]> {
    return this.commandsCache$.asObservable();
  }

  // ============================================================================
  // Command Execution
  // ============================================================================

  /**
   * Execute a command via WebSocket (preferred for real-time feedback)
   */
  execute(input: string): HistoryEntry {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      throw new Error('Empty command');
    }

    // Throttle protection: prevent rapid duplicate commands
    const now = Date.now();
    const lastExecutionTime = this.recentCommands.get(trimmedInput);
    if (lastExecutionTime && now - lastExecutionTime < this.COMMAND_THROTTLE_MS) {
      // Return the last history entry instead of creating a new one
      const history = this.historySignal();
      return history[history.length - 1] || { input: trimmedInput, timestamp: new Date(), isLoading: false };
    }
    this.recentCommands.set(trimmedInput, now);

    // Clean up old entries from recentCommands (keep last 5 seconds of commands)
    const cutoff = now - 5000;
    for (const [cmd, time] of this.recentCommands.entries()) {
      if (time < cutoff) {
        this.recentCommands.delete(cmd);
      }
    }

    // Add to command history
    const commands = this.commandHistorySignal();
    this.commandHistorySignal.set([...commands, trimmedInput]);
    this.historyIndex = commands.length + 1;

    // Create history entry
    const entry: HistoryEntry = {
      input: trimmedInput,
      timestamp: new Date(),
      isLoading: true,
    };

    // Add to history
    const history = this.historySignal();
    this.historySignal.set([...history, entry]);

    // Execute via WebSocket
    this.wsService.execute(trimmedInput);

    return entry;
  }

  /**
   * Execute a command via GraphQL (alternative for when WebSocket is unavailable)
   */
  executeViaGraphQL(input: string, useAiFallback = true): Observable<CommandResult> {
    return this.apollo
      .mutate<ExecuteCommandResult>({
        mutation: EXECUTE_COMMAND,
        variables: { input, useAiFallback },
      })
      .pipe(map((result) => result.data!.executeCommand.result));
  }

  // ============================================================================
  // Command History Navigation
  // ============================================================================

  /**
   * Navigate command history (for arrow up/down)
   */
  navigateHistory(direction: -1 | 1): string {
    const commands = this.commandHistorySignal();
    const newIndex = this.historyIndex + direction;

    if (newIndex >= 0 && newIndex < commands.length) {
      this.historyIndex = newIndex;
      return commands[newIndex];
    } else if (newIndex >= commands.length) {
      this.historyIndex = commands.length;
      return '';
    }

    return commands[this.historyIndex] || '';
  }

  /**
   * Reset history index (when user starts typing)
   */
  resetHistoryIndex(): void {
    this.historyIndex = this.commandHistorySignal().length;
  }

  // ============================================================================
  // Chart Subscriptions
  // ============================================================================

  /**
   * Subscribe to chart updates
   */
  subscribeChart(chartId: string): void {
    this.wsService.subscribeChart(chartId);
  }

  /**
   * Unsubscribe from chart updates
   */
  unsubscribeChart(chartId: string): void {
    this.wsService.unsubscribeChart(chartId);
    const charts = this.activeChartsSignal();
    charts.delete(chartId);
    this.activeChartsSignal.set(new Map(charts));
  }

  /**
   * Subscribe to real-time symbol price updates
   */
  subscribeSymbols(symbols: string[]): void {
    this.wsService.subscribeSymbols(symbols);
  }

  /**
   * Unsubscribe from real-time symbol price updates
   */
  unsubscribeSymbols(symbols: string[]): void {
    this.wsService.unsubscribeSymbols(symbols);
  }

  // ============================================================================
  // GraphQL Queries
  // ============================================================================

  /**
   * Load available commands from backend registry
   */
  loadCommands(category?: string, isActive = true): Observable<Command[]> {
    return this.apollo
      .query<CommandsResult>({
        query: GET_COMMANDS,
        variables: { category, isActive },
      })
      .pipe(
        map((result) => {
          const commands = result.data.commands;
          this.commandsCache$.next(commands);
          return commands;
        }),
        catchError(() => {
          // Fallback to empty array if query fails
          return of([]);
        }),
      );
  }

  /**
   * Get a specific command by name
   */
  getCommand(name: string): Observable<Command> {
    return this.apollo
      .query<CommandQueryResult>({
        query: GET_COMMAND,
        variables: { name },
      })
      .pipe(map((result) => result.data.command));
  }

  /**
   * Load terminal hints for empty states and placeholders
   */
  loadTerminalHints(): Observable<TerminalHints> {
    // Return cached if available
    if (this.hintsCache$.getValue()) {
      return of(this.hintsCache$.getValue()!);
    }

    return this.apollo
      .query<TerminalHintsResult>({
        query: GET_TERMINAL_HINTS,
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.terminalHints),
        tap((hints) => this.hintsCache$.next(hints)),
        catchError(() => {
          // Return empty structure if query fails (no hardcoded defaults)
          const emptyHints: TerminalHints = {
            quickExamples: [],
            placeholderText: 'Type a command or ask a question...',
            emptyStateMessage: 'Type a symbol or command to get started',
            dashboardHint: '',
            chartSuggestion: '',
          };
          this.hintsCache$.next(emptyHints);
          return of(emptyHints);
        }),
      );
  }

  /**
   * Load terminal help with commands grouped by category
   */
  loadTerminalHelp(): Observable<TerminalHelp> {
    return this.apollo
      .query<TerminalHelpResult>({
        query: GET_TERMINAL_HELP,
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.terminalHelp),
        catchError(() => {
          // Return empty structure if query fails
          return of({
            overview: '',
            categories: [],
            aiNote: 'You can also type natural language questions and our AI will interpret them for you.',
          });
        }),
      );
  }

  /**
   * Load command history from server (user's full command history)
   * Updates both userHistorySignal (for History tab) and commandHistorySignal (for up/down navigation)
   */
  loadCommandHistory(limit = 100): Observable<CommandHistoryItem[]> {
    return this.apollo
      .query<CommandHistoryResult>({
        query: GET_COMMAND_HISTORY,
        variables: { limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.commandHistory),
        tap((history) => {
          // Update user history signal
          this.userHistorySignal.set(history);
          // Extract just the command strings for up/down navigation (oldest first)
          const commands = history.map((h) => h.rawInput).reverse();
          // Merge with any new session commands not yet on server
          const currentCommands = this.commandHistorySignal();
          const serverCommandSet = new Set(commands);
          const newSessionCommands = currentCommands.filter((c) => !serverCommandSet.has(c));
          this.commandHistorySignal.set([...commands, ...newSessionCommands]);
        }),
      );
  }

  /**
   * Load user's dashboards
   */
  loadDashboards(): Observable<Dashboard[]> {
    return this.apollo
      .query<DashboardsResult>({
        query: GET_DASHBOARDS,
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data.dashboards));
  }

  /**
   * Create a new dashboard
   */
  createDashboard(name: string, description?: string): Observable<Dashboard> {
    return this.apollo
      .mutate<CreateDashboardResult>({
        mutation: CREATE_DASHBOARD,
        variables: { name, description },
      })
      .pipe(map((result) => result.data!.createDashboard.dashboard));
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Manually connect to WebSocket (usually auto-connects on login)
   */
  connect(): void {
    this.wsService.connect();
  }

  /**
   * Manually disconnect from WebSocket
   */
  disconnect(): void {
    this.wsService.disconnect();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.wsService.connectionState() === 'connected';
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear local history
   */
  clearHistory(): void {
    this.historySignal.set([]);
  }

  /**
   * Get suggestions for autocomplete based on partial input
   * @deprecated Use fetchAutocompleteSuggestions instead
   */
  getSuggestions(partial: string): Command[] {
    const commands = this.commandsCache$.getValue();
    const upperPartial = partial.toUpperCase();

    return commands.filter(
      (cmd) =>
        cmd.name.toUpperCase().startsWith(upperPartial) ||
        cmd.aliases?.some((alias) => alias.toUpperCase().startsWith(upperPartial)),
    );
  }

  /**
   * Fetch autocomplete suggestions from backend API
   * Returns an Observable of suggestions in FQN format
   *
   * NOTE: Temporarily using local suggestions while backend schema is updated.
   * TODO: Re-enable backend call once backend adds required fields
   */
  fetchAutocompleteSuggestions(input: string, limit = 10): Observable<AutocompleteSuggestion[]> {
    console.log('[TerminalService] fetchAutocompleteSuggestions called with:', { input, limit });

    // Call backend autocomplete API
    return this.apollo
      .query<AutocompleteResult>({
        query: GET_AUTOCOMPLETE,
        variables: { input, limit },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          console.log('[TerminalService] Autocomplete raw response:', result.data.autocomplete);
          const mapped = result.data.autocomplete.map((s) => this.mapToFqnFormat(s));
          console.log('[TerminalService] Autocomplete mapped response:', mapped);
          return mapped;
        }),
        catchError((error) => {
          console.error('[TerminalService] Autocomplete error:', error);
          if (error.graphQLErrors && error.graphQLErrors.length > 0) {
            console.error('[TerminalService] GraphQL errors:', error.graphQLErrors);
            error.graphQLErrors.forEach((gqlErr: { message: string }) => {
              console.error('[TerminalService] GraphQL error message:', gqlErr.message);
            });
          }
          if (error.networkError?.result) {
            console.error('[TerminalService] Network error result:', error.networkError.result);
            // Try to extract error messages from the result
            const result = error.networkError.result as { errors?: { message: string }[] };
            if (result.errors && Array.isArray(result.errors)) {
              result.errors.forEach((err: { message: string }) => {
                console.error('[TerminalService] Backend error:', err.message);
              });
            }
          }
          // Fallback to local suggestions on error
          return of(this.getLocalAutocompleteSuggestions(input, limit));
        }),
      );
  }

  /**
   * Map backend autocomplete response to FQN format
   * This provides compatibility until backend fully implements FQN
   */
  private mapToFqnFormat(suggestion: AutocompleteSuggestion): AutocompleteSuggestion {
    // If backend already provides fqn, use it
    if (suggestion.fqn) {
      return suggestion;
    }

    // Generate FQN from legacy fields
    let fqn = suggestion.insert || suggestion.text || suggestion.display;

    // Convert to proper FQN format based on type
    if (suggestion.type === 'command' || suggestion.type === 'alias') {
      const cmdName = suggestion.text || suggestion.display?.split(' ')[0] || '';
      fqn = `COMMAND:${cmdName.toUpperCase()}`;
    } else if (suggestion.type === 'symbol' || suggestion.type === 'stock') {
      const symbol = suggestion.text || suggestion.display?.split(' ')[0] || '';
      const exchange = suggestion.exchange || 'UNKNOWN';
      fqn = `STOCK:${exchange.toUpperCase()}:${symbol.toUpperCase()}`;
    } else if (suggestion.type === 'crypto') {
      const symbol = suggestion.text || '';
      const exchange = suggestion.exchange || 'UNKNOWN';
      fqn = `CRYPTO:${exchange.toUpperCase()}:${symbol.toUpperCase()}`;
    }

    return {
      ...suggestion,
      fqn,
      displaySecondary: suggestion.displaySecondary || suggestion.description,
      score: suggestion.score ?? 50,
    };
  }

  /**
   * Get autocomplete suggestions synchronously (local fallback)
   * Used as fallback when backend is unavailable
   */
  getAutocompleteSuggestions(input: string, limit = 10): AutocompleteSuggestion[] {
    return this.getLocalAutocompleteSuggestions(input, limit);
  }

  /**
   * Local autocomplete suggestions (fallback when backend unavailable)
   * Uses FQN format for consistency with backend
   * @internal
   */
  private getLocalAutocompleteSuggestions(input: string, limit = 10): AutocompleteSuggestion[] {
    const trimmedInput = input.trim();
    const tokens = trimmedInput.split(/\s+/);
    const commands = this.commandsCache$.getValue();
    const suggestions: AutocompleteSuggestion[] = [];

    // Empty input - show recent history and commands from backend
    if (!trimmedInput) {
      // Add recent history first
      const history = this.commandHistorySignal();
      for (let i = 0; i < Math.min(3, history.length); i++) {
        suggestions.push({
          fqn: history[i],
          display: history[i],
          type: 'history',
          description: 'Recent command',
          score: 100 - i,
        });
      }

      // Add examples from backend hints if available
      const hints = this.hintsCache$.getValue();
      if (hints?.quickExamples) {
        for (let i = 0; i < hints.quickExamples.length && suggestions.length < limit; i++) {
          const example = hints.quickExamples[i];
          suggestions.push({
            fqn: example,
            display: example,
            displaySecondary: 'Example command',
            type: 'example',
            description: 'Example command',
            score: 80 - i,
          });
        }
      }

      // Add some commands from cache if we have room
      for (const cmd of commands) {
        if (suggestions.length >= limit) break;
        suggestions.push({
          fqn: `COMMAND:${cmd.name}`,
          display: cmd.name,
          displaySecondary: cmd.description,
          type: 'command',
          description: cmd.description,
          category: cmd.category,
          requiresSymbol: cmd.requiresSymbol,
          score: 60,
        });
      }

      return suggestions.slice(0, limit);
    }

    const lastToken = tokens[tokens.length - 1].toUpperCase();
    const hasSymbol = tokens.length > 0 && this.looksLikeSymbol(tokens[0]);

    // Check if last token starts with '-' (parameter)
    if (lastToken.startsWith('-')) {
      // Find the command to get its parameters
      const commandToken = hasSymbol && tokens.length > 1 ? tokens[1].toUpperCase() : tokens[0].toUpperCase();
      const command = commands.find((c) => c.name === commandToken);

      if (command?.parametersSchema) {
        try {
          const schema = JSON.parse(command.parametersSchema);
          const properties = schema.properties || {};
          const paramPartial = lastToken.slice(1); // Remove the '-'

          for (const [paramName, paramDef] of Object.entries(properties)) {
            const def = paramDef as { type?: string; default?: string; enum?: string[]; description?: string };
            if (paramName.toUpperCase().startsWith(paramPartial.toUpperCase())) {
              suggestions.push({
                fqn: `-${paramName}`,
                display: `-${paramName}${def.default ? ` (default: ${def.default})` : ''}`,
                type: 'parameter',
                description: def.description || `Parameter for ${command.name}`,
                score: 90,
                paramType: def.type,
                choices: def.enum,
                default: def.default,
              });
            }
          }
        } catch {
          // Invalid JSON schema, skip parameter suggestions
        }
      }
      return suggestions.slice(0, limit);
    }

    // If we have a symbol, filter to commands that require symbols
    if (hasSymbol && tokens.length === 1) {
      // User typed what looks like a symbol - suggest the symbol itself first
      const symbolUpper = tokens[0].toUpperCase();
      suggestions.push({
        fqn: `STOCK:UNKNOWN:${symbolUpper}`,
        display: symbolUpper,
        displaySecondary: `Look up ${symbolUpper}`,
        type: 'symbol',
        description: `Stock symbol ${symbolUpper}`,
        score: 95,
      });

      // Then suggest commands that work with symbols
      for (const cmd of commands.filter((c) => c.requiresSymbol)) {
        suggestions.push({
          fqn: `COMMAND:${cmd.name}`,
          display: cmd.name,
          displaySecondary: cmd.description,
          type: 'command',
          description: cmd.description,
          category: cmd.category,
          requiresSymbol: true,
          score: 85,
        });
        if (suggestions.length >= limit) break;
      }
      return suggestions;
    }

    // Match commands and aliases
    for (const cmd of commands) {
      if (cmd.name.toUpperCase().startsWith(lastToken)) {
        suggestions.push({
          fqn: `COMMAND:${cmd.name}`,
          display: cmd.name,
          displaySecondary: cmd.description,
          type: 'command',
          description: cmd.description,
          category: cmd.category,
          requiresSymbol: cmd.requiresSymbol,
          score: 90,
        });
      }

      // Check aliases
      if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          if (alias.toUpperCase().startsWith(lastToken)) {
            suggestions.push({
              fqn: `COMMAND:${cmd.name}`,
              display: `${alias} → ${cmd.name}`,
              displaySecondary: cmd.description,
              type: 'alias',
              description: cmd.description,
              category: cmd.category,
              aliasFor: cmd.name,
              requiresSymbol: cmd.requiresSymbol,
              score: 85,
            });
          }
        }
      }

      if (suggestions.length >= limit) break;
    }

    // Add matching history entries
    const history = this.commandHistorySignal();
    for (const cmd of history) {
      if (cmd.toUpperCase().startsWith(trimmedInput.toUpperCase()) && !suggestions.find((s) => s.fqn === cmd)) {
        suggestions.push({
          fqn: cmd,
          display: cmd,
          type: 'history',
          description: 'Recent command',
          score: 80,
        });
        if (suggestions.length >= limit) break;
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Check if a token looks like a stock symbol
   */
  private looksLikeSymbol(token: string): boolean {
    // Stock symbols are 1-5 uppercase letters, optionally with a suffix like .A or .B
    return /^[A-Za-z]{1,5}(\.[A-Za-z])?$/.test(token);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupSubscriptions(): void {
    // Handle command results
    this.subscriptions.add(
      this.wsService.onCommandResult.subscribe((result) => {
        this.updateLastHistoryEntry(result);
      }),
    );

    // Handle command progress
    this.subscriptions.add(
      this.wsService.onCommandProgress.subscribe((progress) => {
        this.updateLastHistoryProgress(progress);
      }),
    );

    // Handle chart updates
    this.subscriptions.add(
      this.wsService.onChartUpdate.subscribe((update) => {
        const charts = this.activeChartsSignal();
        charts.set(update.chartId, update.options);
        this.activeChartsSignal.set(new Map(charts));
      }),
    );

    // Handle job completions - re-run pending commands or update background refreshes
    this.subscriptions.add(
      this.jobsWsService.jobCompleted$.subscribe((job) => {
        const jobId = job.uuid;

        // Check for pending command (needs re-execution)
        const pendingCommand = this.pendingJobCommands.get(jobId);
        if (pendingCommand) {
          this.pendingJobCommands.delete(jobId);
          // Re-execute the command now that data should be available
          this.execute(pendingCommand);
          return;
        }

        // Check for background refresh (silently update chart data)
        const refreshJob = this.backgroundRefreshJobs.get(jobId);
        if (refreshJob) {
          this.backgroundRefreshJobs.delete(jobId);
          // Re-execute the command to get fresh data and update the chart
          this.refreshHistoryEntry(refreshJob.command, refreshJob.historyIndex);
        }
      }),
    );

    // Handle job failures
    this.subscriptions.add(
      this.jobsWsService.jobFailed$.subscribe((job) => {
        const jobId = job.uuid;

        // Check for pending command (needs re-execution)
        const pendingCommand = this.pendingJobCommands.get(jobId);
        if (pendingCommand) {
          this.pendingJobCommands.delete(jobId);
          // Job failed - update the last history entry (which is showing the fetching state)
          this.updateLastHistoryWithError(`Data fetch failed: ${job.error || 'Unknown error'}`);
        }

        // Check for background refresh (silently ignore failures - user still has cached data)
        const refreshJob = this.backgroundRefreshJobs.get(jobId);
        if (refreshJob) {
          this.backgroundRefreshJobs.delete(jobId);
        }
      }),
    );
  }

  private updateLastHistoryEntry(result: CommandResult): void {
    const history = this.historySignal();
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    const historyIndex = history.length - 1;

    // Check if this is a "fetching" response - track the job for auto-retry
    if (this.isFetchingResponse(result)) {
      const jobId = this.extractJobId(result);
      if (jobId) {
        this.pendingJobCommands.set(jobId, lastEntry.input);
      }
    } else if (result.success) {
      // Track symbol in search history on successful execution
      this.trackSymbolFromResult(result, lastEntry.input);

      // Check if there's a background refresh happening
      const metadata = result.metadata as { refreshing?: boolean; refreshJobId?: string } | undefined;
      if (metadata?.refreshing && metadata?.refreshJobId) {
        // Track background refresh - when it completes, we'll update the chart
        this.backgroundRefreshJobs.set(metadata.refreshJobId, {
          command: lastEntry.input,
          historyIndex,
        });
      }
    }

    const updatedEntry: HistoryEntry = {
      ...lastEntry,
      result,
      isLoading: result.requiresAI || this.isFetchingResponse(result),
    };

    this.historySignal.set([...history.slice(0, -1), updatedEntry]);
  }

  /**
   * Track symbol in search history when a command is executed
   */
  private trackSymbolFromResult(result: CommandResult, input: string): void {
    // Try to get symbol from metadata first
    const metadata = result.metadata as { symbol?: string } | undefined;
    let symbol = metadata?.symbol;

    // If no symbol in metadata, try to extract from input
    if (!symbol) {
      const parts = input.trim().toUpperCase().split(/\s+/);
      if (parts.length > 0 && this.looksLikeSymbol(parts[0])) {
        symbol = parts[0];
      }
    }

    if (symbol) {
      // Add to watchlist (fire and forget - don't block on response)
      this.subscriptions.add(
        this.watchlistService.addToWatchlist(symbol).subscribe({
          next: (response) => {
            if (response.success) {
              // Refresh recent symbols
              this.watchlistService.loadRecentSymbols(10).subscribe();
            }
          },
          error: () => {
            // Silent failure - don't spam console for tracking failures
          },
        }),
      );
    }
  }

  /**
   * Check if the result indicates data is being fetched
   */
  private isFetchingResponse(result: CommandResult): boolean {
    if (result.data && typeof result.data === 'object') {
      const data = result.data as { status?: string };
      return data.status === 'fetching';
    }
    return false;
  }

  /**
   * Extract job ID from a fetching response
   */
  private extractJobId(result: CommandResult): string | null {
    if (result.data && typeof result.data === 'object') {
      const data = result.data as { jobId?: string };
      if (data.jobId) return data.jobId;
    }
    if (result.metadata && typeof result.metadata === 'object') {
      const metadata = result.metadata as { jobId?: string };
      if (metadata.jobId) return metadata.jobId;
    }
    return null;
  }

  /**
   * Update the last history entry with an error (for when a fetch job fails)
   */
  private updateLastHistoryWithError(errorMessage: string): void {
    const history = this.historySignal();
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    const updatedEntry: HistoryEntry = {
      ...lastEntry,
      isLoading: false,
      result: {
        success: false,
        message: errorMessage,
        outputType: 'message',
      },
    };

    this.historySignal.set([...history.slice(0, -1), updatedEntry]);
  }

  private updateLastHistoryProgress(progress: CommandProgress): void {
    const history = this.historySignal();
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    const updatedEntry: HistoryEntry = {
      ...lastEntry,
      progress,
      isLoading: progress.progress < 100,
    };

    this.historySignal.set([...history.slice(0, -1), updatedEntry]);
  }

  /**
   * Refresh a specific history entry with fresh data (for background refresh completion)
   * This re-executes the command but updates the specific history entry instead of adding a new one
   */
  private refreshHistoryEntry(command: string, historyIndex: number): void {
    // Send the command through WebSocket to get fresh data
    this.wsService.execute(command);

    // Subscribe to the next result to update the specific history entry
    const subscription = this.wsService.onCommandResult.pipe(take(1)).subscribe((result) => {
      const history = this.historySignal();
      if (historyIndex >= 0 && historyIndex < history.length) {
        const existingEntry = history[historyIndex];

        // Only update if it's the same command
        if (existingEntry.input === command) {
          const updatedEntry: HistoryEntry = {
            ...existingEntry,
            result,
            timestamp: new Date(), // Update timestamp to show refresh time
          };

          const newHistory = [...history];
          newHistory[historyIndex] = updatedEntry;
          this.historySignal.set(newHistory);
        }
      }
      subscription.unsubscribe();
    });

    // Clean up subscription after timeout
    setTimeout(() => subscription.unsubscribe(), 30000);
  }
}
