# Frontend Trace Sanitization Guide

This document provides specifications for implementing client-side sanitization of sensitive data before transmitting traces to the backend API.

## Overview

The trace system captures errors, analytics, and telemetry from frontend clients. While the backend applies sanitization as a safety net, **sensitive data should be sanitized on the frontend BEFORE transmission** to:

1. Minimize exposure of sensitive data over the network
2. Reduce backend processing overhead
3. Ensure defense-in-depth security

## API Endpoint

```graphql
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
  $source: String
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
    source: $source
  ) {
    success
    message
    traceId
  }
}
```

**Note**: This endpoint is intentionally public (no authentication required) to allow error logging from unauthenticated users.

## Trace Kinds

Use these standardized trace kinds:

| Kind | Description |
|------|-------------|
| `frontend_error` | JavaScript errors, React errors, unhandled exceptions |
| `auth_failure` | Failed login attempts (from frontend perspective) |
| `auth_success` | Successful logins |
| `validation_error` | Form validation failures |
| `api_error` | GraphQL/API call failures |
| `error` | Generic errors |

## Sanitization Specification

### Sensitive Keys (MUST be fully redacted)

Replace values for these keys with `[REDACTED]`:

```javascript
const SENSITIVE_KEYS = new Set([
  // Authentication
  'password',
  'new_password',
  'newPassword',
  'old_password', 
  'oldPassword',
  'current_password',
  'currentPassword',
  'confirm_password',
  'confirmPassword',
  
  // Tokens & Keys
  'token',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'api_key',
  'apiKey',
  'secret',
  'secret_key',
  'secretKey',
  'private_key',
  'privateKey',
  
  // Auth Headers
  'authorization',
  'auth_token',
  'authToken',
  'bearer',
  'credential',
  'credentials',
  
  // Third-party Tokens
  'tg_bot_token',
  'tgBotToken',
  'telegram_token',
  'telegramToken',
  'bot_token',
  'botToken',
  
  // Session
  'session_id',
  'sessionId',
  'session_key',
  'sessionKey',
  'csrf_token',
  'csrfToken',
  'csrf',
  
  // Sensitive PII
  'otp',
  'pin',
  'cvv',
  'card_number',
  'cardNumber',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
  'socialSecurity',
]);
```

### Key Detection Logic

A key should be redacted if:
1. It exactly matches a sensitive key (case-insensitive), OR
2. It ends with a sensitive suffix: `password`, `token`, `secret`, `key`, `auth`, `credential`

```javascript
function isSensitiveKey(key) {
  const keyLower = key.toLowerCase();
  
  // Exact match
  if (SENSITIVE_KEYS.has(keyLower)) {
    return true;
  }
  
  // Suffix matching
  const sensitiveSuffixes = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  for (const suffix of sensitiveSuffixes) {
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
```

### PII Keys (Hash, don't fully redact)

For correlation purposes, PII should be hashed rather than fully redacted:

```javascript
const PII_KEYS = new Set([
  'email',
  'username',
  'phone',
  'phone_number',
  'phoneNumber',
  'ip_address',
  'ipAddress',
  'ip',
  'address',
]);

function isPiiKey(key) {
  return PII_KEYS.has(key.toLowerCase());
}
```

### Hashing Function

Use a simple hash for PII (allows correlation across traces without exposing values):

```javascript
async function hashValue(value) {
  if (value === null || value === undefined || value === '') {
    return '[REDACTED]';
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(String(value));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `[HASHED:${hashHex.substring(0, 8)}]`;
}
```

### Pattern Detection in String Values

Scan string values for sensitive patterns and redact:

```javascript
const SENSITIVE_PATTERNS = [
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
  
  // Telegram bot tokens (format: 123456789:ABC-DEF...)
  /\d{8,10}:[a-zA-Z0-9_-]{35}/g,
];

function redactSensitivePatterns(str) {
  if (typeof str !== 'string') return str;
  
  let result = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
```

## Complete Sanitization Function

```typescript
interface SanitizeOptions {
  maxDepth?: number;
}

async function sanitizeSensitiveData(
  data: unknown,
  options: SanitizeOptions = {}
): Promise<unknown> {
  const { maxDepth = 10 } = options;
  
  if (maxDepth <= 0) {
    return '[MAX_DEPTH_EXCEEDED]';
  }
  
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'object' && !Array.isArray(data)) {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else if (isPiiKey(key)) {
        result[key] = await hashValue(value);
      } else {
        result[key] = await sanitizeSensitiveData(value, { maxDepth: maxDepth - 1 });
      }
    }
    
    return result;
  }
  
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => sanitizeSensitiveData(item, { maxDepth: maxDepth - 1 }))
    );
  }
  
  if (typeof data === 'string') {
    return redactSensitivePatterns(data);
  }
  
  // Numbers, booleans, etc.
  return data;
}
```

