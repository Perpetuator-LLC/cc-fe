// Copyright (c) 2025-2026 Perpetuator LLC

/**
 * Frontend Trace Sanitization Utility
 *
 * Sanitizes sensitive data before transmitting traces to the backend API.
 * See notes/FRONTEND_TRACE_SANITIZATION.md for full specification.
 */

/** Keys that should be fully redacted (security-sensitive) */
const SENSITIVE_KEYS = new Set([
  // Authentication
  'password',
  'new_password',
  'newpassword',
  'old_password',
  'oldpassword',
  'current_password',
  'currentpassword',
  'confirm_password',
  'confirmpassword',

  // Tokens & Keys
  'token',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'api_key',
  'apikey',
  'secret',
  'secret_key',
  'secretkey',
  'private_key',
  'privatekey',

  // Auth Headers
  'authorization',
  'auth_token',
  'authtoken',
  'bearer',
  'credential',
  'credentials',

  // Third-party Tokens
  'tg_bot_token',
  'tgbottoken',
  'telegram_token',
  'telegramtoken',
  'bot_token',
  'bottoken',

  // Session
  'session_id',
  'sessionid',
  'session_key',
  'sessionkey',
  'csrf_token',
  'csrftoken',
  'csrf',

  // Sensitive PII
  'otp',
  'pin',
  'cvv',
  'card_number',
  'cardnumber',
  'credit_card',
  'creditcard',
  'ssn',
  'social_security',
  'socialsecurity',
]);

/** Suffixes that indicate a key is sensitive */
const SENSITIVE_SUFFIXES = ['password', 'token', 'secret', 'auth', 'credential'];

/** Keys that should be hashed for correlation purposes (PII) */
const PII_KEYS = new Set([
  'email',
  // 'username', // Allowed through - useful for trace debugging
  'phone',
  'phone_number',
  'phonenumber',
]);

/**
 * Keys that are explicitly ALLOWED through without hashing.
 * User identifiers (uuid, username) are useful for trace correlation.
 * To re-enable hashing, move them back to PII_KEYS above.
 */
// const ALLOWED_USER_KEYS = ['username', 'userUuid', 'user_uuid', 'userId', 'user_id'];

/** Patterns that should be redacted from string values */
const SENSITIVE_PATTERNS: RegExp[] = [
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,

  // API keys with common prefixes
  /(cc_|sk_|pk_|api_|key_)[a-zA-Z0-9_-]{20,}/g,

  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9_-]+/gi,

  // Basic auth
  /Basic\s+[a-zA-Z0-9+/=]+/gi,

  // AWS-style keys
  /AKIA[0-9A-Z]{16}/g,

  // Telegram bot tokens (format: 123456789:ABC-DEF... - 35+ chars after colon)
  /\d{8,10}:[a-zA-Z0-9_-]{35,}/g,
];

export interface SanitizeOptions {
  /** Maximum depth to recursively sanitize (default: 10) */
  maxDepth?: number;
  /** Maximum string length before truncation (default: 5000) */
  maxStringLength?: number;
}

/**
 * Check if a key should be fully redacted
 */
function isSensitiveKey(key: string): boolean {
  const keyLower = key.toLowerCase();

  // Exact match
  if (SENSITIVE_KEYS.has(keyLower)) {
    return true;
  }

  // Suffix matching
  for (const suffix of SENSITIVE_SUFFIXES) {
    if (keyLower.endsWith(suffix)) {
      return true;
    }
    // Also match suffix followed by underscore (e.g., "password_hash")
    if (keyLower.includes(`${suffix}_`)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a key contains PII that should be hashed
 */
function isPiiKey(key: string): boolean {
  return PII_KEYS.has(key.toLowerCase());
}

/**
 * Hash a value for correlation purposes (sync version using simple hash)
 * Uses a simple hash since crypto.subtle requires async
 */
function hashValueSync(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '[REDACTED]';
  }

  const str = String(value);
  // Simple hash for sync operation - FNV-1a 32-bit
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `[HASHED:${hash.toString(16).padStart(8, '0')}]`;
}

/**
 * Hash a value using crypto.subtle for better security (async)
 */
export async function hashValue(value: unknown): Promise<string> {
  if (value === null || value === undefined || value === '') {
    return '[REDACTED]';
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(value));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return `[HASHED:${hashHex.substring(0, 8)}]`;
  } catch {
    // Fallback to sync hash if crypto.subtle is unavailable
    return hashValueSync(value);
  }
}

/**
 * Redact sensitive patterns from a string value
 */
export function redactSensitivePatterns(str: string): string {
  let result = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Synchronously sanitize sensitive data (for use in sync contexts)
 * Uses sync hash for PII values
 */
export function sanitizeSensitiveDataSync(data: unknown, options: SanitizeOptions = {}): unknown {
  const { maxDepth = 10, maxStringLength = 5000 } = options;

  if (maxDepth <= 0) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else if (isPiiKey(key)) {
        result[key] = hashValueSync(value);
      } else {
        result[key] = sanitizeSensitiveDataSync(value, { maxDepth: maxDepth - 1, maxStringLength });
      }
    }

    return result;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSensitiveDataSync(item, { maxDepth: maxDepth - 1, maxStringLength }));
  }

  if (typeof data === 'string') {
    let result = redactSensitivePatterns(data);
    // Truncate long strings
    if (result.length > maxStringLength) {
      result = result.substring(0, maxStringLength) + '...[TRUNCATED]';
    }
    return result;
  }

  // Numbers, booleans, etc.
  return data;
}

/**
 * Asynchronously sanitize sensitive data (for use in async contexts)
 * Uses crypto.subtle for better PII hashing
 */
export async function sanitizeSensitiveData(data: unknown, options: SanitizeOptions = {}): Promise<unknown> {
  const { maxDepth = 10, maxStringLength = 5000 } = options;

  if (maxDepth <= 0) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else if (isPiiKey(key)) {
        result[key] = await hashValue(value);
      } else {
        result[key] = await sanitizeSensitiveData(value, { maxDepth: maxDepth - 1, maxStringLength });
      }
    }

    return result;
  }

  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => sanitizeSensitiveData(item, { maxDepth: maxDepth - 1, maxStringLength })));
  }

  if (typeof data === 'string') {
    let result = redactSensitivePatterns(data);
    // Truncate long strings
    if (result.length > maxStringLength) {
      result = result.substring(0, maxStringLength) + '...[TRUNCATED]';
    }
    return result;
  }

  // Numbers, booleans, etc.
  return data;
}

/**
 * Sanitize a trace message string
 */
export function sanitizeMessage(message: string): string {
  return redactSensitivePatterns(message);
}

/**
 * Sanitize a stack trace string
 */
export function sanitizeStackTrace(stackTrace: string | undefined): string | undefined {
  if (!stackTrace) {
    return stackTrace;
  }
  return redactSensitivePatterns(stackTrace);
}

/**
 * Create sanitized tags (removes PII from tag values)
 */
export function sanitizeTags(tags: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!tags) {
    return tags;
  }

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (isPiiKey(key)) {
      sanitized[key] = hashValueSync(value);
    } else {
      sanitized[key] = redactSensitivePatterns(value);
    }
  }
  return sanitized;
}

/**
 * Get a safe URL (pathname only, no query params which may contain tokens)
 */
export function getSafeUrl(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

/**
 * Get safe context for traces
 */
export function getSafeContext(): Record<string, string> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { url: '/', userAgent: 'SSR' };
  }
  return {
    url: getSafeUrl(),
    userAgent: navigator.userAgent,
  };
}
