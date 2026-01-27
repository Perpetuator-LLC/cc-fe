# SSR (Server-Side Rendering) Configuration

**Last Updated:** 2026-01-26

---

## Overview

This project uses Angular SSR for production builds to improve SEO and initial page load performance. However, SSR is **disabled for development** to enable proper hot module replacement (HMR) and faster rebuild times.

---

## Configuration Summary

| Environment | SSR Enabled | Output Mode | Command |
|-------------|-------------|-------------|---------|
| Development | ❌ No | `static` | `yarn start` |
| Production | ✅ Yes | `server` | `yarn build` |
| SSR Testing | ✅ Yes | `server` | `yarn start:ssr` |

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

---

## Common Issues

### Hot Reload Not Working

**Symptom:** Changes to files don't trigger browser refresh or updates.

**Solution:** Make sure you're using `yarn start` (development mode) which has SSR disabled.

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
