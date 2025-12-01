# MD3 Linting and Compliance Enforcement

**Date:** November 29, 2025  
**Status:** ✅ ACTIVE

## Overview

Automated enforcement of Material Design 3 best practices through ESLint, Stylelint, and custom compliance checking.

## Tools Configured

### 1. Stylelint (SCSS/CSS)

**Config:** `.stylelintrc.json`

**Enforces:**

#### ❌ ERRORS (Must Fix)

| Rule | What It Catches | Why | Fix |
|------|----------------|-----|-----|
| `selector-pseudo-element-disallowed-list` | `::ng-deep` selectors | Deprecated, breaks encapsulation | Use CSS custom properties or target Material classes directly |
| `comment-word-disallowed-list` | `::ng-deep` in comments | Deprecated pattern | Remove or use alternatives |
| `property-disallowed-list` | `clip` property | Deprecated | Use `clip-path` instead |
| `declaration-block-no-duplicate-properties` | Duplicate CSS properties | Errors, confusion | Remove duplicates |
| `block-no-empty` | Empty CSS blocks | Dead code | Remove empty blocks |
| `no-duplicate-selectors` | Duplicate selectors | Maintainability | Merge or remove duplicates |

#### ⚠️ WARNINGS (Should Fix)

| Rule | What It Catches | Why | Fix |
|------|----------------|-----|-----|
| `color-no-hex` | `#ff0000` | No theme support | Use `var(--md-sys-color-error)` |
| `function-disallowed-list` | `rgb()`, `rgba()`, `hsl()` | No theme support | Use MD3 design tokens |
| `declaration-property-value-disallowed-list` | Non-4px-grid values | Inconsistent spacing | Use 4, 8, 16, 24, 32, 48 |
| `declaration-no-important` | `!important` usage | Specificity issues | Use proper selectors or Material variants |
| `max-nesting-depth` | Nesting > 4 levels | Complexity | Refactor or use Material components |
| `font-family-no-missing-generic-family-keyword` | No fallback font | Font loading issues | Add `sans-serif` fallback |

### 2. ESLint (TypeScript & HTML Templates)

**Config:** `eslint.config.js`

**Enforces:**

#### Template Rules (HTML)

| Rule | What It Catches | Why | Fix |
|------|----------------|-----|-----|
| `@angular-eslint/template/no-inline-styles` | `style="..."` attributes | No theme support, not responsive | Use component SCSS or Material classes |
| `@angular-eslint/template/no-negated-async` | `!observable$ \| async` | Performance | Use proper async patterns |
| `@angular-eslint/template/use-track-by-function` | `*ngFor` without trackBy | Performance | Add trackBy function |
| `@angular-eslint/template/prefer-self-closing-tags` | `<div></div>` (empty) | Cleaner code | Use `<div />` |
| `@angular-eslint/template/conditional-complexity` | Complex conditions | Readability | Simplify or move to component |
| `@angular-eslint/template/no-call-expression` | Method calls in template | Performance | Use computed properties |

### 3. Custom MD3 Compliance Checker

**Script:** `scripts/check-md3-compliance.js`

**Enforces:**

#### Template Checks

- ✅ No inline styles (`style="..."`)
- ✅ Using Material button variants (not bare `<button>`)
- ✅ Using Material input directives (not bare `<input>`)

#### SCSS Checks

- ✅ No `::ng-deep` selectors
- ✅ No hardcoded px values (not on 4px grid)
- ✅ No hardcoded hex colors
- ✅ No `rgb()` / `rgba()` color functions
- ✅ No hardcoded border-radius values

## Commands

### Run All Lints

```bash
# Run all linting tools
yarn lint:all

# Individual tools
yarn lint           # ESLint (TypeScript + HTML)
yarn lint:scss      # Stylelint (SCSS)
yarn lint:md3       # Custom MD3 compliance checker
```

### Auto-Fix

```bash
# Fix what can be auto-fixed
yarn lint:scss:fix  # Auto-fix SCSS issues
```

### Component Checklist

```bash
# Generate MD3 compliance checklist for a specific component
yarn lint:md3:component src/app/my-component/my-component.component.ts
```

**Output:**
```markdown
## Component: my-component

### Component Template:
- ✅ No inline styles (style="...")
- ✅ Using Material component variants
- ⚠️ (manual check) Using Material layout features

### Component SCSS:
- ✅ No ::ng-deep selectors
- ❌ Using design tokens
- ⚠️ (manual check) Using mixins for common patterns
- ✅ No duplicate utility classes

### General:
- ⚠️ (manual check) Responsive design considered
- ⚠️ (manual check) Light/dark theme tested
```

## Integration with Git Hooks

**Husky + lint-staged automatically runs on commit:**

```json
"lint-staged": {
  "*.ts": ["eslint --fix", "prettier --write", "yarn check-copyright"],
  "*.html": ["yarn check-copyright"],
  "*.scss": ["stylelint --fix", "yarn check-copyright"]
}
```

**Pre-commit checks:**
1. ESLint fixes TypeScript
2. Stylelint fixes SCSS
3. Copyright headers added
4. Changes staged automatically

## Common Violations & Fixes

### ❌ Violation: Inline Styles

