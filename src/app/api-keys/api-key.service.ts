// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BaseService } from '../base.service';
import { ErrorHandlerService } from '../error-handler.service';

export interface ApiKey {
  uuid: string;
  name: string;
  prefix: string;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  isActive: boolean;
  lastUsed: string | null;
  createdAt: string;
}

export interface ApiKeyUsage {
  uuid: string;
  endpoint: string;
  ipAddress: string | null;
  success: boolean;
  errorMessage: string | null;
  timestamp: string;
}

export interface ApiKeyAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsLast24h: number;
  requestsLast7d: number;
  requestsLast30d: number;
  mostUsedEndpoints: string[];
  uniqueIps: number;
  firstUsed: string | null;
  lastUsed: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
}

export interface UpdateApiKeyInput {
  uuid: string;
  name?: string;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  /**
   * Get all API keys for the current user
   */
  getApiKeys(): Observable<ApiKey[]> {
    const query = gql`
      query GetApiKeys {
        apiKeys {
          uuid
          name
          prefix
          rateLimitPerMinute
          rateLimitPerHour
          rateLimitPerDay
          isActive
          lastUsed
          createdAt
        }
      }
    `;

    interface Response {
      apiKeys: ApiKey[];
    }

    return this.query<Response>({ query }).pipe(map((data) => data.apiKeys || []));
  }

  /**
   * Get a specific API key by UUID
   */
  getApiKey(uuid: string): Observable<ApiKey> {
    const query = gql`
      query GetApiKey($uuid: UUID!) {
        apiKey(uuid: $uuid) {
          uuid
          name
          prefix
          rateLimitPerMinute
          rateLimitPerHour
          rateLimitPerDay
          isActive
          lastUsed
          createdAt
        }
      }
    `;

    interface Response {
      apiKey: ApiKey;
    }

    return this.query<Response>({ query, variables: { uuid } }).pipe(map((data) => data.apiKey));
  }

  /**
   * Create a new API key
   * Returns the full key (only shown once!)
   */
  createApiKey(input: CreateApiKeyInput): Observable<{ key: string; apiKey: ApiKey }> {
    const mutation = gql`
      mutation CreateApiKey($name: String!, $rateLimitPerMinute: Int, $rateLimitPerHour: Int, $rateLimitPerDay: Int) {
        createApiKey(
          name: $name
          rateLimitPerMinute: $rateLimitPerMinute
          rateLimitPerHour: $rateLimitPerHour
          rateLimitPerDay: $rateLimitPerDay
        ) {
          success
          message
          key
          apiKey {
            uuid
            name
            prefix
            rateLimitPerMinute
            rateLimitPerHour
            rateLimitPerDay
            isActive
            lastUsed
            createdAt
          }
        }
      }
    `;

    interface Response {
      createApiKey: {
        success: boolean;
        message: string;
        key: string;
        apiKey: ApiKey;
      };
    }

    return this.mutate<Response>({ mutation, variables: input }).pipe(
      map((data) => {
        if (!data.createApiKey.success) {
          throw new Error(data.createApiKey.message);
        }
        return {
          key: data.createApiKey.key,
          apiKey: data.createApiKey.apiKey,
        };
      }),
    );
  }

  /**
   * Update an existing API key
   */
  updateApiKey(input: UpdateApiKeyInput): Observable<ApiKey> {
    const mutation = gql`
      mutation UpdateApiKey(
        $uuid: UUID!
        $name: String
        $rateLimitPerMinute: Int
        $rateLimitPerHour: Int
        $rateLimitPerDay: Int
        $isActive: Boolean
      ) {
        updateApiKey(
          uuid: $uuid
          name: $name
          rateLimitPerMinute: $rateLimitPerMinute
          rateLimitPerHour: $rateLimitPerHour
          rateLimitPerDay: $rateLimitPerDay
          isActive: $isActive
        ) {
          success
          message
          apiKey {
            uuid
            name
            prefix
            rateLimitPerMinute
            rateLimitPerHour
            rateLimitPerDay
            isActive
            lastUsed
            createdAt
          }
        }
      }
    `;

    interface Response {
      updateApiKey: {
        success: boolean;
        message: string;
        apiKey: ApiKey;
      };
    }

    return this.mutate<Response>({ mutation, variables: input }).pipe(
      map((data) => {
        if (!data.updateApiKey.success) {
          throw new Error(data.updateApiKey.message);
        }
        return data.updateApiKey.apiKey;
      }),
    );
  }

  /**
   * Delete an API key
   */
  deleteApiKey(uuid: string): Observable<boolean> {
    const mutation = gql`
      mutation DeleteApiKey($uuid: UUID!) {
        deleteApiKey(uuid: $uuid) {
          success
          message
        }
      }
    `;

    interface Response {
      deleteApiKey: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({ mutation, variables: { uuid } }).pipe(
      map((data) => {
        if (!data.deleteApiKey.success) {
          throw new Error(data.deleteApiKey.message);
        }
        return data.deleteApiKey.success;
      }),
    );
  }

  /**
   * Get usage analytics for a specific API key
   */
  getApiKeyAnalytics(apiKeyUuid: string): Observable<ApiKeyAnalytics> {
    const query = gql`
      query GetApiKeyAnalytics($apiKeyUuid: UUID!) {
        apiKeyAnalytics(apiKeyUuid: $apiKeyUuid) {
          totalRequests
          successfulRequests
          failedRequests
          requestsLast24h
          requestsLast7d
          requestsLast30d
          mostUsedEndpoints
          uniqueIps
          firstUsed
          lastUsed
        }
      }
    `;

    interface Response {
      apiKeyAnalytics: ApiKeyAnalytics;
    }

    return this.query<Response>({ query, variables: { apiKeyUuid }, fetchPolicy: 'network-only' }).pipe(
      map((data) => data.apiKeyAnalytics),
    );
  }

  /**
   * Get usage records for a specific API key
   */
  getApiKeyUsage(apiKeyUuid: string, limit = 100): Observable<ApiKeyUsage[]> {
    const query = gql`
      query GetApiKeyUsage($apiKeyUuid: UUID!, $limit: Int) {
        apiKeyUsage(apiKeyUuid: $apiKeyUuid, limit: $limit) {
          uuid
          endpoint
          ipAddress
          success
          errorMessage
          timestamp
        }
      }
    `;

    interface Response {
      apiKeyUsage: ApiKeyUsage[];
    }

    return this.query<Response>({ query, variables: { apiKeyUuid, limit }, fetchPolicy: 'network-only' }).pipe(
      map((data) => data.apiKeyUsage || []),
    );
  }
}
