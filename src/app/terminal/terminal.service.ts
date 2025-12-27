// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs';
import { map, filter, catchError, tap } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';
import { TerminalWebSocketService, ChartUpdate } from './terminal-websocket.service';
import { JobsWebSocketService } from '../jobs/jobs-websocket.service';
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

  // Currently active charts (subscribed for real-time updates)
  private activeChartsSignal: WritableSignal<Map<string, EChartsOption>> = signal(new Map());

  // Track pending jobs for auto-retry (jobId -> original command input)
  private pendingJobCommands = new Map<string, string>();

  constructor(
    private wsService: TerminalWebSocketService,
    private jobsWsService: JobsWebSocketService,
    private apollo: Apollo,
  ) {
    this.setupSubscriptions();
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
    return this.apollo
      .query<TerminalHintsResult>({
        query: GET_TERMINAL_HINTS,
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.terminalHints),
        catchError(() => {
          // Return defaults if query fails
          return of({
            quickExamples: ['AAPL GP', 'HELP', 'MSFT DES'],
            placeholderText: 'Type a command or ask a question...',
            emptyStateMessage: 'Try: AAPL GP, HELP, or ask anything',
            dashboardHint: 'Run chart commands like AAPL GP to populate your dashboard',
            chartSuggestion: 'AAPL GP',
          });
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
   * @deprecated Use getAutocompleteSuggestions instead
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
   * Get autocomplete suggestions based on current input
   * Handles commands, parameters, and command history
   */
  getAutocompleteSuggestions(input: string, limit = 10): AutocompleteSuggestion[] {
    const trimmedInput = input.trim();
    const tokens = trimmedInput.split(/\s+/);
    const commands = this.commandsCache$.getValue();
    const suggestions: AutocompleteSuggestion[] = [];

    // Empty input - show examples and recent history
    if (!trimmedInput) {
      // Add recent history first
      const history = this.commandHistorySignal();
      for (let i = 0; i < Math.min(3, history.length); i++) {
        suggestions.push({
          text: history[i],
          display: history[i],
          type: 'history',
          description: 'Recent command',
          insert: history[i],
        });
      }

      // Add example commands
      const examples: AutocompleteSuggestion[] = [
        {
          text: 'AAPL HP',
          display: 'AAPL HP',
          type: 'example',
          description: 'Historical prices for Apple',
          insert: 'AAPL HP',
        },
        {
          text: 'HELP',
          display: 'HELP',
          type: 'example',
          description: 'Show available commands',
          insert: 'HELP',
        },
        {
          text: 'AAPL GP',
          display: 'AAPL GP',
          type: 'example',
          description: 'Price chart for Apple',
          insert: 'AAPL GP',
        },
      ];
      suggestions.push(...examples);
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
                text: `-${paramName}`,
                display: `-${paramName}${def.default ? ` (default: ${def.default})` : ''}`,
                type: 'parameter',
                description: def.description || `Parameter for ${command.name}`,
                insert: `-${paramName} `,
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
      // User typed just a symbol, suggest commands
      for (const cmd of commands.filter((c) => c.requiresSymbol)) {
        suggestions.push({
          text: cmd.name,
          display: cmd.name,
          type: 'command',
          description: cmd.description,
          category: cmd.category,
          insert: `${tokens[0]} ${cmd.name}`,
          requiresSymbol: true,
          syntax: `SYMBOL ${cmd.name}`,
        });
        if (suggestions.length >= limit) break;
      }
      return suggestions;
    }

    // Match commands and aliases
    for (const cmd of commands) {
      if (cmd.name.toUpperCase().startsWith(lastToken)) {
        const insertText = hasSymbol ? `${tokens.slice(0, -1).join(' ')} ${cmd.name}` : cmd.name;
        suggestions.push({
          text: cmd.name,
          display: cmd.name,
          type: 'command',
          description: cmd.description,
          category: cmd.category,
          insert: insertText,
          requiresSymbol: cmd.requiresSymbol,
          syntax: cmd.requiresSymbol ? `SYMBOL ${cmd.name}` : cmd.name,
        });
      }

      // Check aliases
      if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          if (alias.toUpperCase().startsWith(lastToken)) {
            const insertText = hasSymbol ? `${tokens.slice(0, -1).join(' ')} ${alias}` : alias;
            suggestions.push({
              text: alias,
              display: `${alias} → ${cmd.name}`,
              type: 'alias',
              description: cmd.description,
              category: cmd.category,
              insert: insertText,
              requiresSymbol: cmd.requiresSymbol,
            });
          }
        }
      }

      if (suggestions.length >= limit) break;
    }

    // Add matching history entries
    const history = this.commandHistorySignal();
    for (const cmd of history) {
      if (cmd.toUpperCase().startsWith(trimmedInput.toUpperCase()) && !suggestions.find((s) => s.insert === cmd)) {
        suggestions.push({
          text: cmd,
          display: cmd,
          type: 'history',
          description: 'Recent command',
          insert: cmd,
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

    // Handle job completions - re-run pending commands
    this.subscriptions.add(
      this.jobsWsService.jobUpdates
        .pipe(filter((update) => update.type === 'jobs.completed' || update.type === 'jobs.failed'))
        .subscribe((update) => {
          const jobId = update.job.uuid;
          const pendingCommand = this.pendingJobCommands.get(jobId);

          if (pendingCommand) {
            this.pendingJobCommands.delete(jobId);

            if (update.type === 'jobs.completed') {
              console.debug('[TerminalService] Job completed successfully, re-running command:', pendingCommand);
              // Re-execute the command now that data should be available
              this.execute(pendingCommand);
            } else {
              console.debug('[TerminalService] Job failed:', jobId, update.job.error);
              // Job failed - update the last history entry (which is showing the fetching state)
              this.updateLastHistoryWithError(`Data fetch failed: ${update.job.error || 'Unknown error'}`);
            }
          }
        }),
    );
  }

  private updateLastHistoryEntry(result: CommandResult): void {
    console.debug('[TerminalService] Updating history with result:', {
      success: result.success,
      outputType: result.outputType,
      message: result.message,
      hasData: !!result.data,
      hasChartOptions: !!result.chartOptions,
      dataPreview: result.data ? JSON.stringify(result.data).slice(0, 200) : null,
    });

    const history = this.historySignal();
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];

    // Check if this is a "fetching" response - track the job for auto-retry
    if (this.isFetchingResponse(result)) {
      const jobId = this.extractJobId(result);
      if (jobId) {
        console.debug('[TerminalService] Data is being fetched, tracking job:', jobId);
        this.pendingJobCommands.set(jobId, lastEntry.input);
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
}
