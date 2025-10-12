// Copyright (c) 2025 Perpetuator LLC
import { TypePolicies } from '@apollo/client/core';

/**
 * Registry for Apollo cache type policies.
 * Each module/service can register its own cache policies without coupling to the global config.
 */
class CachePolicyRegistry {
  private policies: TypePolicies = {};

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
}

// Export a singleton instance
export const cachePolicyRegistry = new CachePolicyRegistry();
