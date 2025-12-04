# Generating Theme

Visit: https://material-foundation.github.io/material-theme-builder/

- Primary: #3F97FF
- Secondary: #8391AC (gen) or #F14A00
- Tertiary: #A784B3 (gen)
- Error: #FF5449 (gen)
  - Job Failed & Message Error
- Neutral: #909094 (gen)
- Neutral vibrant: #8D9199 (gen)
- Success: #00B116
  - Job Succeeded & Message Success
- Warnings: #FFFF00
  - Job Pending & Message Warnings
- Info: #3F97FF
  - Job Running & Message Info

Font:
- Lexend
- Roboto

# Material Design 3 Theme Guide - Capital Copilot
**Last Updated:** December 4, 2025  
**Status:** MD3 Migration 88% Complete  
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

### MD3 Design Tokens Quick Lookup

```scss
// SPACING - MD3 4px Grid System (Direct values)
4px     // Minimal gaps, icon spacing
8px     // Small gaps, button padding
16px    // Standard spacing (MOST COMMON)
24px    // Large sections, headers
32px    // Extra large sections
48px    // Page-level spacing
64px    // Maximum spacing

// MD3 SYSTEM COLORS - Text
var(--md-sys-color-on-surface)              // Primary text
var(--md-sys-color-on-surface-variant)      // Secondary text, descriptions
var(--md-sys-color-outline)                 // Tertiary text, disabled

// MD3 SYSTEM COLORS - Surfaces
var(--md-sys-color-surface)                 // Page background
var(--md-sys-color-surface-container)       // Cards, panels (MOST COMMON)
var(--md-sys-color-surface-container-high)  // Elevated surfaces
var(--md-sys-color-surface-container-low)   // Subtle backgrounds
var(--md-sys-color-surface-container-lowest) // Minimal elevation

// MD3 SYSTEM COLORS - Borders & Outlines
var(--md-sys-color-outline)                 // Standard borders
var(--md-sys-color-outline-variant)         // Subtle borders (MOST COMMON)

// MD3 SYSTEM COLORS - Interactive
var(--md-sys-color-primary)                 // Primary actions, links
var(--md-sys-color-on-primary)              // Text on primary
var(--md-sys-color-primary-container)       // Primary backgrounds
var(--md-sys-color-on-primary-container)    // Text on primary backgrounds

var(--md-sys-color-secondary)               // Secondary actions
var(--md-sys-color-on-secondary)            // Text on secondary

var(--md-sys-color-tertiary)                // Tertiary actions
var(--md-sys-color-on-tertiary)             // Text on tertiary

// MD3 EXTENDED COLORS - Semantic (Custom)
var(--md-extended-color-success-color)      // Success states
var(--md-extended-color-success-on-color)   // Text on success
var(--md-extended-color-success-color-container)     // Success backgrounds
var(--md-extended-color-success-on-color-container)  // Text on success backgrounds

var(--md-extended-color-warning-color)      // Warning states
var(--md-extended-color-warning-on-color)   // Text on warning

var(--md-extended-color-info-color)         // Info states
var(--md-extended-color-info-on-color)      // Text on info

var(--md-sys-color-error)                   // Error states
var(--md-sys-color-on-error)                // Text on error
var(--md-sys-color-error-container)         // Error backgrounds
var(--md-sys-color-on-error-container)      // Text on error backgrounds

// BORDER RADIUS - MD3 Standard Values
4px     // Badges, small elements
8px     // Standard (MOST COMMON - buttons, cards, inputs)
12px    // Large cards, dialogs
16px    // Hero sections
999px   // Pills, fully rounded
```

### Most Common Patterns

```scss
// Card/Panel styling
.my-card {
  padding: 16px;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  color: var(--md-sys-color-on-surface);
}

// Status badge
.status-success {
  color: var(--md-extended-color-success-on-color);
  background: var(--md-extended-color-success-color);
}

// Responsive spacing
.container {
  padding: 24px;
  
  @media (max-width: 576px) {
    padding: 16px;
  }
}
```

---

## Current State

### Migration Progress
```
✅ Phase 1: Global Theme (100%)           - MD3 theme structure implemented
✅ Phase 2: Material Components (100%)    - Proper component usage
✅ Phase 3: ::ng-deep Elimination (100%)  - Zero deprecated selectors
✅ Phase 4: Custom Variables (100%)       - All --cc-* vars migrated to MD3 tokens
⏳ Phase 5: Component SCSS (35%)          - Ongoing optimization
```
Overall: 83% Complete
```

### What's Working
- ✅ Proper MD3 theme using `mat.define-theme()`
- ✅ Light/dark theme switching
- ✅ Zero `::ng-deep` usage
- ✅ 100% MD3 design token usage (no custom --cc- variables)
- ✅ MD3 4px grid spacing system
- ✅ SCSS mixins library (`src/styles/_mixins.scss`)
- ✅ Material component variants used correctly
- ✅ Build passing with zero errors

### What's In Progress
- ⏳ Optimizing large component SCSS files
- ⏳ Replacing remaining legacy variables (`--theme-color`, `--description-color`) when encountered
- ⏳ Removing duplicate code and simplifying complex selectors

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

### MD3 4px Grid System

All spacing in the application follows Material Design 3's 4px grid system for consistency:
```scss
// Approved spacing values (multiples of 4px)
4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px, 56px, 64px

