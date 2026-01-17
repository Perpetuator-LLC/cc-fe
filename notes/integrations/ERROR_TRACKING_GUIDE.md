# Frontend Error Tracking Guide

**Created:** January 2026  
**Status:** ✅ Implemented

---

## Overview

The traces system provides a **non-authenticated GraphQL API** for capturing errors, analytics, and telemetry. This allows tracking of pre-auth errors like authentication failures.

---

## GraphQL Mutation

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
  recordTrace(...) {
    success
    message
    traceId
  }
}
```

---

## Trace Kinds

| Kind | Description |
|------|-------------|
| `frontend_error` | JS errors, unhandled exceptions |
| `auth_failure` | Failed login attempts |
| `auth_success` | Successful logins |
| `validation_error` | Form validation failures |
| `api_error` | GraphQL/API call failures |
| `error` | Generic errors |

---

## Client-Side Sanitization

**Sanitize sensitive data BEFORE transmission.**

### Fully Redacted Keys

Replace these values with `[REDACTED]`:

- Authentication: `password`, `token`, `access_token`, `refresh_token`, `api_key`, `secret`
- Sessions: `session_id`, `csrf_token`
- Financial: `cvv`, `card_number`, `ssn`

### PII Keys (Hash, don't redact)

For correlation, hash these values:

- `email`, `username`, `phone`, `ip_address`

### Sanitization Example

```typescript
const SENSITIVE_KEYS = new Set([
  'password', 'token', 'access_token', 'refresh_token', 
  'api_key', 'secret', 'authorization'
]);

function isSensitiveKey(key: string): boolean {
  const keyLower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(keyLower)) return true;
  
  const suffixes = ['password', 'token', 'secret', 'key', 'auth'];
  return suffixes.some(suffix => keyLower.endsWith(suffix));
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
```

---

## Usage Examples

### Authentication Failures

```typescript
await recordTrace({
  kind: 'auth_failure',
  severity: 'WARNING',
  message: `Login failed for user`,
  inputs: JSON.stringify({ timestamp: new Date().toISOString() }),
  tags: JSON.stringify({ event_type: 'login_failure' })
});
```

### Global Error Handler

```typescript
window.addEventListener('error', async (event) => {
  await recordTrace({
    kind: 'frontend_error',
    severity: 'ERROR',
    message: `Uncaught error in ${event.filename}`,
    exceptionType: event.error?.name,
    exceptionMessage: event.message,
    stackTrace: event.error?.stack,
    inputs: JSON.stringify({
      url: window.location.href,
      line: event.lineno,
      column: event.colno
    })
  });
});
```

---

## Backend Safety Net

The backend applies additional sanitization, but client-side sanitization is preferred to:
1. Minimize sensitive data exposure over the network
2. Reduce backend processing overhead
3. Ensure defense-in-depth security

