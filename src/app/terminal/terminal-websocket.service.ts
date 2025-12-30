// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, Subscription, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  CommandProgress,
  CommandResult,
  SymbolUpdate,
  TerminalAction,
  TerminalConnectionState,
  TerminalMessage,
} from './terminal.types';
import { EChartsOption } from 'echarts';

export interface ChartUpdate {
  chartId: string;
  options: EChartsOption;
  isNew: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TerminalWebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private subscriptions = new Subscription();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: Subscription | null = null;
  private pingInterval: Subscription | null = null;

  // Signals for reactive state
  private connectionStateSignal: WritableSignal<TerminalConnectionState> = signal('disconnected');

  // Subjects for different message types
  private commandResult$ = new Subject<CommandResult>();
  private commandProgress$ = new Subject<CommandProgress>();
  private chartUpdate$ = new Subject<ChartUpdate>();
  private symbolUpdate$ = new Subject<SymbolUpdate>();
  private error$ = new Subject<string>();
  private connected$ = new Subject<{ userId: string; timestamp: string }>();

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

  get onError() {
    return this.error$.asObservable();
  }

  get onConnected() {
    return this.connected$.asObservable();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.connectionStateSignal.set('connecting');

    const wsUrl = this.buildWebSocketUrl();
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.connectionStateSignal.set('connected');
      this.reconnectAttempts = 0;
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const data: TerminalMessage = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse Terminal WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      const codeDescriptions: Record<number, string> = {
        1000: 'Normal closure',
        1001: 'Going away',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1006: 'Abnormal closure (server not responding or not running)',
        1015: 'TLS handshake failure',
      };
      const codeDesc = codeDescriptions[event.code] || 'Unknown';
      console.warn(`Terminal WebSocket closed: code=${event.code} (${codeDesc}), reason="${event.reason || 'none'}"`);

      if (event.code === 1006) {
        console.error(
          'Terminal WebSocket abnormal closure - possible causes:\n' +
            '  1. Backend server is not running\n' +
            '  2. Backend is not running with ASGI (WebSocket support)\n' +
            '  3. Route /ws/terminal/ not defined in backend\n' +
            '  4. Token authentication failed on backend',
        );
      }

      this.stopPingInterval();
      this.connectionStateSignal.set('disconnected');

      // Only attempt reconnect if we were authenticated and it wasn't a clean close
      if (this.authService.isLoggedIn() && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
    };
  }

  disconnect(): void {
    this.stopReconnectTimer();
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionStateSignal.set('disconnected');
  }

  // ============================================================================
  // Send Actions
  // ============================================================================

  /**
   * Execute a terminal command
   */
  execute(input: string): void {
    this.send({
      action: 'execute',
      input: input.trim(),
    });
  }

  /**
   * Subscribe to chart updates
   */
  subscribeChart(chartId: string): void {
    this.send({
      action: 'subscribe_chart',
      chartId,
    });
  }

  /**
   * Unsubscribe from chart updates
   */
  unsubscribeChart(chartId: string): void {
    this.send({
      action: 'unsubscribe_chart',
      chartId,
    });
  }

  /**
   * Subscribe to real-time symbol price updates
   */
  subscribeSymbols(symbols: string[]): void {
    this.send({
      action: 'subscribe_symbols',
      symbols: symbols.map((s) => s.toUpperCase()),
    });
  }

  /**
   * Unsubscribe from real-time symbol price updates
   */
  unsubscribeSymbols(symbols: string[]): void {
    this.send({
      action: 'unsubscribe_symbols',
      symbols: symbols.map((s) => s.toUpperCase()),
    });
  }

  /**
   * Send a ping to keep the connection alive
   */
  ping(): void {
    this.send({ action: 'ping' });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildWebSocketUrl(): string {
    const apiUrl = environment.API_URL;
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');

    const accessToken = this.authService.getToken();
    const tokenParam = accessToken ? `?token=${accessToken}` : '';

    return `${wsProtocol}://${wsHost}/ws/terminal/${tokenParam}`;
  }

  private handleMessage(data: TerminalMessage): void {
    switch (data['type']) {
      case 'connected':
        this.connected$.next({
          userId: data['userId'],
          timestamp: data['timestamp'],
        });
        break;

      case 'command.result':
        this.commandResult$.next(data['result'] as CommandResult);
        break;

      case 'command.progress':
        this.commandProgress$.next({
          executionId: data['executionId'],
          step: data['step'],
          progress: data['progress'],
          message: data['message'],
        });
        break;

      case 'chart.created':
        this.chartUpdate$.next({
          chartId: data['chartId'],
          options: data['options'],
          isNew: true,
        });
        break;

      case 'chart.update':
        this.chartUpdate$.next({
          chartId: data['chartId'],
          options: data['options'],
          isNew: false,
        });
        break;

      case 'symbol.update':
        this.symbolUpdate$.next({
          symbol: data['symbol'],
          name: data['name'],
          price: data['price'],
          change: data['change'],
          changePercent: data['changePercent'],
          volume: data['volume'],
          open: data['open'],
          high: data['high'],
          low: data['low'],
          timestamp: data['timestamp'],
        });
        break;

      case 'symbols.subscribed':
        // Confirmation that symbols were subscribed
        console.log('[TerminalWS] Subscribed to symbols:', data['symbols']);
        break;

      case 'symbols.unsubscribed':
        // Confirmation that symbols were unsubscribed
        console.log('[TerminalWS] Unsubscribed from symbols:', data['symbols']);
        break;

      case 'error':
        console.error('Terminal error:', data['message']);
        this.error$.next(data['message']);
        break;

      case 'pong':
        // Keep-alive response, nothing to do
        break;

      default:
        console.warn('Unknown Terminal WebSocket message type:', data['type']);
    }
  }

  private send(action: TerminalAction): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    } else {
      console.warn('Terminal WebSocket not connected, cannot send:', action);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max Terminal WebSocket reconnect attempts reached');
      return;
    }

    this.connectionStateSignal.set('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.stopReconnectTimer();
    this.reconnectTimer = timer(delay).subscribe(() => {
      this.connect();
    });
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = timer(30000, 30000).subscribe(() => {
      this.ping();
    });
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      this.pingInterval.unsubscribe();
      this.pingInterval = null;
    }
  }
}
