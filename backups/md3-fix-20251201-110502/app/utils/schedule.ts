// Copyright (c) 2025 Perpetuator LLC

/**
 * Utility functions for working with schedule data
 */

/**
 * Safely parses schedule args that can be either a JSON string or an object
 * @param args - The args to parse (can be string, object, or unknown)
 * @returns Parsed object or empty object if parsing fails
 */
export function parseScheduleArgs(args: unknown): Record<string, string> {
  if (!args) return {};

  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.warn('Failed to parse schedule args JSON:', error);
      return {};
    }
  }

  if (typeof args === 'object') {
    return args as Record<string, string>;
  }

  return {};
}
