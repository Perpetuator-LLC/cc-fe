# Generating Theme

Visit: https://material-foundation.github.io/material-theme-builder/

- Primary: #3DA6FF
- Secondary: #F14A00
- Tertiary: #8C00E8
- Error: #FF5449
  - Job Failed & Message Error
- Success:
  - Job Succeeded & Message Success
- Warnings:
  - Job Pending & Message Warnings
- Info: #3DA6FF
  - Job Running & Message Info

Font:
- Lexend
- Roboto

# Material Design 3 Theme Guide - Capital Copilot
**Last Updated:** November 25, 2025  
**Status:** MD3 Migration 83% Complete  
**Angular Version:** 18.0.6  
**Material Version:** 18.0.6

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Current State](#current-state)
3. [Design Token System](#design-token-system)
4. [Theme Implementation](#theme-implementation)
5. [Component Styling Guidelines](#component-styling-guidelines)
6. [Migration Strategy](#migration-strategy)
7. [Maintenance Guide](#maintenance-guide)
8. [Best Practices](#best-practices)

---

## Quick Reference

### Design Tokens Quick Lookup

```scss
// SPACING (Use these instead of hardcoded px values)
--cc-spacing-xs: 4px    // Minimal gaps
--cc-spacing-sm: 8px    // Small gaps, button padding
--cc-spacing-md: 16px   // Standard spacing (most common)
--cc-spacing-lg: 24px   // Large sections
--cc-spacing-xl: 32px   // Extra large sections
--cc-spacing-2xl: 48px  // Page-level spacing

// COLORS - Semantic (Use these for status/feedback)
--cc-color-success      // Green (#4caf50 dark, #2e7d32 light)
--cc-color-error        // Red (#ef5350 dark, #c62828 light)
--cc-color-warning      // Orange (#ff9800 dark, #f57c00 light)
--cc-color-info         // Blue (#03a9f4 dark, #0288d1 light)

// COLORS - Brand
--cc-color-primary      // Capital Blue (#008ce8 dark, #005a9a light)
--cc-color-orange       // Brand Orange (#ff7b3d dark, #f14a00 light)
--primary               // Legacy orange (#f14a00) - use for links/accents

// COLORS - Text (Use these instead of hardcoded colors)
--cc-text-primary       // Main text
--cc-text-secondary     // Descriptions, labels
--cc-text-tertiary      // Disabled text, placeholders

// COLORS - Surfaces (Use these for backgrounds)
--cc-surface-background // Page background
--cc-surface-card       // Cards, panels
--cc-surface-elevated   // Elevated surfaces
--cc-surface-toolbar    // Toolbar/header background

// BORDERS
--cc-border-color       // Standard borders
--cc-border-color-strong // Emphasized borders

// BORDER RADIUS (Use these instead of hardcoded px)
--cc-radius-sm: 4px     // Badges, small elements
--cc-radius-md: 8px     // Standard (most common)
--cc-radius-lg: 12px    // Large cards
--cc-radius-xl: 16px    // Hero sections
--cc-radius-round: 999px // Pills, fully rounded
```

---

## Current State

### Migration Progress
```
✅ Phase 1: Global Theme (100%)           - MD3 theme structure implemented
✅ Phase 2: Material Components (100%)    - Proper component usage
✅ Phase 3: ::ng-deep Elimination (100%)  - Zero deprecated selectors
✅ Phase 4: Legacy Variables (80%)        - Design tokens implemented
⏳ Phase 5: Component SCSS (35%)          - Ongoing optimization

Overall: 83% Complete
```

### What's Working
- ✅ Proper MD3 theme using `mat.define-theme()`
- ✅ Light/dark theme switching
- ✅ Zero `::ng-deep` usage
- ✅ Comprehensive design token system
- ✅ SCSS mixins library (`src/styles/_mixins.scss`)
- ✅ Material component variants used correctly
- ✅ Build passing with zero errors

### What's In Progress
- ⏳ Replacing legacy variables (`--theme-color`, `--description-color`) with design tokens
- ⏳ Optimizing large component SCSS files
- ⏳ Removing remaining hardcoded spacing/colors

---

## Design Token System

### Color Palette Architecture

#### Capital Blue (Primary)
Used for running jobs, progress indicators, and primary actions in Material components.
```scss
Dark Theme:  #008ce8
Light Theme: #005a9a
```

#### Vibrant Orange (Brand/Accent)
Our signature color for links, CTAs, and brand elements.
```scss
--primary: #f14a00           // Main brand orange
--cc-color-orange: #ff7b3d   // Lighter variant (dark theme)
```

#### Prominent Purple (Tertiary)
Used for premium features and creative elements.
```scss
Dark Theme:  #a63dff
Light Theme: #5a009a
```

### Legacy Variables (Being Phased Out)
These still work but should be replaced with design tokens in new code:
```scss
// OLD (Legacy)              →  NEW (Design Token)
--theme-color                →  --cc-text-primary
--secondary-color            →  --cc-surface-card
--description-color          →  --cc-text-secondary
--border-color               →  --cc-border-color
--toolbar-container-background-color → --cc-surface-toolbar
```

**Strategy:** Legacy variables are mapped to design tokens in theme definitions, so existing code continues to work while we migrate incrementally.

---

## Theme Implementation

### File Structure
```
src/
├── styles.scss                 # Main theme file (1415 lines)
│   ├── Color palette definitions
│   ├── Theme configurations (light/dark)
│   ├── Global component overrides
│   └── Utility classes
├── styles/_mixins.scss         # Reusable SCSS mixins (287 lines)
│   ├── Responsive breakpoints
│   ├── Card/button patterns
│   ├── Layout helpers
│   └── Status badges
└── app/
    └── [component]/
        └── component.scss      # Component-specific styles
```

### Theme Definition Pattern

```scss
// 1. Define custom palettes
$_capital-blue: ( /* MD3 tonal palette */ );
$_vibrant-orange: ( /* MD3 tonal palette */ );
$_prominent-purple: ( /* MD3 tonal palette */ );

// 2. Create complete palette maps
$capital-blue-palette: map.merge($_capital-blue, $_rest);

// 3. Define themes
$dark-theme: mat.define-theme((
  color: (
    theme-type: dark,
    primary: $capital-blue-palette,
    tertiary: $prominent-purple-palette,
  ),
  typography: $cc-typography,
  density: $cc-density,
));

// 4. Apply typography/density once globally
html {
  @include mat.all-component-typographies($dark-theme);
  @include mat.all-component-densities($dark-theme);
}

// 5. Apply colors per theme
body.dark {
  @include mat.all-component-colors($dark-theme);
  // Custom design tokens here
}
```

**Critical:** Only apply colors per theme, not full themes. This prevents duplicate CSS generation and reduces bundle size by ~30%.

### Custom Design Tokens

Design tokens are defined within each theme block:

```scss
body.dark {
  @include mat.all-component-colors($dark-theme);
  
  // Semantic colors
  --cc-color-success: #4caf50;
  --cc-color-error: #ef5350;
  --cc-color-warning: #ff9800;
  
  // Surface colors
  --cc-surface-background: #121212;
  --cc-surface-card: #1e1e1e;
  
  // Text colors
  --cc-text-primary: rgba(255, 255, 255, 0.87);
  --cc-text-secondary: rgba(255, 255, 255, 0.60);
  
  // Spacing & radius (same in both themes)
  --cc-spacing-md: 16px;
  --cc-radius-md: 8px;
}
```

---

## Component Styling Guidelines

### DO: Use Material Component Variants

```html
<!-- ✅ GOOD - Use Material variants -->
<mat-dialog-actions align="end">
  <button mat-button>Cancel</button>
  <button mat-flat-button color="primary">Save</button>
</mat-dialog-actions>

<!-- ❌ BAD - Custom classes -->
<div class="flex-between">
  <button class="cancel-btn">Cancel</button>
  <button class="primary-btn">Save</button>
</div>
```

### DO: Use Design Tokens

```scss
// ✅ GOOD - Design tokens
.my-card {
  padding: var(--cc-spacing-md);
  margin-bottom: var(--cc-spacing-lg);
  border-radius: var(--cc-radius-md);
  background: var(--cc-surface-card);
  color: var(--cc-text-primary);
}

// ❌ BAD - Hardcoded values
.my-card {
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  background: #1e1e1e;
  color: rgba(255, 255, 255, 0.87);
}
```

### DO: Use SCSS Mixins

```scss
@use 'styles/mixins' as mixins;

.my-component {
  @include mixins.card-container;
  
  @include mixins.mobile {
    padding: var(--cc-spacing-sm);
  }
  
  .status-badge {
    @include mixins.status-success;
  }
}
```

### DON'T: Use ::ng-deep

```scss
// ❌ BAD - Deprecated
.my-component {
  ::ng-deep .mat-mdc-form-field {
    background: var(--cc-surface-card);
  }
}

// ✅ GOOD - Direct child selector
.my-component {
  .mat-mdc-form-field {
    background: var(--cc-surface-card);
  }
}
```

**Why it works:** Angular Material intentionally exposes internal classes for styling without breaking encapsulation.

### DON'T: Create Custom Utilities When Material Exists

```html
<!-- ❌ BAD - Reinventing Material -->
<div class="full-width-field">
  <mat-form-field>...</mat-form-field>
</div>

<!-- ✅ GOOD - Let Material handle it -->
<mat-dialog-content>
  <mat-form-field>...</mat-form-field>
</mat-dialog-content>
```

---

## Migration Strategy

### Phase 4: Legacy Variable Migration (80% Complete)

**Goal:** Replace legacy CSS variables with design tokens throughout components.

**Status:** Design tokens implemented and mapped. Legacy variables still work for backwards compatibility.

**Next Steps:**
```scss
// Find and replace these patterns:
grep -r "var(--theme-color)" src/app/**/*.scss        // 20 instances
grep -r "var(--description-color)" src/app/**/*.scss  // 30+ instances
grep -r "var(--secondary-color)" src/app/**/*.scss    // 15+ instances

// Replace with:
var(--theme-color)       → var(--cc-text-primary)
var(--description-color) → var(--cc-text-secondary)
var(--secondary-color)   → var(--cc-surface-card)
```

### Phase 5: Component SCSS Optimization (35% Complete)

**Goal:** Reduce SCSS file sizes by 30-50% through:
1. Replacing hardcoded values with design tokens
2. Using SCSS mixins for common patterns
3. Removing Material component overrides that duplicate theme
4. Eliminating duplicate code

**Target Files:**
```
episodes-table.component.scss   (345 lines) → Est. 250-280 lines
job-status-bar.component.scss   (338 lines) → Est. 250-290 lines
topic-detail.component.scss     (319 lines) → Est. 230-260 lines
scheduling.component.scss       (318 lines) → Est. 230-260 lines
```

**Optimization Pattern:**
1. Import mixins: `@use 'styles/mixins' as mixins;`
2. Replace hardcoded spacing: `20px` → `var(--cc-spacing-lg)`
3. Replace hardcoded radius: `8px` → `var(--cc-radius-md)`
4. Replace hardcoded colors: `#fff` → `var(--cc-text-primary)`
5. Use mixins for common patterns: `@include mixins.card-container;`
6. Remove duplicate responsive code: Use `@include mixins.mobile { }`

---

## Maintenance Guide

### For New Components

**ALWAYS:**
1. Use Material component variants (not custom buttons/forms)
2. Use design tokens (never hardcode colors/spacing/radius)
3. Import and use SCSS mixins for common patterns
4. No inline styles in templates
5. No `::ng-deep` in SCSS

**Component Template Pattern:**
```html
<mat-card>
  <mat-card-header>
    <mat-card-title>{{ title }}</mat-card-title>
  </mat-card-header>
  
  <mat-card-content>
    <mat-form-field>
      <mat-label>Name</mat-label>
      <input matInput [(ngModel)]="name">
    </mat-form-field>
  </mat-card-content>
  
  <mat-card-actions align="end">
    <button mat-button>Cancel</button>
    <button mat-flat-button color="primary">Save</button>
  </mat-card-actions>
</mat-card>
```

**Component SCSS Pattern:**
```scss
/* Copyright (c) 2025 Perpetuator LLC */

.my-component {
  padding: var(--cc-spacing-lg);
  
  .header {
    margin-bottom: var(--cc-spacing-md);
    color: var(--cc-text-primary);
  }
  
  .content {
    background: var(--cc-surface-card);
    border-radius: var(--cc-radius-md);
    padding: var(--cc-spacing-md);
  }
}
```

### For Existing Components

**When touching a file:**
1. Replace hardcoded values with design tokens
2. Replace legacy variables with new tokens (if time permits)
3. Use mixins for repeated patterns
4. Remove duplicate/unused code

**Gradual Migration:** It's OK to have legacy variables mixed with design tokens. They're mapped, so both work. Migrate incrementally.

### Code Review Checklist

```
Component Templates:
[ ] No inline styles (style="...")
[ ] Using Material component variants (mat-flat-button, mat-raised-button)
[ ] Using Material layout features (mat-dialog-actions align="end")

Component SCSS:
[ ] No ::ng-deep selectors
[ ] Using design tokens (--cc-*) not hardcoded values
[ ] Using mixins for common patterns (if applicable)
[ ] No duplicate utility classes

General:
[ ] Follows existing patterns in similar components
[ ] Responsive design considered
[ ] Light/dark theme tested
```

---

## Best Practices

### 1. Material Component First

**Question:** Should I create a custom button style?
**Answer:** NO. Use Material button variants:

```html
<button mat-button>Text</button>
<button mat-raised-button>Contained</button>
<button mat-flat-button color="primary">Primary</button>
<button mat-stroked-button>Outlined</button>
<button mat-icon-button><mat-icon>menu</mat-icon></button>
```

### 2. Design Tokens for Everything

**Question:** Should I hardcode `padding: 16px`?
**Answer:** NO. Use design tokens:

```scss
padding: var(--cc-spacing-md);        // 16px
margin-bottom: var(--cc-spacing-lg);  // 24px
gap: var(--cc-spacing-sm);            // 8px
border-radius: var(--cc-radius-md);   // 8px
color: var(--cc-text-primary);        // Theme-aware text color
background: var(--cc-surface-card);   // Theme-aware surface
```

### 3. SCSS Mixins for Patterns

**Question:** Should I copy/paste this card styling?
**Answer:** NO. Use or create a mixin:

```scss
@use 'styles/mixins' as mixins;

// Available mixins:
@include mixins.card-container;      // Standard card
@include mixins.card-elevated;       // Elevated card
@include mixins.primary-button;      // Primary button style
@include mixins.flex-between;        // Space-between layout
@include mixins.mobile { }           // Mobile responsive
@include mixins.status-success;      // Success badge
@include mixins.loading-container;   // Loading state
@include mixins.empty-state;         // Empty state
```

### 4. Component-Specific Over Global

**Question:** Should I create a global utility class?
**Answer:** ONLY if it's truly reusable. Otherwise, component-specific:

```scss
// ✅ GOOD - Component-specific
.podcast-header {
  display: flex;
  justify-content: space-between;
  padding: var(--cc-spacing-lg);
}

// ❌ BAD - Unnecessary global utility
.flex-between-lg {
  display: flex;
  justify-content: space-between;
  padding: var(--cc-spacing-lg);
}
```

**Exception:** Spacing utilities (`.mb-md`, `.mt-lg`) are legitimate because they're simple, single-purpose, and use design tokens.

### 5. Responsive Design

**Question:** How do I handle mobile layouts?
**Answer:** Use mixins for consistency:

```scss
@use 'styles/mixins' as mixins;

.header {
  display: flex;
  gap: var(--cc-spacing-lg);
  
  @include mixins.mobile {
    flex-direction: column;
    gap: var(--cc-spacing-md);
  }
}
```

### 6. Theme-Aware Colors

**Question:** How do I ensure my colors work in light AND dark mode?
**Answer:** ONLY use design tokens, never hardcoded colors:

```scss
// ✅ GOOD - Works in both themes
color: var(--cc-text-primary);
background: var(--cc-surface-card);
border-color: var(--cc-border-color);

// ❌ BAD - Breaks in dark mode
color: #000000;
background: #ffffff;
border-color: #e0e0e0;
```

---

## Common Patterns

### Card Component

```html
<mat-card class="custom-card">
  <mat-card-header>
    <mat-card-title>Title</mat-card-title>
  </mat-card-header>
  
  <mat-card-content>
    Content here
  </mat-card-content>
  
  <mat-card-actions align="end">
    <button mat-button>Action</button>
  </mat-card-actions>
</mat-card>
```

```scss
.custom-card {
  margin-bottom: var(--cc-spacing-lg);
  
  mat-card-header {
    margin-bottom: var(--cc-spacing-md);
  }
}
```

### Form Component

```html
<form>
  <mat-form-field>
    <mat-label>Name</mat-label>
    <input matInput required>
  </mat-form-field>
  
  <mat-form-field>
    <mat-label>Email</mat-label>
    <input matInput type="email" required>
  </mat-form-field>
  
  <div class="actions">
    <button mat-button type="button">Cancel</button>
    <button mat-flat-button color="primary" type="submit">Save</button>
  </div>
</form>
```

```scss
form {
  display: flex;
  flex-direction: column;
  gap: var(--cc-spacing-md);
  
  mat-form-field {
    width: 100%;
  }
  
  .actions {
    display: flex;
    gap: var(--cc-spacing-sm);
    justify-content: flex-end;
  }
}
```

### Status Badges

```html
<span class="status-badge success">Active</span>
<span class="status-badge error">Failed</span>
<span class="status-badge warning">Pending</span>
```

```scss
@use 'styles/mixins' as mixins;

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--cc-spacing-xs);
  padding: var(--cc-spacing-xs) var(--cc-spacing-sm);
  border-radius: var(--cc-radius-sm);
  font-size: 12px;
  font-weight: 600;
  
  &.success { @include mixins.status-success; }
  &.error { @include mixins.status-error; }
  &.warning { @include mixins.status-warning; }
}
```

### Responsive Layout

```html
<div class="grid-layout">
  <div class="item">Item 1</div>
  <div class="item">Item 2</div>
  <div class="item">Item 3</div>
</div>
```

```scss
@use 'styles/mixins' as mixins;

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--cc-spacing-md);
  
  @include mixins.mobile {
    grid-template-columns: 1fr;
  }
}
```

---

## Troubleshooting

### Icons Not Displaying

**Problem:** Material icons showing as text or boxes

**Solution:** Ensure Material Symbols font is loaded and `.mat-icon` has proper styling:

```scss
// In styles.scss (already implemented)
.mat-icon {
  font-family: 'Material Symbols Outlined' !important;
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
}
```

### Theme Not Switching

**Problem:** Colors don't change when toggling light/dark mode

**Solution:** Ensure using design tokens, not hardcoded colors:

```scss
// ❌ Won't switch
color: #ffffff;

// ✅ Will switch
color: var(--cc-text-primary);
```

### SCSS Not Compiling

**Problem:** Build error about design tokens not found

**Solution:** Ensure token is defined in both light and dark theme blocks in `styles.scss`:

```scss
body.dark {
  --cc-my-token: value;
}

body.light {
  --cc-my-token: value;
}
```

### Spacing Inconsistent

**Problem:** Spacing looks different in light vs dark theme

**Solution:** Spacing tokens are the same in both themes. Check if you're using legacy variables that might be theme-dependent.

---

## Future Roadmap

### Short Term (Next 2-3 months)
- Complete Phase 4: Replace all legacy variables with design tokens
- Complete Phase 5: Optimize remaining large SCSS files
- Create component-specific theme mixins for frequently customized components
- Document custom Material component theming patterns

### Medium Term (3-6 months)
- Implement advanced density customization for different viewport sizes
- Create design system documentation with live examples
- Audit and remove unused SCSS across all components
- Implement automatic theme token validation in CI/CD

### Long Term (6-12 months)
- Explore CSS custom property-based theming for even more flexibility
- Implement component-specific color schemes (beyond light/dark)
- Create visual regression testing for theme changes
- Migrate to newer Material Design 3 features as they become available

---

## Resources

### Internal Documentation
- `src/styles.scss` - Main theme implementation
- `src/styles/_mixins.scss` - Reusable SCSS mixins
- `logs/ai_edits/2025-11-24_final_migration_summary.md` - Complete migration report
- `logs/ai_edits/2025-11-25_scss_optimization_progress.md` - Latest optimization progress

### External References
- [Angular Material Theming](https://material.angular.io/guide/theming)
- [Material Design 3](https://m3.material.io/)
- [Material Symbols](https://fonts.google.com/icons)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

## Quick Command Reference

```bash
# Find hardcoded spacing
grep -r "margin.*: [0-9]+px" src/app/**/*.scss
grep -r "padding.*: [0-9]+px" src/app/**/*.scss

# Find hardcoded colors
grep -rE "#[0-9a-fA-F]{3,6}" src/app/**/*.scss | grep -v "Copyright"

# Find legacy variable usage
grep -r "var(--theme-color)" src/app/**/*.scss
grep -r "var(--description-color)" src/app/**/*.scss

# Find remaining ::ng-deep
grep -r "::ng-deep" src/app/**/*.scss

# Build and check
yarn build --configuration=development

# Run tests
npm test -- --include='**/[component].spec.ts' --watch=false 2>&1 | cat
```

---

## Summary

**Current State:** MD3 migration 83% complete. Core infrastructure in place, ongoing optimization of component SCSS.

**Key Achievements:**
- ✅ Proper MD3 theme structure
- ✅ Comprehensive design token system
- ✅ Zero deprecated patterns (::ng-deep)
- ✅ SCSS mixins library
- ✅ Material components used correctly

**Next Steps:**
- Continue replacing legacy variables with design tokens
- Optimize remaining large SCSS files
- Maintain consistency in new components

**Philosophy:** Use Material Design 3 as intended - let Material components handle styling, use design tokens for customization, and keep component SCSS minimal and maintainable.

---

*Last Updated: November 25, 2025*  
*Maintainer: Development Team*  
*Status: Living Document - Update as theme evolves*

