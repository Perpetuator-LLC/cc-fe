[//]: # (Copyright © 2026 Perpetuator LLC)

# Asset Optimization

This document covers optimization techniques for frontend assets like images, SVGs, and other static files.

---

## SVG Compression

### Using SVGO

[SVGO](https://github.com/svg/svgo) is a Node.js tool for optimizing SVG files.

#### One-time Compression

```bash
# Compress a single SVG file
npx svgo public/logo.outline_loading.svg -o public/logo.loading.min.svg

# Compress in-place (overwrites original)
npx svgo public/logo.outline_loading.svg
```

#### Batch Compression

```bash
# Compress all SVGs in a directory
npx svgo -f public/ -o public/optimized/

# Compress all SVGs in-place
npx svgo -f public/
```

#### Configuration

Create `svgo.config.js` in project root for custom settings:

```javascript
module.exports = {
  plugins: [
    'preset-default',
    'removeDimensions',
    {
      name: 'removeAttrs',
      params: {
        attrs: '(fill|stroke)'
      }
    }
  ]
};
```

### Loading SVG Files

#### Animated Loading SVG

The loading spinner SVG (`public/logo.outline_loading.svg`) is used during app initialization. The minified version should be used in production:

```html
<!-- In index.html for initial app loading -->
<img src="logo.outline_loading.min.svg" alt="Loading..." />
```

---

## Image Optimization

### Recommended Formats

| Use Case | Format | Notes |
|----------|--------|-------|
| Photos | WebP or AVIF | Use `<picture>` with JPEG fallback |
| Icons | SVG | Scalable, small file size |
| Logos | SVG | Scalable, can be styled with CSS |
| Screenshots | PNG or WebP | Lossless when needed |

### Angular CLI Image Optimization

Angular 17+ includes built-in image optimization with `NgOptimizedImage`:

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  template: `<img ngSrc="logo.svg" width="200" height="100" />`
})
```

---

## Lazy Loading

### Route-based Lazy Loading

Components are lazy-loaded via Angular router by default:

```typescript
{ path: 'feature', loadComponent: () => import('./feature/feature.component') }
```

### Image Lazy Loading

Use native lazy loading for below-the-fold images:

```html
<img src="large-image.webp" loading="lazy" alt="Description" />
```

---

## Bundle Analysis

### Check Bundle Size

```bash
# Build with stats
yarn build --stats-json

# Analyze with webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/capital-copilot-fe/stats.json
```

### CSS Size Tracking

```bash
# Run CSS size analysis script
node scripts/analyze-css-size.js
```

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - General development guide
- [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) - Quick start guide

