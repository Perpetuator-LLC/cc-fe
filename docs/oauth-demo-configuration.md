# OAuth Demo Configuration - demo.html

## Overview

The `demo.html` file is a standalone OAuth2 demonstration page that can be configured via query parameters for different environments.

## License

This demo file is **freely available** for developers:
- ✅ Copy it
- ✅ Modify it
- ✅ Use it in your applications
- ✅ Distribute it with your projects
- ✅ No attribution required

## Configuration via Query Parameters

### Development Configuration

For local development, use these query parameters:

```
http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&redirectUri=http://localhost:3000/callback&clientId=YOUR_DEV_CLIENT_ID
```

**Parameters:**
- `apiUrl=http://127.0.0.1:8000` - Local backend API
- `redirectUri=http://localhost:3000/callback` - Local callback URL
- `clientId=YOUR_DEV_CLIENT_ID` - Your development OAuth2 client ID

### Production Configuration (Defaults)

For production, no query parameters needed - just use:

```
https://capitalcopilot.io/demo.html
```

**Default values:**
- `apiUrl=https://api.capitalcopilot.io` - Production API
- `redirectUri=https://capitalcopilot.io/callback` - Production callback
- `clientId=YOUR_CLIENT_ID_HERE` - Must be set via query param or hardcoded

## Query Parameters

### `apiUrl` (optional)
- **Description**: Base URL for the Capital Copilot API
- **Default**: `https://api.capitalcopilot.io`
- **Development**: `http://127.0.0.1:8000`
- **Example**: `?apiUrl=http://127.0.0.1:8000`

### `redirectUri` (optional)
- **Description**: OAuth2 callback URL after authentication
- **Default**: `https://capitalcopilot.io/callback`
- **Development**: `http://localhost:3000/callback`
- **Example**: `?redirectUri=http://localhost:3000/callback`

### `clientId` (optional)
- **Description**: OAuth2 client ID from your application registration
- **Default**: `YOUR_CLIENT_ID_HERE` (placeholder - must be set)
- **Example**: `?clientId=abc123xyz456`

## Usage Examples

### Example 1: Development Environment

```
http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&redirectUri=http://localhost:3000/callback&clientId=dev_client_123
```

### Example 2: Staging Environment

```
https://staging.capitalcopilot.io/demo.html?apiUrl=https://staging-api.capitalcopilot.io&redirectUri=https://staging.capitalcopilot.io/callback&clientId=staging_client_456
```

### Example 3: Production (Minimal)

```
https://capitalcopilot.io/demo.html?clientId=prod_client_789
```

### Example 4: Custom Integration

```
https://capitalcopilot.io/demo.html?apiUrl=https://custom.api.com&redirectUri=https://myapp.com/oauth/callback&clientId=custom_123
```

## How It Works

### Configuration Display

When the page loads, it displays the current configuration at the top:

```
Current Configuration:
  API URL: http://127.0.0.1:8000
  Redirect URI: http://localhost:3000/callback
  Client ID: dev_client_... (truncated)
```

### Endpoint Derivation

The demo automatically derives OAuth2 endpoints from the `apiUrl`:

```javascript
CONFIG.authorizationEndpoint = `${CONFIG.apiUrl}/o/authorize/`;
CONFIG.tokenEndpoint = `${CONFIG.apiUrl}/o/token/`;
CONFIG.graphqlEndpoint = `${CONFIG.apiUrl}/graphql/`;
```

### Console Logging

The configuration is logged to the browser console for debugging:

```javascript
console.log('OAuth Demo Configuration:', {
  apiUrl: CONFIG.apiUrl,
  redirectUri: CONFIG.redirectUri,
  clientId: CONFIG.clientId.substring(0, 10) + '...',
  endpoints: {
    authorization: CONFIG.authorizationEndpoint,
    token: CONFIG.tokenEndpoint,
    graphql: CONFIG.graphqlEndpoint
  }
});
```

## Setup Steps

### 1. Get OAuth2 Client ID

Register your application on the backend:

