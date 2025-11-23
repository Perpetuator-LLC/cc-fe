# Material Design 3 (MD3) Theming Guide for Capital Copilot
**Date:** 2025-11-09
**Status:** ✅ COMPLETE

## Overview

Angular Material now uses Material Design 3 (MD3) with a new CSS custom property-based theming system. This allows you to control component styling through CSS variables rather than Sass mixins.

## How MD3 Theming Works

### 1. Theme Definition (Sass)
Define your theme using `mat.define-theme()`:

```scss
$dark-theme: mat.define-theme((
  color: (
    theme-type: dark,
    primary: mat.$orange-palette,
    tertiary: mat.$violet-palette,
  ),
  typography: (
    brand-family: 'DM Sans',
    plain-family: 'DM Sans',
    bold-weight: 900,
    medium-weight: 700,
    regular-weight: 500,
  ),
  density: (
    scale: 0,
  ),
));
```

### 2. Apply Theme (Sass)
Apply the theme to generate CSS custom properties:

```scss
body.dark {
  @include mat.all-component-themes($dark-theme);
}
```

### 3. Override Component Tokens (CSS)
Override specific component styling via CSS custom properties:

```scss
body.dark {
  @include mat.all-component-themes($dark-theme);
  
  // Override button colors
  --mdc-text-button-label-text-color: #f14a00;
  --mdc-filled-button-container-color: #f14a00;
}
```

## Component Token System

### What are Component Tokens?

Material Design 3 uses **component tokens** - CSS custom properties that control specific aspects of each component. These follow a naming pattern:

```
--mdc-{component}-{element}-{property}
--mat-{component}-{property}
```

### Examples:

**Buttons:**
- `--mdc-text-button-label-text-color` - Text color for text buttons
- `--mdc-filled-button-container-color` - Background color for filled buttons
- `--mdc-filled-button-label-text-color` - Text color for filled buttons
- `--mdc-outlined-button-outline-color` - Border color for outlined buttons

**FAB (Floating Action Button):**
- `--mdc-fab-container-color` - Background color
- `--mdc-fab-icon-color` - Icon color

**Cards:**
- `--mdc-elevated-card-container-color` - Background color
- `--mat-card-subtitle-text-color` - Subtitle text color

## Current Implementation

### Theme Structure

We have two themes:
1. **Dark Theme** - Orange primary color (`#f14a00`)
2. **Light Theme** - Orange primary color (`#f14a00`)

### Custom Properties Defined

#### Legacy Custom Properties (for our own components)
```scss
--primary: #f14a00;
--theme-color: #ffffff;
--border-color: #ffffff1a;
--description-color: #b5b5b5;
--theme-white: #ffffff;
// ... etc
```

#### MD3 System Tokens
```scss
--md-sys-color-primary: #ff9800;
--md-sys-color-secondary: #ff9800;
--md-sys-color-tertiary: #9c27b0;
--md-sys-color-success: #4caf50;
--md-sys-color-warning: #ffeb3b;
--md-sys-color-error: #df4646;
```

#### MD3 Component Tokens (NEW)
```scss
// Buttons
--mdc-text-button-label-text-color: #f14a00;
--mdc-filled-button-container-color: #f14a00;
--mdc-filled-button-label-text-color: #ffffff;
--mdc-protected-button-container-color: #f14a00;
--mdc-protected-button-label-text-color: #ffffff;
--mdc-outlined-button-label-text-color: #f14a00;
--mdc-outlined-button-outline-color: #f14a00;

// FAB
--mdc-fab-container-color: #f14a00;
--mdc-fab-icon-color: #ffffff;

// Icons
--mat-icon-color: inherit;
```

## How Buttons Get Styled

### Material's Default Behavior

When you use a Material button:
```html
<button mat-button>Click me</button>
```

Material generates CSS like:
```css
mat-mdc-button:not(:disabled) {
  color: var(--mdc-text-button-label-text-color, var(--mat-app-primary));
}
```

This means:
1. **First choice:** Use `--mdc-text-button-label-text-color` if defined
2. **Fallback:** Use `--mat-app-primary` if the first isn't defined
3. **Last resort:** Browser default

### With Color Attribute

When you add `color="primary"`:
```html
<button mat-button color="primary">Click me</button>
```

Material applies the primary color from your theme automatically.

### Custom Override

By defining component tokens in your theme:
```scss
body.dark {
  --mdc-text-button-label-text-color: #f14a00;
}
```

You control the default styling without needing `color="primary"` on every button!

## Component Token Reference

### Button Tokens

**Text Buttons** (`mat-button`):
- `--mdc-text-button-label-text-color` - Text color
- `--mdc-text-button-disabled-label-text-color` - Disabled text color

**Filled Buttons** (`mat-raised-button`, `mat-flat-button`):
- `--mdc-filled-button-container-color` - Background color
- `--mdc-filled-button-label-text-color` - Text color
- `--mdc-filled-button-disabled-container-color` - Disabled background
- `--mdc-filled-button-disabled-label-text-color` - Disabled text

**Outlined Buttons** (`mat-stroked-button`):
- `--mdc-outlined-button-label-text-color` - Text color
- `--mdc-outlined-button-outline-color` - Border color
- `--mdc-outlined-button-disabled-label-text-color` - Disabled text
- `--mdc-outlined-button-disabled-outline-color` - Disabled border

**Icon Buttons** (`mat-icon-button`):
- `--mdc-icon-button-icon-color` - Icon color
- `--mdc-icon-button-disabled-icon-color` - Disabled icon color

**FAB Buttons** (`mat-fab`, `mat-mini-fab`):
- `--mdc-fab-container-color` - Background color
- `--mdc-fab-icon-color` - Icon color
- `--mdc-fab-small-container-color` - Small FAB background
- `--mdc-fab-small-icon-color` - Small FAB icon

