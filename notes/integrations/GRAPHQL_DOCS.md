# GraphQL Documentation Generation

> **Note:** This guide covers automatic GraphQL API documentation generation using SpectaQL.

## Overview

This project uses [SpectaQL](https://github.com/anvilco/spectaql) to automatically generate beautiful, interactive GraphQL API documentation from the GraphQL schema.

## Quick Start

```bash
# Generate documentation manually
yarn docs:graphql

# Build project (auto-generates docs)
yarn build
```

## How It Works

### Generation Process

Documentation is automatically generated on every build via the `prebuild` npm script:

```json
{
  "scripts": {
    "prebuild": "yarn docs:graphql",
    "build": "ng build",
    "docs:graphql": "spectaql spectaql-config.yml"
  }
}
```

### Serving the Documentation

The generated HTML documentation is served by Angular as static assets:

- **Development**: `http://localhost:4200/docs/graphql/index.html`
- **Production**: `https://capitalcopilot.io/docs/graphql/index.html`

**Important:** The documentation is a standalone HTML file, **not** an Angular component. Access it directly via URL.

## Configuration

### Main Config File

**File:** `spectaql-config.yml` (project root)

```yaml
spectaql:
  # Source schema file
  schemaFile: src/app/schema.graphql
  
  # Output directory
  targetDir: docs/graphql
  
  # Theme and styling
  logoFile: public/Capital_Copilot_Logo_PFP.svg
  faviconFile: public/Capital_Copilot_Logo_PFP.png

introspection:
  # Don't use introspection, use schema file
  spectaqlDirective:
    enable: false

info:
  title: Capital Copilot API
  description: |
    GraphQL API for Capital Copilot
  
  contact:
    name: API Support
    email: support@capitalcopilot.io

servers:
  - url: https://api.capitalcopilot.io/graphql/
    description: Production API
    production: true
  
  - url: http://127.0.0.1:8000/graphql/
    description: Development API
```

### Schema File

**File:** `src/app/schema.graphql`

This is the GraphQL schema file exported from your backend. To update it:

```bash
# On backend
cd capital-copilot-be
python manage.py graphql_schema --schema api.schema.schema --out ../capital-copilot-fe/src/app/schema.graphql
```

## Angular Integration

### Assets Configuration

**File:** `angular.json`

```json
{
  "projects": {
    "capital-copilot-fe": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              {
                "glob": "**/*",
                "input": "docs/graphql",
                "output": "/docs/graphql"
              }
            ]
          }
        }
      }
    }
  }
}
```

This copies the generated docs to the Angular build output.

### Accessing Documentation

The documentation is served as a static HTML file, **not** through Angular routing:

```
✅ Direct static access: /docs/graphql/index.html
❌ NOT an Angular route: No route definition needed
```

**Why this approach?**
- ✅ No nginx config needed
- ✅ Works during `ng serve`
- ✅ Better performance (static file)
- ✅ SEO friendly
- ✅ Single deployment

## Linking to Documentation

### In Angular Components

```typescript
// Navigate to docs (same tab)
window.location.href = '/docs/graphql/index.html';

// Open in new tab
window.open('/docs/graphql/index.html', '_blank');
```

### In Templates

```html
<!-- Direct link -->
<a href="/docs/graphql/index.html">API Documentation</a>

<!-- Open in new tab -->
<a href="/docs/graphql/index.html" target="_blank">
  <mat-icon>api</mat-icon>
  API Docs
</a>
```

### In Navigation Menu

```typescript
// app.routes.ts or navigation config
{
  label: 'API Docs',
  icon: 'api',
  link: '/docs/graphql/index.html',
  external: true // Indicates external/static link
}
```

## Deployment

### CI/CD Integration

The documentation is automatically generated during build:

```yaml
# .github/workflows/deploy.yml
steps:
  - name: Install dependencies
    run: yarn install
  
  - name: Build application
    run: yarn build  # Runs prebuild -> docs:graphql
  
  - name: Deploy
    run: |
      # dist/ includes docs/graphql/
      deploy dist/capital-copilot-fe/browser/
```

### Build Output

```
dist/
  capital-copilot-fe/
    browser/
      docs/
        graphql/
          index.html          # Main documentation page
          stylesheets/        # CSS styles
          javascripts/        # Interactive features
          images/             # Logo and assets
```

## Version Control

### .gitignore

The generated docs are **NOT** committed to git:

```gitignore
# Generated GraphQL documentation
docs/graphql/
```

**Why?**
- Generated files are large
- Prevents merge conflicts
- Reduces repository size
- Documentation regenerated from schema on each build

### Committed Files

Only source files are committed:
- ✅ `spectaql-config.yml` - Configuration
- ✅ `src/app/schema.graphql` - Schema source
- ❌ `docs/graphql/**` - Generated output (ignored)

## Customization

### Update API Information

Edit `spectaql-config.yml`:

```yaml
info:
  title: Your API Title
  description: |
    Multi-line
    API description
  
  contact:
    name: Support Team
    email: support@example.com
  
  license:
    name: Proprietary
    url: https://example.com/license
```

### Update Server URLs

```yaml
servers:
  - url: https://api.example.com/graphql/
    description: Production API
    production: true
    
  - url: https://staging-api.example.com/graphql/
    description: Staging API
    
  - url: http://127.0.0.1:8000/graphql/
    description: Local Development
```

### Custom Styling

```yaml
spectaql:
  themeDir: ./custom-theme  # Optional custom theme directory
  logoFile: ./path/to/logo.svg
  faviconFile: ./path/to/favicon.png
```

### Add Examples to Schema

Include example queries in your schema documentation:

```graphql
"""
Get a list of podcasts.

Example:
```graphql
query {
  podcasts(first: 10) {
    edges {
      node {
        id
        title
        description
      }
    }
  }
}
```
"""
type Query {
  podcasts(first: Int): PodcastConnection
}
```

## Updating Documentation

### When Schema Changes

1. **Export new schema from backend:**
   ```bash
   cd capital-copilot-be
   python manage.py graphql_schema --schema api.schema.schema \
     --out ../capital-copilot-fe/src/app/schema.graphql
   ```

2. **Regenerate docs:**
   ```bash
   cd capital-copilot-fe
   yarn docs:graphql
   ```

3. **Verify changes:**
   ```bash
   yarn start
   open http://localhost:4200/docs/graphql/index.html
   ```

### When Config Changes

After editing `spectaql-config.yml`:

```bash
yarn docs:graphql
```

## Troubleshooting

### Documentation Not Showing After Build

1. **Check prebuild script ran:**
   ```bash
   yarn docs:graphql
   ```

2. **Verify files exist:**
   ```bash
   ls -la docs/graphql/
   # Should show: index.html, stylesheets/, javascripts/, images/
   ```

3. **Check Angular assets config:**
   ```bash
   cat angular.json | grep -A 10 "docs/graphql"
   ```

### Schema Not Updating

1. **Ensure schema file is current:**
   ```bash
   cat src/app/schema.graphql | head -20
   ```

2. **Re-export from backend:**
   ```bash
   cd capital-copilot-be
   python manage.py graphql_schema --schema api.schema.schema \
     --out ../capital-copilot-fe/src/app/schema.graphql
   ```

3. **Manually regenerate:**
   ```bash
   yarn docs:graphql
   ```

### 404 Error on /docs/graphql

1. **Check build output:**
   ```bash
   ls -la dist/capital-copilot-fe/browser/docs/graphql/
   ```

2. **Verify assets copied:**
   ```bash
   yarn build
   # Check for: "Copying assets..." in output
   ```

3. **Clear browser cache**

### SpectaQL Command Not Found

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Verify spectaql is installed:**
   ```bash
   yarn spectaql --version
   ```

## Best Practices

### 1. Keep Schema Up to Date

```bash
# Add to your development workflow
cd capital-copilot-be && python manage.py graphql_schema \
  --schema api.schema.schema \
  --out ../capital-copilot-fe/src/app/schema.graphql
```

### 2. Document Your Schema

Add rich descriptions to your GraphQL schema:

```graphql
"""
User account information.

This type represents a registered user in the system.
Includes authentication details and profile information.
"""
type User {
  """Unique identifier for the user"""
  id: ID!
  
  """User's email address (unique)"""
  email: String!
  
  """Display name"""
  username: String!
}
```

### 3. Include Examples

Provide query examples in type descriptions:

```graphql
"""
Query podcasts with pagination.

Example - Get first 10 podcasts:
```graphql
query {
  podcasts(first: 10) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

Example - Get podcasts after cursor:
```graphql
query {
  podcasts(first: 10, after: "cursor123") {
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
```

### 4. Regenerate Before Deployment

Ensure docs are fresh:

```bash
# In CI/CD pipeline
yarn install
yarn docs:graphql  # Explicit regeneration
yarn build         # Also runs prebuild
```

## Resources

- [SpectaQL GitHub](https://github.com/anvilco/spectaql)
- [GraphQL Schema Best Practices](https://graphql.org/learn/schema/)
- [Angular Assets Configuration](https://angular.io/guide/workspace-config#assets-configuration)

## Related Documentation

- [OAUTH_SETUP.md](./OAUTH_SETUP.md) - OAuth2 configuration
- [OAUTH_GRAPHQL_DOCS_QUICKREF.md](./OAUTH_GRAPHQL_DOCS_QUICKREF.md) - OAuth + GraphQL integration
- [../architecture/APOLLO_ANGULAR.md](../architecture/APOLLO_ANGULAR.md) - Apollo Client setup

## License

Copyright © 2025 Perpetuator LLC. All rights reserved.

