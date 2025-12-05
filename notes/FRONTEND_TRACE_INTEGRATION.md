# Frontend Error Tracking Integration Guide

## Overview

The traces system provides a non-authenticated GraphQL API for capturing errors, analytics, and telemetry from frontend clients. This allows us to track user issues, authentication failures, and application errors in a centralized database for debugging and analysis.

## GraphQL Mutation

### `recordTrace`

This mutation does NOT require authentication, making it perfect for capturing authentication failures and other pre-auth errors.

**Mutation:**
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
```

## Parameters

### Required
- **`kind`** (String): Type of trace. Common values:
  - `"error"` - General errors
  - `"auth_failure"` - Authentication failures
  - `"auth_success"` - Successful authentication (for monitoring)
  - `"token_rotation"` - Token rotation events
  - `"validation_error"` - Input validation errors
  - `"frontend_error"` - Frontend-specific errors
  - `"api_error"` - API call failures

### Optional
- **`severity`** (String): Log level - `"DEBUG"`, `"INFO"`, `"WARNING"`, `"ERROR"`, `"CRITICAL"` (default: `"INFO"`)
- **`functionName`** (String): Function/component name where error occurred
- **`moduleName`** (String): Module/file path
- **`message`** (String): Human-readable error message
- **`inputs`** (JSONString): Input data that caused the error (stringified JSON)
- **`outputs`** (JSONString): Output data if relevant (stringified JSON)
- **`exceptionType`** (String): Type of exception (e.g., `"TypeError"`, `"NetworkError"`)
- **`exceptionMessage`** (String): Exception message
- **`stackTrace`** (String): Full stack trace
- **`tags`** (JSONString): Key-value pairs for filtering (stringified JSON object)
- **`requestId`** (String): Correlation ID for tracking related events

## Common Use Cases

### 1. Authentication Failures

```javascript
// After a failed login attempt
async function handleLoginError(error, username) {
  const mutation = `
    mutation RecordTrace($kind: String!, $severity: String!, $message: String!, $inputs: JSONString!, $tags: JSONString!) {
      recordTrace(
        kind: $kind
        severity: $severity
        message: $message
        inputs: $inputs
        tags: $tags
      ) {
        success
        traceId
      }
    }
  `;

  const variables = {
    kind: "auth_failure",
    severity: "WARNING",
    message: `Login failed for user: ${username}`,
    inputs: JSON.stringify({
      username: username,
      error: error.message,
      timestamp: new Date().toISOString()
    }),
    tags: JSON.stringify({
      event_type: "login_failure",
      username: username
    })
  };

  try {
    await graphqlClient.request(mutation, variables);
  } catch (e) {
    console.error("Failed to record trace:", e);
  }
}
```

### 2. Token Rotation Issues

```javascript
// When using an old/revoked refresh token
async function recordTokenRotationFailure(refreshToken, error) {
  const mutation = `
    mutation RecordTrace($kind: String!, $severity: String!, $message: String!, $exceptionMessage: String!, $tags: JSONString!) {
      recordTrace(
        kind: $kind
        severity: $severity
        message: $message
        exceptionMessage: $exceptionMessage
        tags: $tags
      ) {
        success
        traceId
      }
    }
  `;

  const variables = {
    kind: "token_rotation",
    severity: "ERROR",
    message: "Token rotation failed - possible old/revoked token",
    exceptionMessage: error.message,
    tags: JSON.stringify({
      event_type: "token_rotation_failure",
      token_prefix: refreshToken.substring(0, 10) + "...",
      error_type: error.response?.data?.error || "unknown"
    })
  };

  await graphqlClient.request(mutation, variables);
}
```

### 3. Generic Frontend Errors

```javascript
// Global error handler
window.addEventListener('error', async (event) => {
  const mutation = `
    mutation RecordTrace($kind: String!, $severity: String!, $message: String!, $exceptionType: String!, $exceptionMessage: String!, $stackTrace: String!, $inputs: JSONString!) {
      recordTrace(
        kind: $kind
        severity: $severity
        message: $message
        exceptionType: $exceptionType
        exceptionMessage: $exceptionMessage
        stackTrace: $stackTrace
        inputs: $inputs
      ) {
        success
        traceId
      }
    }
  `;

  const variables = {
    kind: "frontend_error",
    severity: "ERROR",
    message: `Uncaught error in ${event.filename}`,
    exceptionType: event.error?.name || "Error",
    exceptionMessage: event.message,
    stackTrace: event.error?.stack || "",
    inputs: JSON.stringify({
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      line: event.lineno,
      column: event.colno
    })
  };

  try {
    await graphqlClient.request(mutation, variables);
  } catch (e) {
    console.error("Failed to record trace:", e);
  }
});
```

### 4. API Call Failures

```javascript
// In your API client error interceptor
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const mutation = `
      mutation RecordTrace($kind: String!, $severity: String!, $message: String!, $inputs: JSONString!, $outputs: JSONString!, $tags: JSONString!) {
        recordTrace(
          kind: $kind
          severity: $severity
          message: $message
          inputs: $inputs
          outputs: $outputs
          tags: $tags
        ) {
          success
          traceId
        }
      }
    `;

    const variables = {
      kind: "api_error",
      severity: "ERROR",
      message: `API call failed: ${error.config?.method} ${error.config?.url}`,
      inputs: JSON.stringify({
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data
      }),
      outputs: JSON.stringify({
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }),
      tags: JSON.stringify({
        api_endpoint: error.config?.url,
        http_status: error.response?.status?.toString() || "0"
      })
    };

    try {
      await graphqlClient.request(mutation, variables);
    } catch (e) {
      console.error("Failed to record trace:", e);
    }

    return Promise.reject(error);
  }
);
```

### 5. Validation Errors

```javascript
// When form validation fails
async function recordValidationError(formName, errors) {
  const mutation = `
    mutation RecordTrace($kind: String!, $severity: String!, $message: String!, $inputs: JSONString!, $tags: JSONString!) {
      recordTrace(
        kind: $kind
        severity: $severity
        message: $message
        inputs: $inputs
        tags: $tags
      ) {
        success
        traceId
      }
    }
  `;

  const variables = {
    kind: "validation_error",
    severity: "WARNING",
    message: `Validation failed for form: ${formName}`,
    inputs: JSON.stringify({
      form: formName,
      errors: errors,
      timestamp: new Date().toISOString()
    }),
    tags: JSON.stringify({
      form_name: formName,
      error_count: Object.keys(errors).length.toString()
    })
  };

  await graphqlClient.request(mutation, variables);
}
```

## Important Notes

### Authentication
- **`recordTrace` does NOT require authentication** - this is by design to capture auth failures
- If the user is authenticated, their user info will be automatically captured
- IP address is automatically captured from the request

### Data Size Limits
- Keep `inputs` and `outputs` reasonably small (< 10KB)
- Long data will be truncated in previews
- Stack traces can be full length

### Error Handling
- Always wrap `recordTrace` calls in try-catch
- Don't let trace recording break your app flow
- Log to console if trace recording fails

### Privacy
- Don't include sensitive data (passwords, tokens, PII) in traces
- Mask or redact sensitive fields before sending

### Performance
- Consider debouncing high-frequency errors
- Don't spam traces for the same error repeatedly
- Use tags to group related errors

## Example React Hook

```javascript
import { useMutation, gql } from '@apollo/client';

