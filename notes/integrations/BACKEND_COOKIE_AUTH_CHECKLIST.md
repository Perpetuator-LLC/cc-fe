# Backend Cookie Authentication Checklist

**Date:** December 11, 2025  
**Status:** ✅ Frontend simplified - `logged_in` cookie not needed

## Overview

The frontend uses **localStorage + Bearer tokens** for authentication:
- **Tokens**: Returned in response body, stored in localStorage, sent via `Authorization: Bearer` header
- **Session detection**: Based on token presence and expiration in localStorage

---

## Architecture Summary

| What | Where | Purpose |
|------|-------|---------|
| `access_token` | Response body → localStorage | API authentication |
| `refresh_token` | Response body → localStorage | Token refresh |

---

## Why `logged_in` Cookie is Not Used

The backend sets a `logged_in` cookie, but **the frontend does not rely on it** because:

1. **Redundant**: Frontend already knows if user is logged in by checking localStorage token
2. **Sync issues**: Cookie and localStorage can get out of sync, causing confusing UX
3. **Cross-subdomain doesn't help**: Each subdomain has its own localStorage, so knowing you're "logged in" elsewhere doesn't give you access
4. **False positives**: Cookie could be `true` but token could be missing/expired

**The frontend uses `hasSession()` which simply checks:**
```typescript
hasSession(): boolean {
  const token = this.getAccessToken();
  return !!token && !this.isAccessTokenExpired();
}
```

---

## Backend Requirements

### ✅ What Backend Needs to Do

- [x] **OAuth2 endpoints** return tokens in response body
- [x] **CORS** configured with `credentials: true`
- [x] **Validate Bearer token** on every request

### ⚠️ Optional (Backend can keep or remove)

- [ ] **`logged_in` cookie** - Frontend doesn't use it, but backend can keep for other purposes

---

## Frontend Implementation

### ✅ What the Frontend Does

1. **Stores tokens in localStorage**
2. **Sends `Authorization: Bearer <token>`** header on all API requests
3. **Checks localStorage** for session detection (not cookies)
4. **Sends `withCredentials: true`** (in case backend uses cookies for anything)

### Auth Interceptor

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

---

## Security Notes

### ✅ This is Industry Standard

Major SPAs (Google, GitHub, etc.) use localStorage + Bearer tokens for cross-origin APIs.

### ⚠️ XSS Protection Required

Since localStorage is accessible to JavaScript:
- Angular has built-in XSS protection (template sanitization)
- Configure Content Security Policy (CSP)
- Keep dependencies updated

---

## Testing Checklist

1. **Login**: Verify tokens returned in response body
2. **localStorage**: Verify tokens stored (DevTools > Application > Local Storage)
3. **API Request**: Verify `Authorization: Bearer` header is sent
4. **Session Detection**: Verify `hasSession()` returns true after login
5. **Logout**: Verify tokens cleared from localStorage

---

## See Also

- `notes/integrations/AUTH_COOKIE_GUIDE.md` - Full frontend guide
- `logs/AUTH_COOKIE_CROSS_DOMAIN.md` - Backend implementation details