```html
<!-- BAD -->
<div style="padding: 16px; color: red;">Content</div>

<!-- GOOD -->
<div class="content">Content</div>
```

```scss
.content {
  padding: 16px;  // Or use Material card padding
  color: var(--md-sys-color-error);
}
```

### ❌ Violation: ::ng-deep

```scss
// BAD
::ng-deep .mat-mdc-button {
  color: red;
}

// GOOD - Use CSS custom properties
.my-component {
  --mdc-text-button-label-text-color: var(--md-sys-color-error);
}

// OR target directly (Material classes aren't encapsulated)
.my-component .mat-mdc-button {
  color: var(--md-sys-color-error);
}
```

### ❌ Violation: Hardcoded Colors

```scss
// BAD
.error-message {
  color: #ff0000;
  background: rgb(255, 0, 0);
}

// GOOD
.error-message {
  color: var(--md-sys-color-error);
  background-color: var(--md-sys-color-error-container);
}
```

### ❌ Violation: Non-Grid Spacing

```scss
// BAD
.card {
  padding: 15px;
  margin: 23px;
  gap: 13px;
}

// GOOD
.card {
  padding: 16px;  // 4px grid
  margin: 24px;   // 4px grid
  gap: 16px;      // 4px grid
}

// BETTER - Use Material components
<mat-card>
  <!-- Padding handled by Material -->
</mat-card>
```

### ❌ Violation: Generic Buttons

```html
<!-- BAD -->
<button>Click Me</button>
<button class="primary-btn">Save</button>

<!-- GOOD -->
<button mat-button>Click Me</button>
<button mat-flat-button color="primary">Save</button>
<button mat-raised-button color="accent">Submit</button>
```

### ❌ Violation: Generic Inputs

```html
<!-- BAD -->
<input type="text" placeholder="Name">

<!-- GOOD -->
<mat-form-field>
  <mat-label>Name</mat-label>
  <input matInput>
</mat-form-field>
```

## MD3 Design Token Reference

### Always Use These Instead of Hardcoded Values

**Colors:**
```scss
// Surfaces
--md-sys-color-background
--md-sys-color-surface
--md-sys-color-surface-container
--md-sys-color-surface-container-low
--md-sys-color-surface-container-high
--md-sys-color-surface-container-highest

// Text
--md-sys-color-on-surface
--md-sys-color-on-surface-variant
--md-sys-color-on-background

// Semantic
--md-sys-color-primary
--md-sys-color-secondary
--md-sys-color-tertiary
--md-sys-color-error
--md-extended-color-success-color
--md-extended-color-warning-color
--md-extended-color-info-color

// Borders
--md-sys-color-outline
--md-sys-color-outline-variant
```

**Spacing (4px grid):**
```scss
4px   // xs - Minimal gaps
8px   // sm - Small gaps, button padding
16px  // md - Medium padding, card spacing (most common)
24px  // lg - Large sections
32px  // xl - Extra large sections
48px  // 2xl - Page-level spacing
```

**Border Radius:**
```scss
4px    // sm - Small elements, badges
8px    // md - Buttons, cards, inputs (most common)
12px   // lg - Large cards
16px   // xl - Hero elements
999px  // round - Pills, fully rounded
```

## Disabling Rules (Last Resort)

### For Specific Lines

```scss
/* stylelint-disable-next-line color-no-hex */
background-color: #ff0000; // Required by third-party library
```

```html
<!-- eslint-disable-next-line @angular-eslint/template/no-inline-styles -->
<div style="position: absolute; top: {{ dynamicTop }}px;">
  <!-- Dynamic positioning required -->
</div>
```

### For Entire Files

```scss
/* stylelint-disable color-no-hex */
// Legacy styles, to be refactored
.old-component {
  color: #ff0000;
}
/* stylelint-enable color-no-hex */
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/lint.yml
- name: Lint TypeScript & Templates
  run: yarn lint

- name: Lint SCSS
  run: yarn lint:scss

- name: Check MD3 Compliance
  run: yarn lint:md3

- name: Run All Lints
  run: yarn lint:all
```

## IDE Integration

### VS Code

Install extensions:
- **ESLint** (dbaeumer.vscode-eslint)
- **Stylelint** (stylelint.vscode-stylelint)

Add to `.vscode/settings.json`:
```json
{
  "stylelint.validate": ["css", "scss"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  }
}
```

### WebStorm/IntelliJ

- Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
- Enable Stylelint: Settings → Languages & Frameworks → Style Sheets → Stylelint
- Both will auto-fix on save if configured

## Summary

**Automated Enforcement:**
- ✅ No `::ng-deep` (error)
- ✅ No inline styles (error)
- ✅ No hardcoded colors (warning)
- ✅ No arbitrary spacing values (warning)
- ✅ No generic buttons/inputs (warning)
- ✅ No duplicate selectors (error)
- ✅ No empty blocks (error)

**Commands:**
- `yarn lint:all` - Run all checks
- `yarn lint:scss:fix` - Auto-fix SCSS
- `yarn lint:md3:component <path>` - Generate compliance checklist

**Pre-commit:** Automatically runs on `git commit` via Husky

---

**All MD3 best practices are now automatically enforced! Run `yarn lint:all` to check compliance.** ✨🔒

