# Capital Copilot Theme Colors Usage Guide (MD3)
**Updated:** 2025-11-09

## Philosophy

Capital Copilot uses Material Design 3 (MD3) semantic color system. Instead of arbitrary colors, we use **semantic roles** that adapt to light/dark themes automatically.

## MD3 System Colors (Primary Usage)

### Primary Colors (Capital Blue)
Use for main brand actions, primary buttons, links
```scss
--md-sys-color-primary           // Capital Blue (#008ce8 dark, #005a9a light)
--md-sys-color-on-primary         // Text on primary (white)
--md-sys-color-primary-container  // Subtle primary highlights
--md-sys-color-on-primary-container // Text on container
```

**Usage:**
```html
<button mat-raised-button color="primary">Primary Action</button>
```

```scss
.branded-element {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
```

### Secondary Colors (Prominent Purple)
Use for secondary actions, premium features
```scss
--md-sys-color-secondary          // Prominent Purple (#a63dff dark, #5a009a light)
--md-sys-color-on-secondary        // Text on secondary
--md-sys-color-secondary-container // Subtle secondary highlights
--md-sys-color-on-secondary-container
```

**Usage:**
```html
<button mat-raised-button color="accent">Secondary Action</button>
```

### Tertiary Colors (Vibrant Orange)
Use for accents, highlights, CTAs
```scss
--md-sys-color-tertiary           // Vibrant Orange (#ff7b3d)
--md-sys-color-on-tertiary         // Text on tertiary
--md-sys-color-tertiary-container  // Subtle tertiary highlights
--md-sys-color-on-tertiary-container
```

### Error Colors (Red)
Use for errors, destructive actions
```scss
--md-sys-color-error               // Error Red (#ef5350 dark, #c62828 light)
--md-sys-color-on-error            // Text on error
--md-sys-color-error-container     // Error backgrounds
--md-sys-color-on-error-container
```

**Usage:**
```html
<button mat-raised-button color="warn">Delete</button>
<p class="cc-error">Error message</p>
```

### Surface Colors (Backgrounds)
Use for component backgrounds, cards
```scss
--md-sys-color-surface             // Default surface
--md-sys-color-on-surface          // Text on surface
--md-sys-color-surface-variant     // Alternate surface
--md-sys-color-on-surface-variant  // Text on variant
--md-sys-color-surface-container   // Container backgrounds
--md-sys-color-background          // App background
--md-sys-color-on-background       // Text on background
```

## Capital Copilot Custom Tokens

### Success/Warning/Info (Not in MD3 by default)
```scss
// Success (Green)
--cc-color-success: #2e7d32;
--cc-color-success-light: #4caf50;
--cc-color-success-container: #1b5e20; (dark) / #c8e6c9 (light)
--cc-color-on-success: #ffffff;

// Warning (Orange/Yellow)
--cc-color-warning: #f57c00;
--cc-color-warning-light: #ff9800;
--cc-color-warning-container: #e65100; (dark) / #ffe0b2 (light)
--cc-color-on-warning: #ffffff; (dark) / #000000 (light)

// Info (Cyan)
--cc-color-info: #0288d1;
--cc-color-info-light: #03a9f4;
--cc-color-info-container: #01579b; (dark) / #b3e5fc (light)
--cc-color-on-info: #ffffff; (dark) / #000000 (light)
```

**Usage:**
```html
<mat-chip class="cc-success">Completed</mat-chip>
<mat-chip class="cc-warning">Pending</mat-chip>
<mat-chip class="cc-info">Info</mat-chip>
```

### Surface Colors (Custom naming for clarity)
```scss
--cc-surface-background: #121212; (dark) / #fafafa (light)
--cc-surface-card: #1e1e1e; (dark) / #ffffff (light)
--cc-surface-elevated: #2a2a2a; (dark) / #ffffff (light)
--cc-surface-toolbar: #1a1a1a; (dark) / #ffffff (light)
```

