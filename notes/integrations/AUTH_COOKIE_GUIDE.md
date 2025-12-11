# Authentication Guide

**Updated:** December 11, 2025  
**Status:** ✅ Simplified - localStorage + Bearer tokens

## Overview

| Component | Domain | Role |
|-----------|--------|------|
| Frontend (Angular) | `capitalcopilot.io` | SPA served to browser |
| Backend (Django/GraphQL) | `api.capitalcopilot.io` | API server |

## Architecture

### Token Storage: localStorage

Tokens are stored in **localStorage**, which is industry standard for SPAs with cross-origin APIs.

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   localStorage                       │   │
│  │                                                      │   │
│  │  • access_token    (JWT/opaque token)               │   │
│  │  • refresh_token   (for token refresh)              │   │
│  │  • expires_at      (expiration timestamp)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Auth Interceptor                        │   │
│  │                                                      │   │
│  │  Authorization: Bearer <token from localStorage>    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Django Backend                           │
│                (api.capitalcopilot.io)                      │
├─────────────────────────────────────────────────────────────┤
│  • Validates Authorization: Bearer header                   │
│  • Returns tokens in response body                          │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### Token Storage Service (`src/app/auth/token-storage.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  // Store tokens from OAuth2 response
  storeTokens(data: { accessToken, refreshToken, expiresAt, ... }): void;

  // Get token for Authorization header
  getAccessToken(): string | null;

  // Check if token is expired (with 30 second buffer)
  isAccessTokenExpired(): boolean;

  // Check if user has a valid session
  hasSession(): boolean {
    return !!this.getAccessToken() && !this.isAccessTokenExpired();
  }
}
```

### Auth Interceptor (`src/app/auth/interceptors/auth.interceptor.ts`)

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = tokenStorage.getAccessToken();

  let authReq = req.clone({ withCredentials: true });

  if (token && !tokenStorage.isAccessTokenExpired()) {
    authReq = authReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq);
};
```

### GraphQL Provider (`src/app/graphql.provider.ts`)

```typescript
const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    authorization: token ? `Bearer ${token}` : '',
  },
}));

const uploadLink = createUploadLink({
  uri,
  credentials: 'include',
});
```

## Authentication Flow

```
1. User enters credentials
2. Frontend calls POST /o/token/
3. Backend returns { access_token, refresh_token, expires_in }
4. Frontend stores tokens in localStorage
5. Frontend sends Authorization: Bearer <token> on API requests
6. Backend validates token on every request
```

## Why Not Cookies?

The backend sets a `logged_in` cookie, but the frontend **does not use it** because:

1. **Redundant**: Frontend already has the token in localStorage
2. **Sync issues**: Cookie and localStorage can get out of sync
3. **Cross-subdomain doesn't help**: Each subdomain has its own localStorage

Session detection simply checks:
```typescript
hasSession(): boolean {
  return !!this.getAccessToken() && !this.isAccessTokenExpired();
}
```

## Security Considerations

### ✅ This approach is industry standard for SPAs

- **localStorage + Bearer tokens**: Used by Google, GitHub, Facebook for cross-origin APIs
- **Angular XSS protection**: Built-in template sanitization
- **Server-side validation**: Backend validates token on every request

### ⚠️ XSS Protection Required

Since localStorage is accessible to JavaScript:
- Content Security Policy (CSP) should be configured
- Never render unsanitized user input
- Keep dependencies updated

## Development Notes

### Local Development

- Use consistent hostname (`localhost` or `127.0.0.1`, not mixed)
- Backend CORS must allow frontend origin

### Debugging

1. **Check localStorage**: DevTools > Application > Local Storage
2. **Check Network**: Verify `Authorization: Bearer` header is sent
3. **Check Console**: Look for auth-related errors
