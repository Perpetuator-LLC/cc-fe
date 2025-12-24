// Copyright (c) 2025 Perpetuator LLC

/**
 * Utility functions for working with schedule data
 */

/**
 * Convert snake_case keys to camelCase
 */
function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? snakeToCamel(value as Record<string, unknown>)
        : value;
  }
  return result;
}

/**
 * Safely parses schedule args that can be either a JSON string or an object
 * Converts snake_case keys to camelCase for frontend consistency
 * @param args - The args to parse (can be string, object, or unknown)
 * @returns Parsed object with camelCase keys, or empty object if parsing fails
 */
export function parseScheduleArgs(args: unknown): Record<string, string> {
  if (!args) return {};

  let parsed: Record<string, unknown>;

  if (typeof args === 'string') {
    try {
      parsed = JSON.parse(args);
    } catch (error) {
      console.warn('Failed to parse schedule args JSON:', error);
      return {};
    }
  } else if (typeof args === 'object') {
    parsed = args as Record<string, unknown>;
  } else {
    return {};
  }

  return snakeToCamel(parsed) as Record<string, string>;
}
