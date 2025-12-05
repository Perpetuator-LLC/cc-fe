# SCSS Linting Quick Reference - All Errors

**Updated:** December 4, 2025

## 🚨 All Warnings Are Now Errors

Previously lenient rules are now **strictly enforced**. Your build will fail if you violate these rules.

## Common Violations & Fixes

### ❌ VIOLATION: Using !important
```scss
// ❌ BAD - Will fail build
.my-class {
  color: red !important;
}

// ✅ GOOD - Use specificity or Material variants
.my-component .my-class {
  color: var(--md-sys-color-error);
}

// ✅ BETTER - Use Material component color variants
<button mat-flat-button color="warn">Delete</button>
```

### ❌ VIOLATION: Hex Colors
```scss
// ❌ BAD - Will fail build
.my-class {
  background: #ffffff;
  color: #000000;
}

// ✅ GOOD - Use MD3 tokens
.my-class {
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}
```

### ❌ VIOLATION: Non-4px Grid Spacing
```scss
// ❌ BAD - Will fail build
.my-class {
  margin: 10px;
  padding: 15px 18px;
  gap: 22px;
}

// ✅ GOOD - Use 4px grid
.my-class {
  margin: 12px;     // Closest to 10px
  padding: 16px;    // Closest to 15px/18px
  gap: 24px;        // Closest to 22px
}

// Approved values: 0, 4px, 8px, 12px, 16px, 20px, 24px, 28px, 32px, 36px, 40px, 48px, 56px, 64px
```

### ❌ VIOLATION: Color Functions
```scss
// ❌ BAD - Will fail build
.my-class {
  background: rgb(255, 0, 0);
  color: rgba(0, 0, 0, 0.8);
  border: 1px solid hsl(120, 100%, 50%);
}

// ✅ GOOD - Use MD3 tokens
.my-class {
  background: var(--md-sys-color-error);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline);
}
```

### ❌ VIOLATION: ID Selectors
```scss
// ❌ BAD - Will fail build
#my-element {
  color: red;
}

// ✅ GOOD - Use classes
.my-element {
  color: var(--md-sys-color-error);
}
```

### ❌ VIOLATION: Too Much Nesting (>4 levels)
```scss
// ❌ BAD - Will fail build (5 levels)
.level1 {
  .level2 {
    .level3 {
      .level4 {
        .level5 {
          color: red;
        }
      }
    }
  }
}

// ✅ GOOD - Flatten or use Material components
.level1-level5 {
  color: var(--md-sys-color-error);
}

// ✅ BETTER - Let Material handle it
<mat-card>
  <mat-card-content>
    <!-- Material components handle nested styling -->
  </mat-card-content>
</mat-card>
```

### ❌ VIOLATION: Missing Font Family Fallback
```scss
// ❌ BAD - Will fail build
.my-class {
  font-family: 'Roboto';
}

// ✅ GOOD - Include generic fallback
.my-class {
  font-family: 'Roboto', sans-serif;
}

// ✅ BETTER - Use Material typography
// Material already defines proper font stacks
```

## Quick Fix Commands

```bash
# Auto-fix what's possible
yarn lint:scss:fix

# Check specific file
yarn stylelint "src/app/my-component/my-component.component.scss"

# Check all SCSS
yarn lint:scss

# Detect unused classes
yarn lint:scss:unused

# Run all checks
yarn lint:all
```

## Bypassing Rules (NOT RECOMMENDED)

Only use for legacy code being migrated:

```scss
/* stylelint-disable-next-line color-no-hex */
background: #ffffff; // TODO: Migrate to var(--md-sys-color-surface)

/* stylelint-disable-next-line declaration-property-value-disallowed-list */
margin: 18px; // TODO: Change to 16px or 20px
```

## MD3 Design Tokens Reference

### Colors
```scss
// Text
var(--md-sys-color-on-surface)           // Primary text
var(--md-sys-color-on-surface-variant)   // Secondary text

// Backgrounds
var(--md-sys-color-surface)              // Page background
var(--md-sys-color-surface-container)    // Cards, panels

// Borders
var(--md-sys-color-outline)              // Standard borders
var(--md-sys-color-outline-variant)      // Subtle borders

// Semantic
var(--md-sys-color-error)                // Errors
var(--md-extended-color-success-color)   // Success
var(--md-extended-color-warning-color)   // Warnings
```

### Spacing (4px Grid)
```scss
// Common values
4px   // Minimal spacing
8px   // Small spacing
16px  // Standard spacing (MOST COMMON)
24px  // Large spacing
32px  // Extra large spacing
48px  // Section spacing
```

### Border Radius
```scss
4px     // Small elements
8px     // Standard (MOST COMMON)
12px    // Large elements
16px    // Extra large
999px   // Fully rounded (pills)
```

## Pre-commit Behavior

All `.scss` files are automatically checked and fixed (where possible) before commit:

```bash
# Runs automatically on git commit
stylelint --fix <staged-files>
```

**If violations can't be auto-fixed, your commit will be blocked.**

## Getting Help

1. Check error message - they're descriptive
2. See `notes/reference/MD3_COMPREHENSIVE_THEME_GUIDE.md`
3. See `.stylelintrc.json` for rule configuration
4. Ask team for MD3 token equivalents

## Summary

✅ Use MD3 design tokens (`--md-sys-color-*`)  
✅ Use 4px grid spacing (4, 8, 12, 16, 20, 24...)  
✅ Use classes, not IDs  
✅ Keep nesting ≤ 4 levels  
✅ No !important  
✅ No hex colors or color functions  
✅ Include font family fallbacks  

**When in doubt: Let Material Design 3 handle it!**

