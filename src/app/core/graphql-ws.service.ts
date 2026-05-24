// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, inject, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Client, createClient } from 'graphql-ws';
import { Observable, Subject, Subscription } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { AuthService } from '../auth/auth.service';

export type GraphQLWsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface GraphQLWsMessage<T = unknown> {
  data?: T;
  errors?: { message: string; path?: string[] }[];
}

/**
 * Unified GraphQL WebSocket Service
 *
 * Provides a single WebSocket connection for all real-time GraphQL operations.
 * Uses the graphql-ws protocol (graphql-transport-ws subprotocol).
 *
 * Unified endpoint:
 * - /ws/graphql/ (all GraphQL operations over WebSocket)
 *
 * Note: Job updates are handled separately by JobsWebSocketService which also
 * connects to /ws/graphql/ but handles custom job message types.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphQLWsService implements OnDestroy {
  private client: Client | null = null;
  private subscriptions = new Subscription();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: Subscription | null = null;

  // Connection state
  private connectionStateSignal: WritableSignal<GraphQLWsConnectionState> = signal('disconnected');

  // Event subjects
  private connected$ = new Subject<void>();
  private disconnected$ = new Subject<void>();
  private error$ = new Subject<Error>();

  private readonly authService = inject(AuthService);
  private readonly appConfig = inject(AppConfigService);

  constructor() {
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
    this.connected$.complete();
    this.disconnected$.complete();
    this.error$.complete();
  }

  // ============================================================================
  // Public Getters
  // ============================================================================

  get connectionState(): WritableSignal<GraphQLWsConnectionState> {
    return this.connectionStateSignal;
  }

  get onConnected(): Observable<void> {
    return this.connected$.asObservable();
  }

  get onDisconnected(): Observable<void> {
    return this.disconnected$.asObservable();
  }

  get onError(): Observable<Error> {
    return this.error$.asObservable();
  }

  get isConnected(): boolean {
    return this.connectionStateSignal() === 'connected';
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
      connectionParams: () => ({
        authorization: `Bearer ${this.authService.getToken()}`,
      }),
      // Reconnection settings
      retryAttempts: this.maxReconnectAttempts,
      shouldRetry: () => this.authService.isLoggedIn(),
      retryWait: async (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
        const delay = Math.min(1000 * Math.pow(2, retries), 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      },
      on: {
        connected: () => {
          this.connectionStateSignal.set('connected');
          this.reconnectAttempts = 0;
          this.connected$.next();
          console.debug('[GraphQL-WS] Connected');
        },
        closed: (event) => {
          this.connectionStateSignal.set('disconnected');
          this.disconnected$.next();
          console.debug('[GraphQL-WS] Closed', event);
        },
        error: (error) => {
          console.error('[GraphQL-WS] Error:', error);
          this.error$.next(error instanceof Error ? error : new Error(String(error)));
        },
        connecting: () => {
          this.connectionStateSignal.set('connecting');
          console.debug('[GraphQL-WS] Connecting...');
        },
      },
      lazy: false, // Connect immediately
      keepAlive: 30000, // Send ping every 30 seconds
    });
  }

  disconnect(): void {
    this.stopReconnectTimer();

    if (this.client) {
      this.client.dispose();
      this.client = null;
    }

    this.connectionStateSignal.set('disconnected');
  }

  // ============================================================================
  // GraphQL Operations
  // ============================================================================

  /**
   * Execute a GraphQL query over WebSocket
   */
  query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string,
  ): Observable<GraphQLWsMessage<T>> {
    return new Observable((observer) => {
      if (!this.client) {
        observer.error(new Error('GraphQL WebSocket not connected'));
        return;
      }

      const unsubscribe = this.client.subscribe(
        {
          query,
          variables,
          operationName,
        },
        {
          next: (result) => {
            observer.next(result as GraphQLWsMessage<T>);
          },
          error: (error) => {
            observer.error(error);
          },
          complete: () => {
            observer.complete();
          },
        },
      );

      return () => {
        unsubscribe();
      };
    });
  }

  /**
   * Execute a GraphQL mutation over WebSocket
   */
  mutate<T = unknown>(
    mutation: string,
    variables?: Record<string, unknown>,
    operationName?: string,
  ): Observable<GraphQLWsMessage<T>> {
    return this.query<T>(mutation, variables, operationName);
  }

  /**
   * Subscribe to a GraphQL subscription
   */
  subscribe<T = unknown>(
    subscription: string,
    variables?: Record<string, unknown>,
    operationName?: string,
  ): Observable<GraphQLWsMessage<T>> {
    return new Observable((observer) => {
      if (!this.client) {
        observer.error(new Error('GraphQL WebSocket not connected'));
        return;
      }

      const unsubscribe = this.client.subscribe(
        {
          query: subscription,
          variables,
          operationName,
        },
        {
          next: (result) => {
            observer.next(result as GraphQLWsMessage<T>);
          },
          error: (error) => {
            observer.error(error);
          },
          complete: () => {
            observer.complete();
          },
        },
      );

      return () => {
        unsubscribe();
      };
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildWebSocketUrl(): string {
    const apiUrl = this.appConfig.config.API_URL;
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${wsHost}/ws/graphql/`;
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }
  }
}
