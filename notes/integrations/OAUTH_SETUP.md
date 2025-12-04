# OAuth2 Setup and Configuration

> **Note:** This guide covers OAuth2 integration between the Capital Copilot frontend and backend.

## Table of Contents

1. [Overview](#overview)
2. [Backend Configuration](#backend-configuration)
3. [Frontend Configuration](#frontend-configuration)
4. [Demo Application](#demo-application)
5. [Troubleshooting](#troubleshooting)

## Overview

Capital Copilot uses OAuth2 Authorization Code Flow for secure authentication. The backend (Django + django-oauth-toolkit) provides OAuth2 endpoints, and the frontend (Angular) consumes them.

### OAuth2 Flow

```
┌─────────┐                                  ┌─────────┐
│ Browser │                                  │ Backend │
└────┬────┘                                  └────┬────┘
     │                                            │
     │  1. Navigate to /demo.html                │
     ├──────────────────────────────────────────▶│
     │                                            │
     │  2. Click "Login with OAuth2"             │
     │     GET /o/authorize/?                    │
     │         client_id=...&                    │
     │         redirect_uri=...&                 │
     │         response_type=code                │
     ├──────────────────────────────────────────▶│
     │                                            │
     │  3. User authorizes                       │
     │                                            │
     │  4. Redirect with code                    │
     │     /callback?code=ABC123                 │
     │◀──────────────────────────────────────────┤
     │                                            │
     │  5. Exchange code for token               │
     │     POST /o/token/                        │
     │         grant_type=authorization_code&    │
     │         code=ABC123&                      │
     │         redirect_uri=...                  │
     ├──────────────────────────────────────────▶│
     │                                            │
     │  6. Return access token                   │
     │     { access_token, refresh_token }       │
     │◀──────────────────────────────────────────┤
     │                                            │
     │  7. Use token for API calls               │
     │     Authorization: Bearer <token>         │
     ├──────────────────────────────────────────▶│
     │                                            │
```

## Backend Configuration

### Step 1: Create OAuth2 Application

On your backend server:

```bash
cd /path/to/capital-copilot-be
python manage.py shell
```

```python
from oauth2_provider.models import Application

# Create new OAuth2 application
app = Application.objects.create(
    name='Capital Copilot Frontend',
    client_type=Application.CLIENT_PUBLIC,
    authorization_grant_type=Application.GRANT_AUTHORIZATION_CODE,
    redirect_uris='http://localhost:4200/callback\nhttps://capitalcopilot.io/callback'
)

print(f"✅ Created OAuth2 Application")
print(f"Client ID: {app.client_id}")
print(f"Redirect URIs: {app.redirect_uris}")
```

### Step 2: Configure Redirect URIs

The redirect URIs must **exactly match** what the frontend sends. Include all environments:

```python
from oauth2_provider.models import Application

# Get existing application
app = Application.objects.get(client_id='YOUR_CLIENT_ID')

# Set redirect URIs for all environments
app.redirect_uris = """http://localhost:4200/callback
http://127.0.0.1:4200/callback
https://capitalcopilot.io/callback"""

app.save()

print("✅ Updated redirect URIs:")
for uri in app.redirect_uris.split():
    print(f"  ✓ {uri}")
```

### Step 3: Verify Configuration

```python
app.refresh_from_db()
print("\n📋 OAuth2 Application Configuration:")
print(f"Name: {app.name}")
print(f"Client ID: {app.client_id}")
print(f"Client Type: {app.client_type}")
print(f"Grant Type: {app.authorization_grant_type}")
print(f"\nRedirect URIs:")
for uri in app.redirect_uris.split():
    print(f"  ✓ {uri}")
```

**Expected Output:**
```
📋 OAuth2 Application Configuration:
Name: Capital Copilot Frontend
Client ID: BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME
Client Type: public
Grant Type: authorization-code

Redirect URIs:
  ✓ http://localhost:4200/callback
  ✓ http://127.0.0.1:4200/callback
  ✓ https://capitalcopilot.io/callback
```

### Backend Setup Script

Save as `scripts/setup_oauth_redirect_uris.py`:

```python
from oauth2_provider.models import Application

CLIENT_ID = 'YOUR_CLIENT_ID_HERE'

try:
    app = Application.objects.get(client_id=CLIENT_ID)
    
    app.redirect_uris = """http://localhost:4200/callback
http://127.0.0.1:4200/callback
https://capitalcopilot.io/callback"""
    
    app.save()
    
    print("✅ Successfully updated OAuth2 redirect URIs")
    print("\nRegistered URIs:")
    for uri in app.redirect_uris.split():
        print(f"  ✓ {uri}")
        
except Application.DoesNotExist:
    print(f"❌ No OAuth2 application found with client_id: {CLIENT_ID}")
```

Run it:
```bash
cd capital-copilot-be
python manage.py shell < scripts/setup_oauth_redirect_uris.py
```

## Frontend Configuration

### Environment Variables

**Development (`src/environments/environment.ts`):**
```typescript
export const environment = {
  production: false,
  API_URL: 'http://127.0.0.1:8000',
  OAUTH_CLIENT_ID: 'YOUR_DEV_CLIENT_ID',
  OAUTH_REDIRECT_URI: 'http://localhost:4200/callback',
};
```

**Production (`src/environments/environment.prod.ts`):**
```typescript
export const environment = {
  production: true,
  API_URL: 'https://api.capitalcopilot.io',
  OAUTH_CLIENT_ID: 'YOUR_PROD_CLIENT_ID',
  OAUTH_REDIRECT_URI: 'https://capitalcopilot.io/callback',
};
```

### OAuth Service Integration

See [OAUTH_GRAPHQL_DOCS_QUICKREF.md](./OAUTH_GRAPHQL_DOCS_QUICKREF.md) for Angular service implementation details.

## Demo Application

The `public/demo.html` file is a standalone OAuth2 demonstration page for testing and development.

### License

The demo file is **freely available** for developers:
- ✅ Copy, modify, use, and distribute
- ✅ No attribution required

### Demo Configuration

#### Development

```
http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&redirectUri=http://localhost:4200/callback&clientId=YOUR_DEV_CLIENT_ID
```

#### Production

```
https://capitalcopilot.io/demo.html?clientId=YOUR_CLIENT_ID
```

### Query Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `apiUrl` | Backend API URL | `https://api.capitalcopilot.io` | `http://127.0.0.1:8000` |
| `redirectUri` | OAuth callback URL | `https://capitalcopilot.io/callback` | `http://localhost:4200/callback` |
| `clientId` | OAuth2 client ID | `YOUR_CLIENT_ID_HERE` | `abc123xyz456` |

### Demo Features

- ✅ OAuth2 Authorization Code Flow
- ✅ Automatic endpoint derivation from API URL
- ✅ Token storage in localStorage
- ✅ GraphQL query testing
- ✅ Environment auto-detection (dev/prod)

### How Demo Works

1. **Configuration Display**
   - Shows current API URL, redirect URI, and client ID
   - Logs configuration to browser console

2. **Endpoint Derivation**
   ```javascript
   CONFIG.authorizationEndpoint = `${CONFIG.apiUrl}/o/authorize/`;
   CONFIG.tokenEndpoint = `${CONFIG.apiUrl}/o/token/`;
   CONFIG.graphqlEndpoint = `${CONFIG.apiUrl}/graphql/`;
   ```

3. **Automatic Environment Detection**
   ```javascript
   const isLocalhost = window.location.hostname === 'localhost' 
                    || window.location.hostname === '127.0.0.1';
   const defaultRedirectUri = isLocalhost 
     ? 'http://localhost:4200/callback'
     : 'https://capitalcopilot.io/callback';
   ```

## Troubleshooting

### Error: "Mismatching redirect URI"

**Cause:** The redirect URI sent by frontend doesn't match any URI registered in the backend OAuth application.

**Solution:**
1. Check backend redirect URIs:
   ```python
   app = Application.objects.get(client_id='YOUR_CLIENT_ID')
   print(app.redirect_uris)
   ```

2. Ensure exact match (check protocol, host, port, path):
   ```
   ❌ http://localhost:4200/callback/  (trailing slash)
   ✅ http://localhost:4200/callback
   
   ❌ https://localhost:4200/callback  (wrong protocol)
   ✅ http://localhost:4200/callback
   
   ❌ http://localhost:3000/callback   (wrong port)
   ✅ http://localhost:4200/callback
   ```

3. Update backend if needed (see [Step 2](#step-2-configure-redirect-uris))

### Error: "invalid_client"

**Cause:** Client ID doesn't match or OAuth application doesn't exist.

**Solution:**
1. Verify client ID:
   ```python
   app = Application.objects.get(client_id='YOUR_CLIENT_ID')
   print(f"Client ID: {app.client_id}")
   ```

2. Update frontend environment file with correct client ID

### Error: "Authorization code has expired"

**Cause:** OAuth authorization codes expire after ~60 seconds.

**Solution:**
- Start the OAuth flow again (don't reuse old codes)
- Check for delays in code exchange process
- Ensure callback handler processes code immediately

### Error: "invalid_grant"

**Cause:** Authorization code already used or invalid.

**Solution:**
- Each authorization code can only be used once
- Generate a new code by restarting OAuth flow
- Check that redirect URI matches during code exchange

## Testing OAuth Flow

### Test 1: Development Environment

```bash
# 1. Start backend
cd capital-copilot-be
python manage.py runserver

# 2. Start frontend
cd capital-copilot-fe
yarn start

# 3. Navigate to demo
open http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&clientId=YOUR_CLIENT_ID

# 4. Click "Login with OAuth2"
# 5. Authorize on backend
# 6. Verify successful token exchange
```

### Test 2: Verify Token Storage

After successful OAuth flow, check browser console:

```javascript
// Check stored tokens
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));
```

### Test 3: GraphQL API Calls

Once authenticated, test GraphQL queries in demo:

```graphql
query {
  me {
    id
    username
    email
  }
}
```

## Security Best Practices

1. **Use HTTPS in Production**
   - Always use `https://` redirect URIs in production
   - Never transmit tokens over unencrypted HTTP

2. **Client ID is Public**
   - OAuth2 public clients don't use client secrets
   - Client ID can be safely exposed in frontend code

3. **Token Storage**
   - Store access tokens in memory or localStorage (not cookies for SPA)
   - Clear tokens on logout
   - Implement token refresh before expiration

4. **CORS Configuration**
   - Ensure backend allows frontend origin
   - Configure proper CORS headers for `/o/authorize/`, `/o/token/`, `/graphql/`

## Related Documentation

- [OAUTH_GRAPHQL_DOCS_QUICKREF.md](./OAUTH_GRAPHQL_DOCS_QUICKREF.md) - OAuth + GraphQL integration patterns
- [../architecture/APOLLO_ANGULAR.md](../architecture/APOLLO_ANGULAR.md) - Apollo Client configuration

## License

Copyright © 2025 Perpetuator LLC. All rights reserved.