const RECORD_TRACE = gql`
  mutation RecordTrace(
    $kind: String!
    $severity: String
    $message: String
    $exceptionType: String
    $exceptionMessage: String
    $stackTrace: String
    $inputs: JSONString
    $tags: JSONString
  ) {
    recordTrace(
      kind: $kind
      severity: $severity
      message: $message
      exceptionType: $exceptionType
      exceptionMessage: $exceptionMessage
      stackTrace: $stackTrace
      inputs: $inputs
      tags: $tags
    ) {
      success
      message
      traceId
    }
  }
`;

export function useErrorTracker() {
  const [recordTrace] = useMutation(RECORD_TRACE);

  const trackError = async (error, context = {}) => {
    try {
      await recordTrace({
        variables: {
          kind: context.kind || "frontend_error",
          severity: context.severity || "ERROR",
          message: context.message || error.message,
          exceptionType: error.name,
          exceptionMessage: error.message,
          stackTrace: error.stack,
          inputs: JSON.stringify({
            ...context,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }),
          tags: JSON.stringify(context.tags || {})
        }
      });
    } catch (e) {
      console.error('Failed to record error trace:', e);
    }
  };

  const trackAuthFailure = async (username, error) => {
    await trackError(error, {
      kind: "auth_failure",
      severity: "WARNING",
      message: `Login failed for user: ${username}`,
      tags: { event_type: "login_failure", username }
    });
  };

  return { trackError, trackAuthFailure };
}
```

## Backend Tracking

The backend automatically tracks:
- Failed login attempts (with IP address)
- Token rotation failures
- Invalid/expired tokens
- Task failures (Celery)
- Validation errors
- AI call errors

Frontend should complement this by tracking:
- Client-side errors
- Network failures
- User-facing validation issues
- UI state errors

## Querying Traces (Admin Only)

Authenticated users can query their traces:

```graphql
query GetTraces($kind: String, $limit: Int) {
  traces(kind: $kind, limit: $limit) {
    id
    createdAt
    kind
    severity
    message
    exceptionType
    exceptionMessage
    tags
  }
}
```

## TTL (Time To Live)

- Most traces: **30 days** retention
- AI call traces with full prompts: **7 days** retention
- Automatic cleanup via `python manage.py cleanup_traces`

## Admin Interface

Admins can view all traces at: `/admin/traces/trace/`

Filter by:
- Kind
- Severity
- Date range
- User
- AI model
- Tags

This allows debugging production issues and monitoring system health.