**Usage:**
```scss
.custom-card {
  background-color: var(--cc-surface-card);
  border: 1px solid var(--cc-border-color);
}
```

### Border & Divider Colors
```scss
--cc-border-color: rgba(255,255,255,0.12); (dark) / rgba(0,0,0,0.12) (light)
--cc-border-color-strong: rgba(255,255,255,0.24); (dark) / rgba(0,0,0,0.24) (light)
--cc-divider-color: rgba(255,255,255,0.08); (dark) / rgba(0,0,0,0.08) (light)
```

**Usage:**
```scss
.section {
  border-top: 1px solid var(--cc-border-color);
}

.divider {
  border-bottom: 1px solid var(--cc-divider-color);
}
```

### Text Colors
```scss
--cc-text-primary: rgba(255,255,255,0.87); (dark) / rgba(0,0,0,0.87) (light)
--cc-text-secondary: rgba(255,255,255,0.60); (dark) / rgba(0,0,0,0.60) (light)
--cc-text-tertiary: rgba(255,255,255,0.38); (dark) / rgba(0,0,0,0.38) (light)
--cc-text-disabled: rgba(255,255,255,0.38); (dark) / rgba(0,0,0,0.38) (light)
```

**Usage:**
```scss
.title {
  color: var(--cc-text-primary);
}

.subtitle {
  color: var(--cc-text-secondary);
}

.hint {
  color: var(--cc-text-tertiary);
}
```

### Spacing Scale
```scss
--cc-spacing-xs: 4px;
--cc-spacing-sm: 8px;
--cc-spacing-md: 16px;
--cc-spacing-lg: 24px;
--cc-spacing-xl: 32px;
--cc-spacing-2xl: 48px;
```

**Usage:**
```scss
.container {
  padding: var(--cc-spacing-md);
  gap: var(--cc-spacing-sm);
}
```

### Border Radius Scale
```scss
--cc-radius-sm: 4px;
--cc-radius-md: 8px;
--cc-radius-lg: 12px;
--cc-radius-xl: 16px;
--cc-radius-round: 999px;
```

**Usage:**
```scss
.card {
  border-radius: var(--cc-radius-md);
}

.button {
  border-radius: var(--cc-radius-lg);
}
```

## Utility Classes

### Semantic State Classes
```html
<p class="cc-success">Success message</p>
<p class="cc-warning">Warning message</p>
<p class="cc-error">Error message</p>
<p class="cc-info">Info message</p>
```

### Text Classes
```html
<p class="cc-text-primary">Primary text</p>
<p class="cc-text-secondary">Secondary text</p>
<p class="cc-text-tertiary">Tertiary text</p>
```

### Surface Classes
```html
<div class="cc-surface-card">Card background</div>
<div class="cc-surface-elevated">Elevated surface</div>
```

## Migration from Legacy Variables

| ❌ Old (Legacy) | ✅ New (MD3/Custom) | Notes |
|----------------|---------------------|-------|
| `--primary` | `--md-sys-color-primary` | Use MD3 system color |
| `--secondary-color` | `--cc-surface-elevated` | Use semantic surface |
| `--theme-color` | `--cc-text-primary` | Use semantic text |
| `--border-color` | `--cc-border-color` | Use custom token |
| `--description-color` | `--cc-text-secondary` | Use semantic text |
| `--secondary-400` | `--cc-surface-card` | Use semantic surface |
| `--theme-white` | `--md-sys-color-on-primary` | Use MD3 role |
| `--theme-yellow` | `--cc-color-warning` | Use semantic color |

## Color Psychology & Usage

### Capital Blue (Primary)
**Psychology:** Trust, stability, professionalism, finance  
**Usage:** Primary actions, main brand elements, trust signals  
**Examples:** Submit buttons, primary links, financial data emphasis

### Prominent Purple (Secondary)
**Psychology:** Premium, creativity, innovation, luxury  
**Usage:** Secondary actions, premium features, special highlights  
**Examples:** Pro features, creative tools, premium badges

