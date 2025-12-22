// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { TraceService } from '../traces/trace.service';

@Injectable({
  providedIn: 'root',
})
export class ApolloErrorLinkFactory {
  constructor(
    private httpLink: HttpLink,
    private traceService: TraceService,
  ) {}

  createErrorLink(): ApolloLink {
    return onError(({ graphQLErrors, networkError, operation, forward }) => {
      // Track GraphQL errors
      if (graphQLErrors) {
        graphQLErrors.forEach((error) => {
          const operationName = operation.operationName || 'Unknown';

          this.traceService
            .recordTrace({
              kind: 'graphql_error',
              severity: 'ERROR',
              message: `GraphQL error in ${operationName}: ${error.message}`,
              functionName: operationName,
              exceptionMessage: error.message,
              inputs: {
                operation: operationName,
                variables: operation.variables, // Will be sanitized by recordTrace
                path: error.path?.join('.'),
              },
              tags: {
                operation_name: operationName,
                error_type: 'graphql',
              },
            })
            .subscribe();

          console.error(
            `[GraphQL error]: Message: ${error.message}, Location: ${error.locations}, Path: ${error.path}`,
          );
        });
      }

      // Track network errors
      if (networkError) {
        const operationName = operation.operationName || 'Unknown';

        this.traceService
          .recordTrace({
            kind: 'api_error',
            severity: 'ERROR',
            message: `Network error in ${operationName}: ${networkError.message}`,
            functionName: operationName,
            exceptionType: networkError.name,
            exceptionMessage: networkError.message,
            inputs: {
              operation: operationName,
              variables: operation.variables, // Will be sanitized by recordTrace
            },
            tags: {
              operation_name: operationName,
              error_type: 'network',
            },
          })
          .subscribe();

        console.error(`[Network error]: ${networkError}`);
      }

      return forward(operation);
    });
  }
}
