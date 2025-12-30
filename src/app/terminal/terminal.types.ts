// Copyright (c) 2025 Perpetuator LLC
import { EChartsOption } from 'echarts';

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type TerminalMessageType =
  | 'connected'
  | 'command.result'
  | 'command.progress'
  | 'chart.created'
  | 'chart.update'
  | 'symbol.update'
  | 'symbols.subscribed'
  | 'symbols.unsubscribed'
  | 'error'
  | 'pong';

export interface TerminalMessage {
  type: TerminalMessageType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ============================================================================
// Command Types
// ============================================================================

export interface CommandResult {
  success: boolean;
  message?: string;
  outputType: 'data' | 'chart' | 'message';
  data?: TableData | ChartResultData | object;
  chartOptions?: EChartsOption;
  metadata?: CommandMetadata;
  executionId?: string;
  aiReasoning?: string;
  requiresAI?: boolean;
}

/**
 * Data structure returned with chart results
 */
export interface ChartResultData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prices?: any[];
  chartControls?: ChartControls;
  status?: 'fetching' | 'ready';
  jobId?: string;
}

export interface CommandMetadata {
  symbol?: string;
  period?: string;
  interval?: string;
  recordCount?: number;
  /** Indicates data is being refreshed in background (cached data shown) */
  refreshing?: boolean;
  /** Job ID for the background refresh task */
  refreshJobId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CommandProgress {
  executionId: string;
  step: string;
  progress: number;
  message?: string;
}

// ============================================================================
// Data Display Types
// ============================================================================

export interface TableData {
  type: 'table';
  title?: string;
  headers: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[][];
  rowCount: number;
}

export interface SymbolUpdate {
  symbol: string;
  name?: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  timestamp: string;
}

// ============================================================================
// Command Registry Types (matches CommandType from schema)
// ============================================================================

export type CommandCategory = 'EQUITY' | 'CHART' | 'NEWS' | 'SCREENING' | 'SYSTEM' | 'RESEARCH' | 'PODCAST' | 'TEAM';

export interface Command {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  aliases?: string[];
  requiresSymbol: boolean;
  parametersSchema?: string;
  exampleUsage: string;
  outputType?: string;
  chartType?: string;
  creditsCost?: number;
}

// ============================================================================
// Autocomplete Types
// ============================================================================

export type AutocompleteSuggestionType =
  | 'command'
  | 'alias'
  | 'symbol'
  | 'parameter'
  | 'recent'
  | 'history'
  | 'history_ai'
  | 'natural_language'
  | 'example';

export interface AutocompleteSuggestion {
  text: string;
  display: string;
  type: AutocompleteSuggestionType;
  description?: string;
  category?: string;
  insert: string;
  requiresSymbol?: boolean;
  syntax?: string;
  paramType?: string;
  choices?: string[];
  default?: string;
  // Symbol-specific fields
  assetType?: string;
  exchange?: string;
  country?: string;
  currency?: string;
  // AI-related fields
  isAiInterpreted?: boolean;
}

// ============================================================================
// Terminal Hints & Help Types (from backend)
// ============================================================================

export interface TerminalHints {
  quickExamples: string[];
  placeholderText: string;
  emptyStateMessage: string;
  dashboardHint: string;
  chartSuggestion: string;
}

export interface TerminalHelp {
  overview: string;
  categories: CategoryHelp[];
  aiNote: string;
}

export interface CategoryHelp {
  name: string;
  categoryKey: string;
  commands: CommandHelp[];
}

export interface CommandHelp {
  name: string;
  description: string;
  exampleUsage: string;
  aliases: string[];
}

export interface TerminalSyntaxHelp {
  grammar: string[];
  examples: string[];
  naturalLanguageExamples: string[];
}

// ============================================================================
// History Types (matches CommandExecutionType from schema)
// ============================================================================

export interface HistoryEntry {
  id?: string;
  input: string;
  result?: CommandResult;
  timestamp: Date;
  isLoading?: boolean;
  progress?: CommandProgress;
}

export type CommandExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface CommandHistoryItem {
  id: string;
  rawInput: string;
  parsedCommand: string;
  parsedSymbols?: string[];
  parsedArgs?: object;
  isAiInterpreted: boolean;
  aiReasoning?: string;
  status: CommandExecutionStatus;
  result?: object;
  error?: string;
  createdAt: string;
  completedAt?: string;
  creditsCharged?: number;
}

// ============================================================================
// Dashboard Types (matches DashboardType, DashboardPanelType from schema)
// ============================================================================

export interface DashboardPanel {
  id: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  titleOverride?: string;
  optionsOverride?: string;
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  chart?: ChartDefinition;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  columns: number;
  rowHeight: number;
  layout?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  createdAt: string;
  updatedAt: string;
  panels?: DashboardPanel[];
}

// ============================================================================
// Chart Types (matches ChartDefinitionType from schema)
// ============================================================================

export type ChartType =
  | 'CANDLESTICK'
  | 'LINE'
  | 'BAR'
  | 'PIE'
  | 'SCATTER'
  | 'HEATMAP'
  | 'TREEMAP'
  | 'RADAR'
  | 'GAUGE'
  | 'CUSTOM';

/**
 * Chart controls for period/interval selection
 * Returned from backend in chart responses
 */
export interface ChartControls {
  periodOptions: string[];
  intervalOptions: string[];
  currentPeriod: string;
  currentInterval: string;
  command: string;
  symbol: string;
  commandTemplate: string;
  /** Recommended intervals for each period (e.g., {"1D": "5min", "1Y": "daily"}) */
  recommendedIntervals?: Record<string, string>;
  /** Maximum period allowed for intraday intervals (e.g., {"1min": "1W", "60min": "2M"}) */
  intradayLimits?: Record<string, string>;
}

export interface ChartDefinition {
  id: string;
  name: string;
  description?: string;
  chartType: ChartType;
  options: string; // JSONString - ECharts options
  dataSource?: string;
  symbols?: string;
  width?: number;
  height?: number;
  theme?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Watchlist Types
// ============================================================================

export type WatchlistType = 'SEARCH_HISTORY' | 'CUSTOM' | 'FAVORITES';

export interface Watchlist {
  uuid: string;
  name: string;
  description: string;
  watchlistType: WatchlistType;
  isDefault: boolean;
  itemCount: number;
  items: WatchlistItem[];
}

export interface WatchlistItem {
  uuid?: string;
  symbol: string;
  displayName: string;
  assetType: string;
  exchange: string;
  country?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  notes?: string;
  accessCount: number;
  lastAccessedAt: string;
}

// ============================================================================
// WebSocket Action Types (Client → Server)
// ============================================================================

export interface ExecuteAction {
  action: 'execute';
  input: string;
}

export interface SubscribeChartAction {
  action: 'subscribe_chart';
  chartId: string;
}

export interface UnsubscribeChartAction {
  action: 'unsubscribe_chart';
  chartId: string;
}

export interface SubscribeSymbolsAction {
  action: 'subscribe_symbols';
  symbols: string[];
}

export interface UnsubscribeSymbolsAction {
  action: 'unsubscribe_symbols';
  symbols: string[];
}

export interface PingAction {
  action: 'ping';
}

export type TerminalAction =
  | ExecuteAction
  | SubscribeChartAction
  | UnsubscribeChartAction
  | SubscribeSymbolsAction
  | UnsubscribeSymbolsAction
  | PingAction;

// ============================================================================
// Connection State
// ============================================================================

export type TerminalConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