### Other Common Component Tokens

**Cards:**
- `--mdc-elevated-card-container-color`
- `--mdc-outlined-card-container-color`
- `--mdc-outlined-card-outline-color`

**Form Fields:**
- `--mdc-filled-text-field-container-color`
- `--mdc-filled-text-field-label-text-color`
- `--mdc-filled-text-field-input-text-color`
- `--mdc-outlined-text-field-outline-color`

**Chips:**
- `--mdc-chip-elevated-container-color`
- `--mdc-chip-label-text-color`
- `--mdc-chip-outline-color`

**Dialogs:**
- `--mdc-dialog-container-color`
- `--mdc-dialog-subhead-color`
- `--mdc-dialog-supporting-text-color`

## Finding Component Tokens

### Method 1: Browser DevTools
1. Inspect the element
2. Look at computed styles
3. Search for `--mdc-` or `--mat-` variables

### Method 2: Angular Material Source
Check the Angular Material GitHub repo:
- Components: `src/material/{component}/_*.scss`
- Look for `@mixin theme()` and `@mixin color()`

### Method 3: Material Design Docs
Visit: https://m3.material.io/components

### Method 4: CSS Custom Properties Panel
In Chrome DevTools:
1. Select element
2. Styles panel → Computed tab
3. Check "Show all" to see inherited custom properties

## Migration Strategy

### Phase 1: Add Component Tokens (Current)
✅ Define component tokens in theme
✅ Keep existing custom properties for backwards compatibility

```scss
body.dark {
  // Legacy (keep for now)
  --primary: #f14a00;
  
  // MD3 (new)
  --mdc-text-button-label-text-color: #f14a00;
}
```

### Phase 2: Update Components
Gradually update components to use MD3 components properly:
- Use `mat-button`, `mat-raised-button`, etc.
- Use `color="primary"` attribute where needed
- Remove custom button styling

### Phase 3: Clean Up
Once all components use MD3:
- Remove unused legacy custom properties
- Remove custom component styling
- Rely on theme tokens

## Best Practices

### 1. Use Color Attribute
```html
<!-- Good: Use color attribute -->
<button mat-raised-button color="primary">Submit</button>

<!-- Avoid: Custom styling -->
<button mat-raised-button style="background: #f14a00">Submit</button>
```

### 2. Override Tokens, Not Styles
```scss
// Good: Override token
body.dark {
  --mdc-filled-button-container-color: #f14a00;
}

// Avoid: Direct CSS
.mat-mdc-raised-button {
  background-color: #f14a00 !important;
}
```

### 3. Maintain Theme Consistency
```scss
// Good: Use same color across related tokens
body.dark {
  --primary: #f14a00;
  --mdc-text-button-label-text-color: #f14a00;
  --mdc-fab-container-color: #f14a00;
}
```

### 4. Test Both Themes
Always test in both dark and light themes:
```scss
body.dark { /* dark tokens */ }
body.light { /* light tokens */ }
```

## Common Patterns

### Primary Color Buttons
```scss
--mdc-filled-button-container-color: var(--primary);
--mdc-filled-button-label-text-color: var(--theme-white);
```

### Accent/Secondary Buttons
```scss
--mdc-outlined-button-label-text-color: var(--md-sys-color-secondary);
--mdc-outlined-button-outline-color: var(--md-sys-color-secondary);
```

### Disabled States
```scss
--mdc-filled-button-disabled-container-color: rgba(var(--primary-rgb), 0.3);
--mdc-filled-button-disabled-label-text-color: rgba(var(--theme-white-rgb), 0.5);
```

## Troubleshooting

### Problem: Button not using theme color
**Solution:** Check if component token is defined:
```scss
--mdc-text-button-label-text-color: #f14a00;
```

### Problem: Color attribute not working
**Solution:** Ensure theme is applied:
```scss
@include mat.all-component-themes($dark-theme);
```

### Problem: Custom styling overriding theme
**Solution:** Remove `!important` and custom CSS, use tokens instead

### Problem: Inconsistent colors across components
**Solution:** Define all related tokens with same color value

## Resources

### Official Documentation
- [Angular Material Theming Guide](https://material.angular.io/guide/theming)
- [Material Design 3 Components](https://m3.material.io/components)
- [Angular Material GitHub](https://github.com/angular/components)

### Token References
- [MDC Web Components](https://github.com/material-components/material-components-web)
- [Angular Material Theming Variables](https://angular-material.dev/episodes/angular-material-theming-css-vars)

### Tools
- Chrome DevTools - Computed styles panel
- Angular DevTools - Component inspector
- Material Theme Builder - https://material-foundation.github.io/material-theme-builder/

## Current File Structure

```
styles.scss
├── Theme Definitions ($dark-theme, $light-theme)
├── body.dark
│   ├── @include mat.all-component-themes($dark-theme)
│   ├── Legacy custom properties
│   ├── MD3 system tokens
│   └── MD3 component tokens ← NEW
└── body.light
    ├── @include mat.all-component-themes($light-theme)
    ├── Legacy custom properties
    ├── MD3 system tokens
    └── MD3 component tokens ← NEW
```

## Conclusion

By defining MD3 component tokens in your theme, you:
1. ✅ Control Material component styling through your brand theme
2. ✅ Maintain consistency across all components
3. ✅ Reduce need for custom CSS overrides
4. ✅ Future-proof your theming approach
5. ✅ Leverage Material Design's design system

The key is to **define component tokens** like `--mdc-text-button-label-text-color` in your theme, and Material components will automatically use them! 🎨