// Most common values:
padding: 16px;        // Standard padding
gap: 8px;             // Small spacing
margin-bottom: 24px;  // Section spacing
```

**Important:** Use direct values (not CSS variables) for spacing to keep code explicit and maintainable.

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
// ✅ GOOD - MD3 design tokens
.my-card {
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
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
    padding: 8px;
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
    background: var(--md-sys-color-surface-container);
  }
}

// ✅ GOOD - Direct child selector
.my-component {
  .mat-mdc-form-field {
    background: var(--md-sys-color-surface-container);
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

### ✅ Phase 4: Custom Variable Migration (100% COMPLETE)

**Goal:** Replace all custom `--cc-*` CSS variables with MD3 design tokens.

**Status:** ✅ **COMPLETE** (December 4, 2025)
- All `--cc-spacing-*` variables replaced with direct 4px grid values
- All `--cc-radius-*` variables replaced with direct MD3 values  
- All `--cc-color-*` variables replaced with MD3 design tokens
- Zero remaining `--cc-*` variables in codebase
- Documentation updated with MD3 token examples

**Migration Summary:**
```
Files Migrated: 15 component SCSS files
Variables Replaced: ~200+ instances
Spacing: --cc-spacing-* → 4px, 8px, 16px, 24px, 32px, 48px
Radius: --cc-radius-* → 4px, 8px, 12px, 16px
Colors: --cc-color-* → var(--md-sys-color-*), var(--md-extended-color-*)
```

**Legacy Variables Remaining:**
Some legacy variables like `--theme-color`, `--description-color` may still exist in older code but should be replaced with MD3 tokens when encountered:
```scss
// Replace these when you see them:
var(--theme-color)       → var(--md-sys-color-on-surface)
var(--description-color) → var(--md-sys-color-on-surface-variant)
var(--secondary-color)   → var(--md-sys-color-surface-container)
```

### Phase 5: Component SCSS Optimization (35% Complete)

**Goal:** Reduce SCSS file sizes by 30-50% through:
1. Removing duplicate code
2. Using SCSS mixins for common patterns
3. Removing Material component overrides that duplicate theme
4. Simplifying overly complex selectors

**Target Files:**
```
episodes-table.component.scss   (345 lines) → Est. 250-280 lines
job-status-bar.component.scss   (338 lines) → Est. 250-290 lines
topic-detail.component.scss     (319 lines) → Est. 230-260 lines
scheduling.component.scss       (318 lines) → Est. 230-260 lines
```

**Optimization Pattern:**
1. Import mixins: `@use 'styles/mixins' as mixins;`
2. Use MD3 4px grid values for spacing: `20px` → `24px`
3. Use MD3 standard radius values: `10px` → `8px`
4. Use MD3 tokens for colors: `#fff` → `var(--md-sys-color-on-surface)`
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
  padding: 24px;
  
  .header {
    margin-bottom: 16px;
    color: var(--md-sys-color-on-surface);
  }
  
  .content {
    background: var(--md-sys-color-surface-container);
    border-radius: 8px;
    padding: 16px;
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
// MD3 4px Grid Spacing Values
padding: 16px;           // Most common
margin-bottom: 24px;     // Large spacing
gap: 8px;                // Small spacing
border-radius: 8px;      // Standard radius

// MD3 Color Tokens (Theme-aware)
color: var(--md-sys-color-on-surface);              // Primary text
background: var(--md-sys-color-surface-container);  // Card background
border-color: var(--md-sys-color-outline-variant);  // Borders
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
  padding: 24px;
}

// ❌ BAD - Unnecessary global utility
.flex-between-lg {
  display: flex;
  justify-content: space-between;
  padding: 24px;
}
```

**Exception:** Spacing utilities (`.mb-md`, `.mt-lg`) were legacy and have been replaced with MD3 4px grid values directly in components.

### 5. Responsive Design

**Question:** How do I handle mobile layouts?
**Answer:** Use mixins for consistency:

```scss
@use 'styles/mixins' as mixins;

.header {
  display: flex;
  gap: 24px;
  
  @include mixins.mobile {
    flex-direction: column;
    gap: 16px;
  }
}
```

### 6. Theme-Aware Colors

**Question:** How do I ensure my colors work in light AND dark mode?
**Answer:** ONLY use design tokens, never hardcoded colors:

```scss
// ✅ GOOD - Works in both themes (MD3 tokens)
color: var(--md-sys-color-on-surface);
background: var(--md-sys-color-surface-container);
border-color: var(--md-sys-color-outline-variant);

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
  margin-bottom: 24px;
  
  mat-card-header {
    margin-bottom: 16px;
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
  gap: 16px;
  
  mat-form-field {
    width: 100%;
  }
  
  .actions {
    display: flex;
    gap: 8px;
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
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
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
  gap: 16px;
  
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

**Solution:** Ensure using MD3 design tokens, not hardcoded colors:

```scss
// ❌ Won't switch
color: #ffffff;

// ✅ Will switch (MD3 tokens)
color: var(--md-sys-color-on-surface);
```

### SCSS Not Compiling

**Problem:** Build error about design tokens not found

**Solution:** MD3 tokens are auto-generated by Material. Ensure you're using valid MD3 token names from the theme system. See available tokens in `src/styles/_material-overrides.scss`.
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