### Vibrant Orange (Tertiary)
**Psychology:** Energy, enthusiasm, action, urgency  
**Usage:** CTAs, important alerts, action-required states  
**Examples:** "Upgrade now", urgent notifications, energy metrics

### Success Green
**Psychology:** Growth, success, positivity, go  
**Usage:** Success states, confirmations, positive metrics  
**Examples:** "Payment successful", growth indicators, active states

### Warning Yellow/Orange
**Psychology:** Caution, attention, pending  
**Usage:** Warnings, pending states, requires attention  
**Examples:** "Pending approval", low balance warnings, review needed

### Error Red
**Psychology:** Stop, danger, error, critical  
**Usage:** Errors, destructive actions, critical alerts  
**Examples:** "Delete account", error messages, failed states

### Info Cyan
**Psychology:** Information, helpful, neutral  
**Usage:** Informational messages, tips, neutral states  
**Examples:** "Did you know?", help text, info tooltips

## Best Practices

### ✅ DO
- Use MD3 semantic roles (`--md-sys-color-primary`) for theme-aware colors
- Use Material component `color` attribute (`color="primary"`)
- Use custom tokens for app-specific needs (`--cc-color-success`)
- Use spacing/radius scales for consistency
- Let MD3 handle light/dark adaptation automatically

### ❌ DON'T
- Hardcode colors (`background: #008ce8`)
- Use arbitrary custom properties
- Override Material styles with `!important`
- Mix legacy and new variable names
- Create custom spacing values

## Component Examples

### Button with Primary Color
```html
<button mat-raised-button color="primary">Primary Action</button>
```

### Success Card
```scss
.success-card {
  background-color: var(--cc-color-success-container);
  color: var(--cc-color-on-success);
  border-left: 4px solid var(--cc-color-success);
  padding: var(--cc-spacing-md);
  border-radius: var(--cc-radius-md);
}
```

### Status Badge
```html
<span class="status-badge cc-success">Active</span>
<span class="status-badge cc-warning">Pending</span>
<span class="status-badge cc-error">Failed</span>
```

### Themed Card
```scss
.themed-card {
  background-color: var(--cc-surface-card);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-radius-lg);
  padding: var(--cc-spacing-lg);
  
  .card-title {
    color: var(--cc-text-primary);
    margin-bottom: var(--cc-spacing-sm);
  }
  
  .card-description {
    color: var(--cc-text-secondary);
  }
}
```

## Quick Reference Table

| Use Case | Token | Example Value (Dark) |
|----------|-------|---------------------|
| Primary button | `--md-sys-color-primary` | #008ce8 |
| Secondary button | `--md-sys-color-secondary` | #a63dff |
| Accent/CTA | `--md-sys-color-tertiary` | #ff7b3d |
| Success | `--cc-color-success` | #2e7d32 |
| Warning | `--cc-color-warning` | #f57c00 |
| Error | `--md-sys-color-error` | #ef5350 |
| Card background | `--cc-surface-card` | #1e1e1e |
| Page background | `--cc-surface-background` | #121212 |
| Border | `--cc-border-color` | rgba(255,255,255,0.12) |
| Primary text | `--cc-text-primary` | rgba(255,255,255,0.87) |
| Secondary text | `--cc-text-secondary` | rgba(255,255,255,0.60) |
| Small spacing | `--cc-spacing-sm` | 8px |
| Medium spacing | `--cc-spacing-md` | 16px |
| Card radius | `--cc-radius-md` | 8px |

## Resources

- [Material Design 3 Colors](https://m3.material.io/styles/color/overview)
- [Angular Material Theming](https://material.angular.io/guide/theming)
- [MD3 Theming Guide](/notes/MD3_THEMING_GUIDE.md)
- [Theme Strategy](/notes/MD3_THEMING_STRATEGY.md)

