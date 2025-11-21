# Quick Reference - OAuth2 & GraphQL Docs

## OAuth2 Authentication

### Login (Password Grant)
```typescript
// The service handles this automatically
this.authService.loginWithPassword(email, password).subscribe({
  next: (success) => console.log('Logged in!'),
  error: (error) => console.error(error.message)
});
```

### Get Access Token
```typescript
const token = this.authService.getAccessToken();
// Returns: "abc123..." or null
```

### Check Authentication
```typescript
if (this.authService.isAuthenticated()) {
  // User is logged in
}
```

### Logout
```typescript
this.authService.logout();
// Clears tokens and redirects to home
```

### Token Storage
```
localStorage:
  - access_token: "abc123..."
  - refresh_token: "xyz789..."
  - expires_at: "1700000000000"
  - token_type: "Bearer"
  - scope: "read write"
```

### Automatic Token Refresh
No action needed - happens automatically when access token expires!

---

## GraphQL Documentation

### Generate Docs
```bash
yarn docs:graphql
```

### Access Docs
- **Development**: http://localhost:4200/docs/graphql/index.html
- **Production**: https://your-domain.com/docs/graphql/index.html

### Link to Docs
```html
<!-- Direct link to static HTML -->
<a href="/docs/graphql/index.html">API Documentation</a>

<!-- Open in new tab -->
<a href="/docs/graphql/index.html" target="_blank">API Docs</a>
```

---

## Static HTML Files

### Demo Page (OAuth2 Demo)
- **Development**: http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&redirectUri=http://localhost:3000/callback&clientId=YOUR_ID
- **Production**: https://capitalcopilot.io/demo.html?clientId=YOUR_ID

**Query Parameters:**
- `apiUrl` - API base URL (default: https://api.capitalcopilot.io)
- `redirectUri` - OAuth callback URL (default: https://capitalcopilot.io/callback)
- `clientId` - Your OAuth2 client ID (required)

### Adding Static Files
```bash
# Just place files in public/ directory
cp myfile.html public/myfile.html

# Automatically served at
http://localhost:4200/myfile.html
```

**Note**: All files in `public/` are automatically served as static assets. No configuration needed!

### Build with Docs
```bash
yarn build
# Automatically runs: yarn docs:graphql (via prebuild hook)
```

### Update Schema
1. Edit `src/app/schema.graphql`
2. Run `yarn docs:graphql` (or just build)
3. Docs automatically updated!

### Configure Docs
Edit `spectaql-config.yml` in project root

---

## Environment Variables

### Required OAuth2 Config
```typescript
// environment.ts
export const environment = {
  OAUTH_ISSUER: 'http://127.0.0.1:8000',
  OAUTH_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
  OAUTH_SCOPES: 'read write ai:generate ai:analyze',
  SITE_URL: 'http://localhost:4200',
  production: false
};
```

### Get Client ID from Backend
```bash
# On backend server
python manage.py shell

from oauth2_provider.models import Application
app = Application.objects.get(name='Capital Copilot Frontend')
print(app.client_id)
```

---

## Common Tasks

### Test Login Flow
```bash
1. yarn start
2. Navigate to http://localhost:4200/login
3. Enter credentials
4. Check localStorage for tokens
5. Should redirect to dashboard
```

### Test Token Refresh
```javascript
// Browser console
localStorage.setItem('expires_at', (Date.now() - 1000).toString());
// Navigate to any page - should auto-refresh token
```

### Deploy to Production
```bash
# CI/CD will run:
yarn install         # Installs spectaql (now in dependencies)
yarn build          # Runs prebuild -> docs:graphql
# Deploy dist/capital-copilot-fe/browser/
```

### Check Documentation
```bash
# Verify docs exist
ls -la docs/graphql/

# Verify docs in build
ls -la dist/capital-copilot-fe/browser/docs/graphql/

# View size
du -sh docs/graphql/
```

---

## Error Messages

### Login Errors
- **Invalid email or password** → Wrong credentials
- **Email not verified** → Check inbox, resend verification
- **Unable to connect** → Network issue, check internet

### Build Errors
- **spectaql not found** → Run `yarn install`
- **schema.graphql missing** → Check file exists
- **docs not in dist/** → Check angular.json assets

---

## File Locations

### OAuth2
- Service: `src/app/core/services/auth.service.ts`
- Interceptor: `src/app/core/interceptors/auth.interceptor.ts`
- Login Component: `src/app/login/login.component.ts`
- Environment: `src/environments/environment.ts`

### GraphQL Docs
- Config: `spectaql-config.yml` (root)
- Schema: `src/app/schema.graphql`
- Generated: `docs/graphql/` (gitignored)
- Redirect: `src/app/graphql-docs-redirect/`
- README: `docs/README.md`

---

## Scripts

```bash
# Start development server
yarn start

# Build for production
yarn build

# Generate GraphQL docs only
yarn docs:graphql

# Run tests
yarn test

# Lint code
yarn lint
```

---

## Dependencies

### Production
```json
{
  "angular-oauth2-oidc": "^20.0.2",
  "spectaql": "^3.0.5"
}
```

### Why spectaql in production?
Needed at build time in CI/CD environments.

---

## Security Checklist

- ✅ Tokens in localStorage (standard practice)
- ✅ HTTPS required in production
- ✅ Short access token lifetime (1 hour)
- ✅ Refresh token rotation (backend)
- ✅ Bearer tokens in Authorization header
- ✅ OAuth2 endpoints excluded from auth interceptor
- ✅ Input validation on backend
- ✅ Content Security Policy headers

---

## Support

### Documentation
- OAuth2: `logs/ai_edits/2025-11-20_oauth2_and_graphql_docs_complete_integration.md`
- GraphQL Docs: `docs/README.md`

### Troubleshooting
See full documentation for detailed troubleshooting steps.

---

## Quick Debug

### Check Auth Status
```javascript
// Browser console
console.log('Authenticated:', this.authService.isAuthenticated());
console.log('Token:', localStorage.getItem('access_token'));
console.log('Expires:', new Date(parseInt(localStorage.getItem('expires_at'))));
```

### Check Docs Generation
```bash
# Should output lots of files
yarn docs:graphql
ls -la docs/graphql/

# Should show ~1.8MB file
ls -lh docs/graphql/index.html
```

### Check Build Output
```bash
yarn build
find dist -name "*.html" -path "*graphql*"
# Should show: dist/capital-copilot-fe/browser/docs/graphql/index.html
```

---

**Everything is ready! 🚀**

