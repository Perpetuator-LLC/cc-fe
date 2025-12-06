# Traces Feature

## Overview

The traces feature provides comprehensive error tracking and analytics for the Capital Copilot frontend application. It automatically captures and sends error information to the backend for debugging and analysis.

## Architecture

### Core Service
- **`TraceService`** (`src/app/traces/services/trace.service.ts`)
  - Central service for recording traces
  - Does NOT require authentication (can capture auth failures)
  - Automatically enriches traces with context (URL, user agent, timestamp)
  - Sanitizes sensitive data (passwords, tokens)
  - Never throws errors (fail-safe design)

### Automatic Error Tracking

The system automatically tracks errors through multiple integration points:

1. **Global Error Handler** (`GlobalErrorHandler`)
   - Catches all unhandled JavaScript errors
   - Integrated via Angular's `ErrorHandler` provider

2. **HTTP Error Interceptor** (`errorTrackingInterceptor`)
   - Tracks failed HTTP requests
   - Skips GraphQL errors (handled separately)
   - Captures request/response details

3. **GraphQL Error Link** (`ApolloErrorLinkFactory`)
   - Tracks GraphQL operation errors
   - Captures operation name and variables
   - Separates network errors from GraphQL errors

4. **Router Error Tracker** (`RouterErrorTracker`)
   - Tracks navigation failures
   - Captures target route and error details

5. **Base Services** (`ErrorHandlerService`, `BaseService`)
   - All service errors flow through ErrorHandlerService
   - Automatically tracked before being handled

6. **Authentication** (`AuthService`)
   - Tracks login successes and failures
   - Tracks token rotation issues
   - Tracks session expiration

## Usage

### Automatic Tracking

Most errors are tracked automatically. No code changes needed for:
- Unhandled exceptions
- HTTP errors
- GraphQL errors
- Navigation errors
- Authentication failures

### Manual Tracking

Use the TraceService directly for custom tracking:

```typescript
import { TraceService } from './traces/services/trace.service';

constructor(private traceService: TraceService) {}

// Track a custom error
this.traceService.trackError(
  new Error('Something went wrong'),
  {
    moduleName: 'MyComponent',
    functionName: 'doSomething',
    inputs: { userId: '123' },
    tags: { feature: 'payments' }
  }
).subscribe();

// Track user actions
this.traceService.trackUserAction('button_clicked', {
  button_id: 'submit_form',
  form_name: 'contact'
}).subscribe();

// Track validation errors
this.traceService.trackValidationError('contact_form', {
  email: 'Invalid email format',
  phone: 'Required field'
}).subscribe();
```

### Trace Types

- **`frontend_error`** - General frontend errors
- **`graphql_error`** - GraphQL operation errors
- **`api_error`** - HTTP API errors
- **`auth_failure`** - Authentication failures
- **`auth_success`** - Successful logins
- **`token_rotation`** - Token refresh issues
- **`validation_error`** - Form validation errors
- **`navigation_error`** - Router navigation errors
- **`user_action`** - User analytics events

### Severity Levels

- **`DEBUG`** - Detailed debugging information
- **`INFO`** - General informational events
- **`WARNING`** - Warning messages (e.g., auth failures)
- **`ERROR`** - Error events
- **`CRITICAL`** - Critical failures

## Data Privacy

The system automatically:
- **Redacts sensitive data**: Passwords, tokens, API keys are replaced with `[REDACTED]`
- **Truncates large payloads**: Inputs/outputs over 5KB are truncated
- **Sanitizes stack traces**: Personal file paths may be visible in dev, but not in production

### Sensitive Fields Auto-Redacted
- `password`
- `token`
- `secret`
- `apiKey`
- `accessToken`
- `refreshToken`

## Configuration

### Enable/Disable Tracking

```typescript
// Disable all tracking
traceService.setEnabled(false);

// Re-enable tracking
traceService.setEnabled(true);
```

### Debug Mode

```typescript
// Enable debug logging (automatically on in development)
traceService.setDebugMode(true);

// Disable debug logging
traceService.setDebugMode(false);
```

## Backend Integration

Traces are sent to the backend via the `recordTrace` GraphQL mutation. See `FRONTEND_TRACE_INTEGRATION.md` for the complete API documentation.

### Query Your Traces (Admin)

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

## Testing

Run trace service tests:
```bash
npm test -- --include='**/trace.service.spec.ts'
```

## Troubleshooting

### Traces Not Being Sent

1. Check if tracking is enabled: `traceService.setEnabled(true)`
2. Check browser console for "[TraceService]" messages
3. Check network tab for GraphQL mutation to `/graphql/`
4. Verify backend is running and accessible

### Too Many Traces

1. Check for error loops (errors causing more errors)
2. Consider debouncing high-frequency events
3. Use tags to filter and analyze trace patterns

### Sensitive Data in Traces

1. Verify auto-sanitization is working
2. Add custom sensitive field names to sanitization list
3. Review trace data in admin interface

## Performance Impact

- **Negligible**: Traces are sent asynchronously
- **Non-blocking**: Never interrupts user experience
- **Fail-safe**: Errors in trace recording are caught and logged
- **Optimized**: Large payloads are truncated automatically

## Best Practices

1. **Don't spam**: Avoid recording the same error repeatedly
2. **Use tags**: Tag traces for easy filtering (`feature`, `component`, `user_id`)
3. **Add context**: Include relevant inputs/outputs for debugging
4. **Track user journeys**: Use `user_action` traces to understand user behavior
5. **Monitor regularly**: Review traces in admin to find patterns

## Future Enhancements

- [ ] User session tracking
- [ ] Performance metrics (page load, API response times)
- [ ] User journey analytics
- [ ] A/B test tracking
- [ ] Feature usage analytics
- [ ] Error rate dashboards
- [ ] Automated alerting for critical errors

