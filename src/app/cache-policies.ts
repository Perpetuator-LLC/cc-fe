// Copyright (c) 2025-2026 Perpetuator LLC
import { TypePolicies, FieldPolicy } from '@apollo/client/core';

// ============================================================================
// Relay-style Connection Merge Helpers
// ============================================================================

/**
 * Create a merge function for Relay-style cursor pagination.
 * Merges new edges with existing edges, handling both forward and backward pagination.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function relayConnectionMerge(existing: any, incoming: any, options: { args: Record<string, unknown> | null }): any {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const args = options.args || {};

  // Deduplicate edges by cursor
  const existingEdges = existing.edges || [];
  const incomingEdges = incoming.edges || [];
  const existingCursors = new Set(existingEdges.map((e: { cursor: string }) => e.cursor));
  const newEdges = incomingEdges.filter((e: { cursor: string }) => !existingCursors.has(e.cursor));

  // If fetching older data (before cursor), append to end
  if (args['before']) {
    return {
      ...incoming,
      edges: [...existingEdges, ...newEdges],
      pageInfo: {
        ...incoming.pageInfo,
        newestDate: existing.pageInfo?.newestDate || incoming.pageInfo?.newestDate,
        startCursor: existing.pageInfo?.startCursor || incoming.pageInfo?.startCursor,
      },
    };
  }

  // If fetching newer data (after cursor), prepend to start
  if (args['after']) {
    return {
      ...incoming,
      edges: [...newEdges, ...existingEdges],
      pageInfo: {
        ...incoming.pageInfo,
        oldestDate: existing.pageInfo?.oldestDate || incoming.pageInfo?.oldestDate,
        endCursor: existing.pageInfo?.endCursor || incoming.pageInfo?.endCursor,
      },
    };
  }

  // Fresh load - replace all
  return incoming;
}

// ============================================================================
// Cache Policy Registry
// ============================================================================

/**
 * Registry for Apollo cache type policies.
 * Each module/service can register its own cache policies without coupling to the global config.
 */
class CachePolicyRegistry {
  private policies: TypePolicies = {};

  constructor() {
    // Register default policies
    this.registerDefaultPolicies();
  }

  /**
   * Register cache policies for a specific type.
   * This allows modules to define their own cache behavior.
   */
  register(typeName: string, fields: TypePolicies[string]['fields']) {
    if (!this.policies[typeName]) {
      this.policies[typeName] = { fields: {} };
    }
    this.policies[typeName].fields = {
      ...this.policies[typeName].fields,
      ...fields,
    };
  }

  /**
   * Get all registered type policies for use in Apollo cache configuration.
   */
  getAll(): TypePolicies {
    return this.policies;
  }

  /**
   * Register default cache policies for core types
   */
  private registerDefaultPolicies(): void {
    // Query-level field policies
    this.register('Query', {
      // Stock price connection - Relay-style pagination with cursor merging
      stockPriceConnection: {
        // Cache key includes symbol and interval (not cursors)
        keyArgs: ['symbol', 'interval', 'fqn'],
        merge: relayConnectionMerge,
      } as FieldPolicy<unknown, unknown, unknown>,

      // Command history - Relay-style pagination
      commandHistory: {
        keyArgs: ['search'], // Cache by search query, pagination handled by merge
        merge: relayConnectionMerge, // Use Relay merge for edges/pageInfo
      } as FieldPolicy<unknown, unknown, unknown>,

      // Autocomplete - never cache, always fresh
      autocomplete: {
        keyArgs: false,
        merge: false,
      },

      // Commands list - cache for session
      commands: {
        keyArgs: ['category', 'isActive'],
        merge: true,
      },

      // Terminal hints - cache for session
      terminalHints: {
        merge: true,
      },

      // Terminal help - cache for session
      terminalHelp: {
        merge: true,
      },

      // Watchlists - merge with existing
      watchlists: {
        keyArgs: ['watchlistType'],
        merge: false,
      },

      // Jobs - replace on new query
      jobs: {
        keyArgs: ['limit', 'status'],
        merge: false,
      },

      // Quote - always fresh
      quote: {
        keyArgs: ['symbol', 'fqn'],
        merge: false,
      },

      // Chart data availability - cache by symbol/interval
      chartDataAvailability: {
        keyArgs: ['symbol', 'interval'],
        merge: true,
      },
    });

    // Watchlist type - identify by UUID
    this.register('WatchlistType', {
      keyFields: ['uuid'],
    } as unknown as TypePolicies[string]['fields']);

    // Dashboard type - identify by ID
    this.register('Dashboard', {
      keyFields: ['id'],
    } as unknown as TypePolicies[string]['fields']);

    // Job type - identify by UUID
    this.register('JobType', {
      keyFields: ['uuid'],
    } as unknown as TypePolicies[string]['fields']);

    // Command type - identify by name (unique)
    this.register('CommandType', {
      keyFields: ['name'],
    } as unknown as TypePolicies[string]['fields']);

    // Stock price node - identify by ID
    this.register('StockPriceNode', {
      keyFields: ['id'],
    } as unknown as TypePolicies[string]['fields']);
  }
}

// Export a singleton instance
export const cachePolicyRegistry = new CachePolicyRegistry();