## Usage Examples

### Recording a Frontend Error

```typescript
async function recordError(error: Error, context?: Record<string, unknown>) {
  const sanitizedContext = await sanitizeSensitiveData(context);
  
  await graphqlClient.mutate({
    mutation: RECORD_TRACE,
    variables: {
      kind: 'frontend_error',
      severity: 'ERROR',
      message: redactSensitivePatterns(error.message),
      exceptionType: error.name,
      exceptionMessage: redactSensitivePatterns(error.message),
      stackTrace: redactSensitivePatterns(error.stack || ''),
      inputs: JSON.stringify(sanitizedContext),
      source: 'frontend',
      tags: JSON.stringify({
        url: window.location.pathname, // Don't include query params
        userAgent: navigator.userAgent,
      }),
    },
  });
}
```

### Recording a Failed Login Attempt

```typescript
async function recordLoginFailure(username: string, reason: string) {
  await graphqlClient.mutate({
    mutation: RECORD_TRACE,
    variables: {
      kind: 'auth_failure',
      severity: 'WARNING',
      message: `Login failed: ${reason}`,
      inputs: JSON.stringify({
        username: await hashValue(username), // Hash, don't expose
        reason: reason,
      }),
      source: 'frontend',
      tags: JSON.stringify({
        event_type: 'login_failure',
        reason: reason,
      }),
    },
  });
}
```

### Recording an API Error

```typescript
async function recordApiError(
  operation: string,
  variables: Record<string, unknown>,
  error: Error
) {
  const sanitizedVariables = await sanitizeSensitiveData(variables);
  
  await graphqlClient.mutate({
    mutation: RECORD_TRACE,
    variables: {
      kind: 'api_error',
      severity: 'ERROR',
      functionName: operation,
      message: redactSensitivePatterns(error.message),
      inputs: JSON.stringify(sanitizedVariables),
      exceptionType: error.name,
      exceptionMessage: redactSensitivePatterns(error.message),
      source: 'frontend',
    },
  });
}
```

## Global Error Handler Integration

```typescript
// React Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    recordError(error, {
      componentStack: errorInfo.componentStack,
    });
  }
}

// Global unhandled error
window.onerror = (message, source, lineno, colno, error) => {
  recordError(error || new Error(String(message)), {
    source,
    lineno,
    colno,
  });
};

// Unhandled promise rejections
window.onunhandledrejection = (event) => {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
  recordError(error, { type: 'unhandled_promise_rejection' });
};
```

## What NOT to Include in Traces

Never include these in trace data, even if sanitized:

1. **Full request/response bodies** - Truncate to reasonable size (e.g., first 500 chars)
2. **localStorage/sessionStorage dumps** - May contain tokens
3. **Cookie values** - Always sensitive
4. **Query string parameters** - May contain tokens or PII
5. **Full URLs with query params** - Use pathname only
6. **Form field values** - Unless specifically needed and sanitized

## Testing Your Sanitization

Before deploying, verify sanitization works:

```typescript
// Test cases
const testData = {
  username: 'testuser',
  password: 'secret123',
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  email: 'test@example.com',
  nested: {
    api_key: 'sk_live_abc123',
    data: 'normal data',
  },
};

const sanitized = await sanitizeSensitiveData(testData);

// Verify:
// - password === '[REDACTED]'
// - access_token === '[REDACTED]'
// - username starts with '[HASHED:'
// - email starts with '[HASHED:'
// - nested.api_key === '[REDACTED]'
// - nested.data === 'normal data'
```

## Backend Safety Net

The backend applies identical sanitization as a safety net. However, **do not rely on this** - always sanitize on the frontend to:

1. Prevent sensitive data from appearing in network logs
2. Reduce data exposure window
3. Minimize backend processing

## Trace Query APIs (Admin Only)

Note: The trace query APIs (`traces` and `trace`) require admin privileges (`is_staff=true`). Regular users cannot query trace data - they can only submit traces via `recordTrace`.

## Questions?

Contact the backend team if you need:
- Additional trace kinds added
- New sensitive patterns detected
- Clarification on what should be sanitized