```bash
# On backend
python manage.py shell

from oauth2_provider.models import Application
app = Application.objects.create(
    name='Demo App',
    client_type=Application.CLIENT_PUBLIC,
    authorization_grant_type=Application.GRANT_AUTHORIZATION_CODE,
    redirect_uris='http://localhost:3000/callback\nhttps://capitalcopilot.io/callback'
)
print(f'Client ID: {app.client_id}')
```

### 2. Configure Callback URL

Make sure your callback URL is registered in the OAuth2 application's `redirect_uris`.

### 3. Access Demo

**Development:**
```
http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&redirectUri=http://localhost:3000/callback&clientId=YOUR_CLIENT_ID
```

**Production:**
```
https://capitalcopilot.io/demo.html?clientId=YOUR_CLIENT_ID
```

## Features

### OAuth2 Authorization Code Flow

1. User clicks "Login with OAuth2"
2. Redirected to Capital Copilot authorization page
3. User grants permission
4. Redirected back with authorization code
5. Demo exchanges code for access token
6. Access token stored in localStorage

### GraphQL Query Examples

Once authenticated, try these queries:

**Query 1: Get My Data**
```graphql
query {
  myData {
    id
    name
  }
}
```

**Query 2: AI Analysis**
```graphql
query {
  aiAnalysis(input: "Analyze market trends")
}
```

### Token Management

- ✅ Access token stored in localStorage
- ✅ Refresh token stored for renewal
- ✅ Expiration time tracked
- ✅ Logout clears all tokens

## Customization

### Modify for Your Needs

1. **Copy the file:**
   ```bash
   cp public/demo.html my-oauth-demo.html
   ```

2. **Edit configuration:**
   ```javascript
   const CONFIG = {
     clientId: 'your-hardcoded-client-id',  // Hardcode if needed
     redirectUri: 'https://myapp.com/callback',
     apiUrl: 'https://api.myapp.com',
   };
   ```

3. **Customize queries:**
   ```javascript
   if (queryType === 'myCustomQuery') {
     query = `query { myCustomQuery { ... } }`;
   }
   ```

4. **Add your branding:**
   ```html
   <h1>🚀 My App OAuth2 Demo</h1>
   ```

## Troubleshooting

### "Client ID not set" Warning

**Problem:** Configuration shows "Not set (add ?clientId=... to URL)"

**Solution:** Add `?clientId=YOUR_CLIENT_ID` to the URL

### Invalid Redirect URI Error

**Problem:** OAuth2 provider rejects redirect_uri

**Solution:** Ensure your redirect URI is registered in the OAuth2 application on the backend

### CORS Errors

**Problem:** Browser blocks requests to API

**Solution:** Ensure backend CORS settings allow your demo domain

### Token Exchange Fails

**Problem:** Code cannot be exchanged for token

**Solution:**
1. Check that client ID matches backend
2. Verify redirect URI matches exactly
3. Check network tab for error details

## Security Notes

### For Development
- ✅ Use localhost URLs
- ✅ Use development client IDs
- ✅ Don't commit client secrets (this demo uses public client type)

### For Production
- ✅ Use HTTPS for all URLs
- ✅ Register production redirect URIs only
- ✅ Use production client IDs
- ✅ Consider using PKCE extension for added security

## URL Examples Summary

```bash
# Development
http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&redirectUri=http://localhost:3000/callback&clientId=dev_id

# Staging
https://staging.capitalcopilot.io/demo.html?apiUrl=https://staging-api.capitalcopilot.io&redirectUri=https://staging.capitalcopilot.io/callback&clientId=staging_id

# Production
https://capitalcopilot.io/demo.html?clientId=prod_id

# Custom
https://capitalcopilot.io/demo.html?apiUrl=https://custom.com&redirectUri=https://custom.com/cb&clientId=custom_id
```

## Access

- **Development**: http://localhost:4200/demo.html
- **Production**: https://capitalcopilot.io/demo.html

**Remember:** Query parameters override defaults, so you can mix and match as needed!

