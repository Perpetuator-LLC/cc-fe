# SSR (Server-Side Rendering) Configuration

**Last Updated:** 2026-01-28

---

## Overview

This project uses Angular SSR for production builds to improve SEO and initial page load performance. However, SSR is **disabled for development** to enable proper hot module replacement (HMR) and faster rebuild times.

---

## Configuration Summary

| Environment | SSR Enabled | Output Mode | WebSocket | Command |
|-------------|-------------|-------------|-----------|---------|
| Development | ❌ No | `static` | ✅ Browser | `yarn start` |
| Production | ✅ Yes | `server` | ✅ Browser only | `yarn build` |
| SSR Testing | ✅ Yes | `server` | ✅ Browser only | `yarn start:ssr` |

---

## GraphQL Transport by Environment

The app uses different GraphQL transports based on the execution context:

| Context | Transport | Subscriptions | Notes |
|---------|-----------|---------------|-------|
| Browser (any mode) | HTTP + WebSocket | ✅ Supported | Full real-time support |
| Server (SSR render) | HTTP only | ❌ Not supported | No WebSocket on Node.js SSR |
| Social Media Crawlers | HTTP only | N/A | Server-rendered HTML only |

### Why WebSocket is Disabled on Server

Node.js's internal WebSocket implementation conflicts with Zone.js (Angular's change detection). The `graphql.provider.ts` checks `isPlatformBrowser()` and only creates WebSocket connections in the browser:

```typescript
if (isBrowser) {
  // Browser: Use WebSocket for subscriptions
  const wsLink = new GraphQLWsLink(wsClient);
  finalLink = split(...);
} else {
  // Server (SSR): HTTP only - no WebSocket
  finalLink = httpLink;
}
```

This means:
- **Initial SSR render:** Uses HTTP for data fetching
- **After hydration:** Browser takes over with full WebSocket support
- **Social cards/SEO:** Work perfectly (server-rendered HTML)

---

## How It Works

### angular.json Configuration

The SSR configuration is split between the base options and environment-specific configurations:

```json
// Base options (applies to production by default)
"options": {
  "outputMode": "server",
  "ssr": {
    "entry": "src/server.ts"
  }
}

// Development configuration (overrides base)
"development": {
  "outputMode": "static",
  "ssr": false
}
```

### Why SSR is Disabled for Development

Angular's dev server has known issues with hot module replacement (HMR) when `outputMode: "server"` is configured:

1. **Slow rebuilds** - SSR requires building both browser and server bundles
2. **HMR issues** - Hot reload doesn't work reliably with SSR enabled
3. **Longer startup** - Initial dev server startup takes significantly longer

By setting `outputMode: "static"` for development, the dev server works in traditional SPA mode with full hot reload support.

---

## Testing SSR Locally

### Option 1: Use the SSR Test Script

```bash
yarn start:ssr
```

This runs `ng serve --configuration production` which enables SSR.

**Note:** Hot reload will be slower/unreliable in this mode.

### Option 2: Build and Serve Production SSR

For more accurate production testing:

```bash
# Build with SSR
yarn build

# Serve the SSR build
yarn serve:ssr:capital-copilot-fe
```

This runs the actual Node.js SSR server at `http://localhost:4000` (or configured port).

### Option 3: Temporarily Enable SSR in Development

If you need SSR with development settings (source maps, no optimization):

1. Edit `angular.json`
2. In the `development` configuration, change:
   ```json
   "development": {
     "optimization": false,
     "extractLicenses": false,
     "sourceMap": true,
     "namedChunks": true,
     "outputMode": "server",  // Changed from "static"
     "ssr": {
       "entry": "src/server.ts"  // Changed from false
     }
   }
   ```
3. Run `yarn start`
4. **Remember to revert** before committing!

---

## SSR Files

| File | Purpose |
|------|---------|
| `src/main.server.ts` | Server-side Angular bootstrap |
| `src/server.ts` | Express.js server entry point |
| `src/app/app.config.server.ts` | Server-specific Angular providers |
| `src/app/graphql.provider.ts` | GraphQL transport (HTTP/WS based on platform) |

---

## Verifying Each Flow

### 1. Development Hot Reload

```bash
yarn start
# Make a change to any .ts or .html file
# Browser should auto-refresh within 1-2 seconds
```

✅ Expected: Fast rebuilds, automatic browser refresh

### 2. Social Media Cards (SEO/Open Graph)

```bash
# Build with SSR
yarn build

# Serve locally
yarn serve:ssr:capital-copilot-fe

# Test with curl to see server-rendered HTML
curl -s http://localhost:4000/ | grep -E "<title>|og:title"
```

✅ Expected: HTML contains meta tags for social sharing

### 3. Production SSR Flow

```bash
# Build
yarn build

# Serve
yarn serve:ssr:capital-copilot-fe

# Visit http://localhost:4000 in browser
# View page source - should see rendered HTML
# Check DevTools Network tab - subsequent navigation uses client-side routing
```

✅ Expected:
- Initial page load has server-rendered HTML (view source shows content)
- After hydration, navigation is client-side (fast, no full page reload)
- WebSocket connects after hydration for real-time features

### 4. GraphQL Subscriptions (Real-time)

```bash
# In development mode
yarn start

# Open DevTools > Network > WS tab
# Navigate to a page with real-time data (e.g., jobs list)
```

✅ Expected: WebSocket connection to `/ws/graphql/` appears and stays connected

---

## Common Issues

### Hot Reload Not Working

**Symptom:** Changes to files don't trigger browser refresh or updates.

**Solution:** Make sure you're using `yarn start` (development mode) which has SSR disabled.

### WebSocket TypeError During SSR

**Symptom:**
```
TypeError [ERR_INVALID_ARG_TYPE]: The "event" argument must be an instance of Event.
Received an instance of Event
    at WebSocket.dispatchEvent (node:internal/event_target:773:13)
```

**Cause:** WebSocket was being initialized on the server. Node.js's WebSocket has a different `Event` class than browsers, and Zone.js intercepts cause type mismatches.

**Solution:** Already fixed in `graphql.provider.ts` - WebSocket is only created when `isPlatformBrowser()` is true.

### "The 'prerender' option is not considered when 'outputMode' is specified"

**Explanation:** This is a warning, not an error. When `outputMode: "server"` is set, prerendering is handled differently. The warning can be ignored.

### SSR Build Errors

If SSR builds fail, common causes include:
- Browser-only APIs used at module level (wrap in `isPlatformBrowser()` check)
- Missing server-side polyfills
- Import of client-only libraries in server code

---

## Related Documentation

- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Angular Universal (legacy)](https://angular.io/guide/universal)
