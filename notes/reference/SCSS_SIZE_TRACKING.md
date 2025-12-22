# CSS/SCSS Size Tracking Guide

## Overview

This project tracks both **source SCSS** and **compiled CSS** sizes to monitor bundle optimization.

## Quick Reference

| What | Command | Log Directory |
|------|---------|---------------|
| Track source SCSS sizes | `yarn scss:track` | `logs/scss-sizes/` |
| Track compiled CSS sizes | `yarn css:dev` | `logs/css-size-reports/` |
| Check unused SCSS | `yarn lint:scss:unused` | - |
| Full lint with size check | `yarn lint:all` | - |

## Budget Limits

Defined in `angular.json`:

| Budget Type | Warning | Error |
|-------------|---------|-------|
| Initial bundle | 2 MB | 2.5 MB |
| Component styles | 12 kB | 24 kB |

### Current Large Components (as of 2025-12-21)

These files exceed the 12kB warning limit:

| Component | Compiled Size |
|-----------|---------------|
| episode-detail | 23.5 kB |
| podcast-detail | 19.3 kB |
| news-list | 17.7 kB |
| affiliate-dashboard | 17.2 kB |
| post-login-layout | 14.5 kB |
| affiliate-admin | 12.2 kB |
| jobs-list | 12.1 kB |

## Are These Limits Reasonable?

**Yes.** For a production Angular Material app:

- **12-15kB warning** is appropriate for individual components
- **24-30kB error** is a reasonable upper bound
- Components over 20kB should be considered for refactoring

### Why Large Component Styles Aren't Always Bad

Angular's build process bundles all component CSS. Creating more components doesn't reduce total bundle size - it just distributes styles across files.

**What actually reduces bundle size:**
1. Removing unused classes (we removed 110 in this cleanup)
2. Using shared mixins instead of duplicating styles  
3. Leveraging Material's built-in variants
4. Following the MD3 design token system

## Tracking Logs

### Source SCSS: `logs/scss-sizes/`

Tracks raw SCSS file sizes before compilation.

```bash
yarn scss:track
```

See: [logs/scss-sizes/README.md](../../logs/scss-sizes/README.md)

### Compiled CSS: `logs/css-size-reports/`

Tracks final compiled CSS bundle sizes.

```bash
yarn css:dev
```

See: [logs/css-size-reports/README.md](../../logs/css-size-reports/README.md)

## CI/CD Integration

Bundle sizes are tracked via:

1. **Angular budgets** - Warns/fails at build time
2. **GitHub Actions** - Size diffs in PR comments (if configured)

### External Services

Consider these GitHub-native/external options for historical tracking:

| Service | Features |
|---------|----------|
| **Bundlewatch** | GitHub Action, tracks sizes across commits |
| **Size Limit** | GitHub Action, performance budgets |
| **Codecov (Bundle Analysis)** | Historical charts, PR comments |
| **RelativeCI** | Bundle analysis, GitHub integration |

## Related Documentation

- [MD3 Comprehensive Theme Guide](./MD3_COMPREHENSIVE_THEME_GUIDE.md)
- [SCSS Linting Guide](./MD3_LINTING_GUIDE.md)

