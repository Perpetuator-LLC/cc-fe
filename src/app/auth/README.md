# Auth Directory

This directory contains all authentication-related services, components, and utilities.

## Architecture Overview

### Core Services

#### `oauth.service.ts` - OAuth2 Implementation
**Class**: `OAuthService`  
**Purpose**: Core OAuth2 authentication using password grant and authorization code flows

**Key Features**:
- OAuth2 password grant login (`loginWithPassword()`)
- OAuth2 authorization code flow (`login()`)
- Token management (access/refresh tokens)
- Token refresh with automatic retry
- User profile management
- Integration with angular-oauth2-oidc library
- Trace service integration for analytics

**When to use**: Don't use directly in application code unless you need OAuth-specific functionality. Use `AuthService` facade instead.

**Dependencies**:
- `angular-oauth2-oidc` - OAuth2 library
- `TraceService` - Analytics (lazy-loaded to avoid circular dependency)

---

#### `auth.service.ts` - Application Facade
**Class**: `AuthService`  
**Purpose**: Thin facade/wrapper around `OAuthService` for backward compatibility

**Key Features**:
- Delegates OAuth operations to `OAuthService`
- Provides legacy HTTP endpoints:
  - `forgot(email)` - Password reset
  - `resend(email)` - Resend verification email
- Maintains backward compatibility with existing code

**When to use**: This is the PRIMARY service to inject in application components. Most of the app uses this (21+ files).

**Why it exists**: 
1. Provides simple, stable API for app code
2. Hides OAuth complexity
3. Allows adding HTTP-based auth operations without polluting OAuth service
4. Makes future auth provider changes easier

---

#### `graphql-auth.service.ts` - GraphQL Auth Operations
**Class**: `GraphqlAuthService`  
**Purpose**: Handles authentication operations via GraphQL mutations

**Key Features**:
- User registration (with OAuth2 login)
- Email verification
- Password reset via GraphQL
- Resend verification via GraphQL

**When to use**: When you need GraphQL-based auth operations (primarily used by auth components).

---

### Interceptors

#### `interceptors/auth.interceptor.ts`
**Purpose**: HTTP interceptor that adds `Authorization: Bearer <token>` headers to requests

**Behavior**:
- Automatically adds OAuth token to all HTTP requests
- Skips OAuth2 endpoints (`/o/token/`, `/o/authorize/`)
- Used in `app.config.ts`

---

## Component Structure

```
/auth/
  oauth.service.ts           # Core OAuth2 implementation
  oauth.service.spec.ts      # OAuth tests
  auth.service.ts            # Application facade (USE THIS)
  auth.service.spec.ts       # Facade tests
  graphql-auth.service.ts    # GraphQL mutations
  auth.guard.ts              # Route guard
  auth.graphql.ts            # GraphQL queries/mutations
  
  interceptors/
    auth.interceptor.ts      # HTTP interceptor for auth headers
    auth.interceptor.spec.ts
  
  auth-callback/             # OAuth callback handler
  login/                     # Login component
  register/                  # Registration component
  forgot-password/           # Password reset request
  reset-password/            # Password reset form
  verify-email/              # Email verification
  resend-verification/       # Resend verification email
  change-email/              # Change email
  cancel-change-email/       # Cancel email change
```

---

## Usage Examples

### Basic Auth Check (Most Common)
```typescript
import { AuthService } from '../auth/auth.service';

export class MyComponent {
  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Check if logged in
    if (this.authService.isLoggedIn()) {
      // User is authenticated
    }

    // Get token for manual HTTP requests
    const token = this.authService.getToken();

    // Logout
    this.authService.logout();
  }
}
```

### Login Flow (Login Component)
```typescript
import { OAuthService } from '../oauth.service';

export class LoginComponent {
  constructor(private oauthService: OAuthService) {}

  onSubmit() {
    this.oauthService.loginWithPassword(email, password).subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.messageService.error(err.message);
      }
    });
  }
}
```

### Registration (Register Component)
```typescript
import { GraphqlAuthService } from '../graphql-auth.service';

export class RegisterComponent {
  constructor(private graphqlAuthService: GraphqlAuthService) {}

  onSubmit() {
    this.graphqlAuthService.register(email, password).subscribe({
      next: (success) => {
        if (success) {
          this.messageService.success('Check your email for verification');
        }
      }
    });
  }
}
```

### Route Protection
```typescript
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard] // Requires authentication
  }
];
```

---

## Design Decisions

### Why Separate OAuthService and AuthService?

**Separation of Concerns**:
- `OAuthService` = OAuth2 protocol implementation
- `AuthService` = Application-level authentication API

**Benefits**:
1. **Clean API**: App code doesn't need to know about OAuth specifics
2. **Flexibility**: Can add non-OAuth endpoints without polluting OAuth service
3. **Testability**: Easier to mock in tests
4. **Future-proof**: Can swap OAuth providers or add additional auth methods
5. **Backward Compatibility**: Existing code continues to work

### Why Move from /core to /auth?

**Problems with /core**:
- "core" is too generic and ambiguous
- Mixed auth with other utilities
- Difficult to find auth-related code

**Benefits of /auth**:
- All auth code in one place
- Clear purpose from directory name
- Easier for new developers to understand
- Follows single-responsibility principle

---

## Migration Notes

### What Changed (December 7, 2025)
1. Moved `core/auth.service.ts` → `auth/oauth.service.ts`
2. Renamed `OAuthAuthService` → `OAuthService`
3. Moved `core/interceptors/auth.interceptor.ts` → `auth/interceptors/auth.interceptor.ts`
4. Deleted `auth.service.old.ts` (old JWT implementation)
5. Deleted `auth.service.graphql-version.ts` (unused reference)
6. Updated all imports across 20+ files

### Backward Compatibility
- `AuthService` facade unchanged - existing code still works
- Same API surface, just reorganized internally

---

## Testing

Run auth-specific tests:
```bash
npm test -- --include='**/auth/**/*.spec.ts' --watch=false
```

---

## Related Documentation
- See `/notes/FRONTEND_TRACE_INTEGRATION.md` for auth analytics
- See environment files for OAuth configuration
- See `app.config.ts` for interceptor registration

