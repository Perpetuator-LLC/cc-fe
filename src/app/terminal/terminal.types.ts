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
  data?: TableData | object;
  chartOptions?: EChartsOption;
  metadata?: CommandMetadata;
  executionId?: string;
  aiReasoning?: string;
  requiresAI?: boolean;
}

export interface CommandMetadata {
  symbol?: string;
  period?: string;
  recordCount?: number;
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
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: string;
}

// ============================================================================
// Command Registry Types
// ============================================================================

export type CommandCategory = 'EQUITY' | 'CHART' | 'SYSTEM' | 'RESEARCH' | 'PORTFOLIO';

export interface Command {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  requiresSymbol: boolean;
  parametersSchema?: object;
  exampleUsage: string;
  creditsCost: number;
  aliases?: string[];
}

// ============================================================================
// History Types
// ============================================================================

export interface HistoryEntry {
  id?: string;
  input: string;
  result?: CommandResult;
  timestamp: Date;
  isLoading?: boolean;
  progress?: CommandProgress;
}

export interface CommandHistoryItem {
  id: string;
  rawInput: string;
  parsedCommand: string;
  parsedSymbols: string[];
  isAiInterpreted: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: object;
  createdAt: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardPanel {
  id: string;
  x: number;
  y: number;
  cols: number;
  rows: number;
  chartId?: string;
  chartOptions?: EChartsOption;
  title: string;
  symbol?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  panels: DashboardPanel[];
  createdAt: string;
  updatedAt: string;
}

export interface ChartDefinition {
  id: string;
  name: string;
  chartType: string;
  options: EChartsOption;
  symbol?: string;
  period?: string;
  createdAt: string;
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

export interface PingAction {
  action: 'ping';
}

export type TerminalAction =
  | ExecuteAction
  | SubscribeChartAction
  | UnsubscribeChartAction
  | SubscribeSymbolsAction
  | PingAction;

// ============================================================================
// Connection State
// ============================================================================

export type TerminalConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
