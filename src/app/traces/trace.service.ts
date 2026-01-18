// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  getSafeContext,
  getSafeUrl,
  sanitizeMessage,
  sanitizeSensitiveDataSync,
  sanitizeStackTrace,
  sanitizeTags,
} from './trace-sanitizer';

export type TraceSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type TraceKind =
  | 'error'
  | 'auth_failure'
  | 'auth_success'
  | 'token_rotation'
  | 'validation_error'
  | 'frontend_error'
  | 'api_error'
  | 'graphql_error'
  | 'navigation_error'
  | 'user_action';

export interface TraceInput {
  kind: TraceKind;
  severity?: TraceSeverity;
  functionName?: string;
  moduleName?: string;
  message?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  exceptionType?: string;
  exceptionMessage?: string;
  stackTrace?: string;
  tags?: Record<string, string>;
  requestId?: string;
}

export interface RecordTraceResponse {
  recordTrace: {
    success: boolean;
    message: string | null;
    traceId: string | null;
  };
}

const RECORD_TRACE_MUTATION = gql`
  mutation RecordTrace(
    $kind: String!
    $severity: String
    $functionName: String
    $moduleName: String
    $message: String
    $inputs: JSONString
    $outputs: JSONString
    $exceptionType: String
    $exceptionMessage: String
    $stackTrace: String
    $tags: JSONString
    $requestId: String
  ) {
    recordTrace(
      kind: $kind
      severity: $severity
      functionName: $functionName
      moduleName: $moduleName
      message: $message
      inputs: $inputs
      outputs: $outputs
      exceptionType: $exceptionType
      exceptionMessage: $exceptionMessage
      stackTrace: $stackTrace
      tags: $tags
      requestId: $requestId
    ) {
      success
      message
      traceId
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class TraceService {
  private enabled = true;
  private debugMode = false;

  constructor(private apollo: Apollo) {
    // Enable debug mode in development
    this.debugMode = !this.isProduction();
  }

  /**
   * Record a trace to the backend
   * This does NOT require authentication and will never throw errors
   */
  recordTrace(input: TraceInput): Observable<boolean> {
    if (!this.enabled) {
      return of(false);
    }

    // Add contextual information
    const enrichedInput = this.enrichTraceInput(input);

    // Sanitize all potentially sensitive data
    const sanitizedInputs = sanitizeSensitiveDataSync(enrichedInput.inputs) as Record<string, unknown> | undefined;
    const sanitizedOutputs = sanitizeSensitiveDataSync(enrichedInput.outputs) as Record<string, unknown> | undefined;
    const sanitizedTags = sanitizeTags(enrichedInput.tags);
    const sanitizedMessage = enrichedInput.message ? sanitizeMessage(enrichedInput.message) : undefined;
    const sanitizedExceptionMessage = enrichedInput.exceptionMessage
      ? sanitizeMessage(enrichedInput.exceptionMessage)
      : undefined;
    const sanitizedStackTrace = sanitizeStackTrace(enrichedInput.stackTrace);

    // Convert objects to JSON strings
    const variables = {
      kind: enrichedInput.kind,
      severity: enrichedInput.severity || 'INFO',
      functionName: enrichedInput.functionName,
      moduleName: enrichedInput.moduleName,
      message: sanitizedMessage,
      inputs: sanitizedInputs ? JSON.stringify(sanitizedInputs) : undefined,
      outputs: sanitizedOutputs ? JSON.stringify(sanitizedOutputs) : undefined,
      exceptionType: enrichedInput.exceptionType,
      exceptionMessage: sanitizedExceptionMessage,
      stackTrace: sanitizedStackTrace,
      tags: sanitizedTags ? JSON.stringify(sanitizedTags) : undefined,
      requestId: enrichedInput.requestId,
    };

    if (this.debugMode) {
      console.log('[TraceService] Recording trace:', variables);
    }

    return this.apollo
      .mutate<RecordTraceResponse>({
        mutation: RECORD_TRACE_MUTATION,
        variables,
        context: {
          // Don't use authentication for traces (allows capturing auth failures)
          useAnonymous: true,
        },
      })
      .pipe(
        map((result) => {
          if (this.debugMode && result.data?.recordTrace) {
            console.log('[TraceService] Trace recorded:', result.data.recordTrace.traceId);
          }
          return result.data?.recordTrace?.success || false;
        }),
        catchError((error) => {
          // Never let trace recording break the app
          // Only log errors in development/testing environments
          if (this.debugMode) {
            console.error('[TraceService] Failed to record trace:', error);
          }
          return of(false);
        }),
      );
  }

  /**
   * Track a frontend error
   */
  trackError(error: Error, context?: Partial<TraceInput>): Observable<boolean> {
    return this.recordTrace({
      kind: 'frontend_error',
      severity: 'ERROR',
      message: error.message,
      exceptionType: error.name,
      exceptionMessage: error.message,
      stackTrace: error.stack,
      ...context,
      inputs: {
        ...context?.inputs,
        ...getSafeContext(),
      },
    });
  }

  /**
   * Track an authentication failure
   * Note: username is allowed through for trace debugging
   */
  trackAuthFailure(username: string, error: Error | string): Observable<boolean> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return this.recordTrace({
      kind: 'auth_failure',
      severity: 'WARNING',
      message: 'Login failed',
      exceptionMessage: errorMessage,
      inputs: {
        username, // Allowed through for debugging
        timestamp: new Date().toISOString(),
      },
      tags: {
        event_type: 'login_failure',
      },
    });
  }

  /**
   * Track a successful authentication
   * Note: username is allowed through for trace debugging
   */
  trackAuthSuccess(username: string): Observable<boolean> {
    return this.recordTrace({
      kind: 'auth_success',
      severity: 'INFO',
      message: 'User logged in',
      inputs: {
        username, // Allowed through for debugging
        timestamp: new Date().toISOString(),
      },
      tags: {
        event_type: 'login_success',
      },
    });
  }

  /**
   * Track a GraphQL error
   */
  trackGraphQLError(operationName: string, error: unknown, variables?: Record<string, unknown>): Observable<boolean> {
    const errorMessage = this.extractErrorMessage(error);
    return this.recordTrace({
      kind: 'graphql_error',
      severity: 'ERROR',
      message: `GraphQL error in ${operationName}: ${errorMessage}`,
      functionName: operationName,
      exceptionMessage: errorMessage,
      inputs: {
        operation: operationName,
        variables, // Will be sanitized by recordTrace
      },
      tags: {
        operation_name: operationName,
      },
    });
  }

  /**
   * Track an API error
   */
  trackAPIError(endpoint: string, method: string, error: unknown, requestData?: unknown): Observable<boolean> {
    const errorMessage = this.extractErrorMessage(error);
    return this.recordTrace({
      kind: 'api_error',
      severity: 'ERROR',
      message: `API error: ${method} ${endpoint}`,
      exceptionMessage: errorMessage,
      inputs: {
        method,
        endpoint,
        requestData, // Will be sanitized by recordTrace
      },
      outputs: {
        error, // Will be sanitized by recordTrace
      },
      tags: {
        api_endpoint: endpoint,
        http_method: method,
      },
    });
  }

  /**
   * Track a validation error
   */
  trackValidationError(formName: string, errors: Record<string, unknown>): Observable<boolean> {
    return this.recordTrace({
      kind: 'validation_error',
      severity: 'WARNING',
      message: `Validation failed for form: ${formName}`,
      inputs: {
        form: formName,
        errors,
        timestamp: new Date().toISOString(),
      },
      tags: {
        form_name: formName,
        error_count: Object.keys(errors).length.toString(),
      },
    });
  }

  /**
   * Track a user action for analytics
   */
  trackUserAction(action: string, data?: Record<string, unknown>): Observable<boolean> {
    return this.recordTrace({
      kind: 'user_action',
      severity: 'INFO',
      message: `User action: ${action}`,
      inputs: {
        action,
        ...data,
        timestamp: new Date().toISOString(),
        url: getSafeUrl(),
      },
      tags: {
        action_type: action,
      },
    });
  }

  /**
   * Track a navigation error
   */
  trackNavigationError(route: string, error: Error): Observable<boolean> {
    return this.recordTrace({
      kind: 'navigation_error',
      severity: 'ERROR',
      message: `Navigation error to ${route}: ${error.message}`,
      exceptionType: error.name,
      exceptionMessage: error.message,
      stackTrace: error.stack,
      inputs: {
        route,
        currentUrl: getSafeUrl(),
      },
      tags: {
        target_route: route,
      },
    });
  }

  /**
   * Enable/disable trace recording
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }

  /**
   * Enrich trace input with contextual information
   */
  private enrichTraceInput(input: TraceInput): TraceInput {
    return {
      ...input,
      inputs: {
        ...input.inputs,
        timestamp: new Date().toISOString(),
        ...getSafeContext(),
      },
    };
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      return err.message || err.error || err.statusText || JSON.stringify(error);
    }
    return 'Unknown error';
  }

  /**
   * Check if running in production
   */
  private isProduction(): boolean {
    if (typeof window === 'undefined') return true; // Assume production on SSR
    return window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
  }
}
