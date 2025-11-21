# Demo App

```
http://localhost:4200/demo.html
```

# GraphQL Documentation Setup

## Overview

This project uses [SpectaQL](https://github.com/anvilco/spectaql) to automatically generate beautiful, interactive GraphQL API documentation from the GraphQL schema.

## How It Works

### 1. Generation Process

The documentation is automatically generated on every build:

```bash
# Manually generate docs
yarn docs:graphql

# Automatically generated before build
yarn build  # runs prebuild hook which generates docs
```

### 2. Serving the Documentation

The generated HTML documentation is served by Angular as static assets:

- **Direct URL**: `/docs/graphql/index.html`
- **Development**: Available at `http://localhost:4200/docs/graphql/index.html`
- **Production**: Available at `https://your-domain.com/docs/graphql/index.html`

**Note**: The documentation is a standalone HTML file, not an Angular component. Access it directly via the URL above.

### 3. Configuration

**File**: `spectaql-config.yml` (project root)

Key settings:
- **Source**: `src/app/schema.graphql` - Your GraphQL schema file
- **Output**: `docs/graphql/` - Generated documentation directory
- **Logo**: Uses Capital Copilot logo from `public/`
- **Servers**: Configured for both development and production APIs

## Making Changes

### Update API Information

Edit `spectaql-config.yml`:

```yaml
info:
  title: Capital Copilot API
  description: |
    Your API description here...
  contact:
    name: API Support
    email: api@capitalcopilot.io
```

### Update Server URLs

```yaml
servers:
  - url: https://api.capitalcopilot.io/graphql/
    description: Production API
    production: true
```

### Regenerate Documentation

After making changes to:
- `src/app/schema.graphql`
- `spectaql-config.yml`

Run:
```bash
yarn docs:graphql
```

## Deployment

### CI/CD Integration

The documentation is automatically generated during the build process:

```yaml
# Example CI/CD config
- run: yarn install
- run: yarn build  # This runs prebuild -> docs:graphql
- run: deploy dist/
```

### What Gets Deployed

The `dist/` folder includes:
```
dist/
  capital-copilot-fe/
    browser/
      docs/
        graphql/
          index.html       # Main docs page
          stylesheets/     # Styles
          javascripts/     # Interactive features
          images/          # Assets
```

## Version Control

### Ignored Files

The generated docs are NOT committed to git:
- `docs/graphql/` is in `.gitignore`
- Only source files are committed:
  - `spectaql-config.yml`
  - `src/app/schema.graphql`

### Why?

- Generated files are large and change frequently
- Prevents merge conflicts
- Reduces repository size
- Documentation is always fresh from the latest schema

## Architecture

### Angular Integration

**angular.json** assets configuration:
```json
"assets": [
  {
    "glob": "**/*",
    "input": "docs/graphql",
    "output": "/docs/graphql"
  }
]
```

This copies the generated docs to the Angular build output.

### Direct Static Access

The documentation is served as a static HTML file, **not** through Angular routing. This means:

1. ✅ **No Angular route needed**: Access directly via `/docs/graphql/index.html`
2. ✅ **Works immediately**: No component loading or redirect
3. ✅ **Better performance**: Static file served directly by the web server
4. ✅ **SEO friendly**: Search engines can index the documentation

### Why This Approach?

1. **No nginx config needed**: Angular serves everything
2. **Works in development**: Available during `ng serve`
3. **Single deployment**: Docs bundled with app
4. **Always in sync**: Regenerated on every build

## Linking to Documentation

### In Angular Components

```typescript
// Navigate to docs via window.location (opens in same tab)
window.location.href = '/docs/graphql/index.html';

// Or open in new tab
window.open('/docs/graphql/index.html', '_blank');
```

### In Templates

```html
<!-- Direct link to static HTML -->
<a href="/docs/graphql/index.html">API Documentation</a>

<!-- Open in new tab -->
<a href="/docs/graphql/index.html" target="_blank">API Documentation</a>
```

### In Navigation Menu

Add to your navigation:
```typescript
{
  label: 'API Docs',
  icon: 'api',
  link: '/docs/graphql/index.html', // Direct link, not a route
  external: true
}
```

## Customization

### Styling

SpectaQL uses customizable themes. Edit `spectaql-config.yml`:

```yaml
spectaql:
  themeDir: ./custom-theme  # Optional custom theme
  logoFile: ./path/to/logo.png
```

### Examples

Add example queries in your schema:
```graphql
"""
Example:
```graphql
query {
  podcasts(first: 10) {
    edges {
      node {
        id
        title
      }
    }
  }
}
```
"""
type Query {
  podcasts: PodcastConnection
}
```

## Troubleshooting

### Docs not showing after build

1. Check that `prebuild` script ran:
   ```bash
   yarn docs:graphql
   ```

2. Verify files exist:
   ```bash
   ls -la docs/graphql/
   ```

3. Check Angular assets config in `angular.json`

### Schema not updating

1. Ensure schema file is correct:
   ```bash
   cat src/app/schema.graphql
   ```

2. Manually regenerate:
   ```bash
   yarn docs:graphql
   ```

### 404 on /docs/graphql

1. Check that route exists in `app.routes.ts`
2. Verify assets are copied to `dist/`
3. Clear browser cache

## Resources

- [SpectaQL Documentation](https://github.com/anvilco/spectaql)
- [GraphQL Schema Best Practices](https://graphql.org/learn/schema/)
- [Angular Assets Configuration](https://angular.io/guide/workspace-config#assets-configuration)

