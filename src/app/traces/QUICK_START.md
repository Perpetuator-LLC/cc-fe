# Trace Integration - Quick Reference

## TL;DR

✅ **Automatic error tracking is now active** - No code changes needed  
✅ **Original build errors are fixed**  
✅ **Production ready** - Build successful

## Import and Use

```typescript
import { TraceService } from './traces/services/trace.service';

constructor(private traceService: TraceService) {}
```

## Common Use Cases

### Track User Actions
```typescript
// Button click
onButtonClick() {
  this.traceService.trackUserAction('button_clicked', {
    button_id: 'submit',
    page: 'checkout'
  }).subscribe();
}

// Page view
ngOnInit() {
  this.traceService.trackUserAction('page_view', {
    page_name: this.pageName
  }).subscribe();
}
```

### Track Errors
```typescript
// Automatic - already works for all errors!

// Manual with context
try {
  // ... your code
} catch (error) {
  this.traceService.trackError(error, {
    moduleName: 'MyComponent',
    tags: { feature: 'payments' }
  }).subscribe();
}
```

### Track Form Validation
```typescript
if (!this.form.valid) {
  this.traceService.trackValidationError('signup_form', {
    email: 'Invalid format',
    password: 'Too short'
  }).subscribe();
}
```

## What's Automatically Tracked

✅ All JavaScript errors  
✅ All HTTP errors  
✅ All GraphQL errors  
✅ All navigation errors  
✅ Login successes/failures  
✅ Session expirations

## Configuration

```typescript
// Disable tracking
traceService.setEnabled(false);

// Enable debug mode
traceService.setDebugMode(true);
```

## Documentation

- Full docs: `src/app/traces/README.md`
- API reference: `logs/ai_edits/FRONTEND_TRACE_INTEGRATION.md`
- Example: `src/app/traces/examples/trace-example.component.ts`

## Backend Query

```graphql
query GetTraces {
  traces(kind: "frontend_error", limit: 100) {
    id
    createdAt
    message
    tags
  }
}
```

## Trace Types

- `frontend_error` - JS errors
- `graphql_error` - GraphQL failures
- `api_error` - HTTP failures
- `auth_failure` / `auth_success` - Authentication
- `validation_error` - Form validation
- `user_action` - Analytics
- `navigation_error` - Routing issues

## Security Notes

✅ Passwords automatically redacted  
✅ Tokens automatically redacted  
✅ Large payloads automatically truncated  
✅ Never throws errors (fail-safe)

## Next Steps

1. Monitor traces in admin: `/admin/traces/trace/`
2. Add user action tracking to key features
3. Set up error rate dashboards
4. Configure critical error alerts

---

**Questions?** See `src/app/traces/README.md` for complete documentation.

