// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';
import { TerminalWebSocketService, ChartUpdate } from './terminal-websocket.service';
import {
  Command,
  CommandCategory,
  CommandHistoryItem,
  CommandProgress,
  CommandResult,
  Dashboard,
  HistoryEntry,
  SymbolUpdate,
  TerminalConnectionState,
} from './terminal.types';
import { EChartsOption } from 'echarts';

// ============================================================================
// GraphQL Queries
// ============================================================================

const GET_COMMANDS = gql`
  query GetCommands($category: String) {
    commands(category: $category) {
      id
      name
      description
      category
      requiresSymbol
      parametersSchema
      exampleUsage
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
      parametersSchema
      exampleUsage
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
      status
      result
      createdAt
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
      }
      execution {
        id
        status
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
      dashboard {
        id
        name
        description
        panels {
          id
          gridX
          gridY
          gridW
          gridH
          chart {
            id
            name
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
      createdAt
      updatedAt
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

@Injectable({
  providedIn: 'root',
})
export class TerminalService implements OnDestroy {
  private subscriptions = new Subscription();

  // Local command history (in-memory for current session)
  private historySignal: WritableSignal<HistoryEntry[]> = signal([]);
  private commandHistorySignal: WritableSignal<string[]> = signal([]);
  private historyIndex = -1;

  // Commands registry cache
  private commandsCache$ = new BehaviorSubject<Command[]>([]);

  // Currently active charts (subscribed for real-time updates)
  private activeChartsSignal: WritableSignal<Map<string, EChartsOption>> = signal(new Map());

  constructor(
    private wsService: TerminalWebSocketService,
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

  get history(): WritableSignal<HistoryEntry[]> {
    return this.historySignal;
  }

  get commandHistory(): WritableSignal<string[]> {
    return this.commandHistorySignal;
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
   * Load available commands from registry
   */
  loadCommands(category?: CommandCategory): Observable<Command[]> {
    return this.apollo
      .query<CommandsResult>({
        query: GET_COMMANDS,
        variables: { category },
      })
      .pipe(
        map((result) => {
          const commands = result.data.commands;
          this.commandsCache$.next(commands);
          return commands;
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
   * Load command history from server
   */
  loadCommandHistory(limit = 50): Observable<CommandHistoryItem[]> {
    return this.apollo
      .query<CommandHistoryResult>({
        query: GET_COMMAND_HISTORY,
        variables: { limit },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data.commandHistory));
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
  }

  private updateLastHistoryEntry(result: CommandResult): void {
    const history = this.historySignal();
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    const updatedEntry: HistoryEntry = {
      ...lastEntry,
      result,
      isLoading: result.requiresAI || false,
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
