# ESLint Configuration and Guidelines

> **Status:** ✅ **ENFORCED** - All rules are actively enforced via ESLint and pre-commit hooks.

## Overview

This project uses ESLint to enforce code quality and Angular best practices. Key enforcements include:

- ✅ **No inline templates** - All components must use `templateUrl`
- ✅ **No inline styles** - All components must use `styleUrl`
- ✅ **Automatic validation** - Checked on lint, commit, and CI/CD

## Core Rules

### No Inline Templates or Styles

**Rule:** `@angular-eslint/component-max-inline-declarations`

```javascript
'@angular-eslint/component-max-inline-declarations': [
  'error',
  {
    template: 0,    // ❌ No inline templates allowed
    styles: 0,      // ❌ No inline styles allowed
    animations: 10, // ✅ Animations can be inline
  },
],
```

### Why This Rule?

1. **Automatic Validation** - All SCSS files checked by stylelint
2. **Better IDE Support** - Syntax highlighting and autocomplete
3. **Easier Code Review** - Clear separation of concerns
4. **MD3 Compliance** - Design tokens enforced via stylelint
5. **Theme Support** - Components adapt automatically
6. **Maintainability** - Easier to find and modify

## What's Not Allowed

### ❌ Inline Template

```typescript
@Component({
  selector: 'app-my-component',
  template: `<div>My template</div>`,  // ❌ ESLint ERROR
  styleUrl: './my-component.component.scss',
})
export class MyComponent {}
```

**Error:**
```
Component has inline template
@angular-eslint/component-max-inline-declarations
```

### ❌ Inline Styles

```typescript
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styles: [`                             // ❌ ESLint ERROR
    .my-class { color: red; }
  `],
})
export class MyComponent {}
```

**Error:**
```
Component has inline styles
@angular-eslint/component-max-inline-declarations
```

### ❌ Both Inline

```typescript
@Component({
  selector: 'app-my-component',
  template: `<div>My template</div>`,    // ❌ ESLint ERROR
  styles: [`.my-class { color: red; }`], // ❌ ESLint ERROR
})
export class MyComponent {}
```

**Error:**
```
Component has inline template and styles
@angular-eslint/component-max-inline-declarations
```

## What's Required

### ✅ External Files Only

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './my-component.component.html',  // ✅ REQUIRED
  styleUrl: './my-component.component.scss',      // ✅ REQUIRED
})
export class MyComponent {}
```

### ✅ File Structure

```
my-component/
├── my-component.component.ts      # Component logic
├── my-component.component.html    # External template (REQUIRED)
└── my-component.component.scss    # External styles (REQUIRED)
```

### ✅ File Templates

**HTML File (`my-component.component.html`):**
```html
<!-- Copyright (c) 2025 Perpetuator LLC -->

<div class="my-component">
  <h2>{{ title }}</h2>
  <p>{{ description }}</p>
</div>
```

**SCSS File (`my-component.component.scss`):**
```scss
/* Copyright (c) 2025 Perpetuator LLC */
@use 'styles/mixins' as mixins;

.my-component {
  @include mixins.flex-column;
  
  padding: 16px;
  background: var(--md-sys-color-surface-container);
  border-radius: 8px;
  
  h2 {
    color: var(--md-sys-color-on-surface);
    margin-bottom: 8px;
  }
  
  p {
    color: var(--md-sys-color-on-surface-variant);
  }
}
```

## How Validation Works

### 1. During Development

ESLint shows errors in your IDE immediately:

```
❌ Component has inline template
   @angular-eslint/component-max-inline-declarations
```

### 2. During Lint

```bash
yarn lint
# ERROR: Component has inline template/styles
# @angular-eslint/component-max-inline-declarations
```

### 3. During Pre-commit

Husky runs lint checks before allowing commits:

```bash
git commit -m "Add feature"
# Running ESLint...
# ❌ Commit blocked - Fix ESLint errors first
```

### 4. During CI/CD

GitHub Actions runs linting in CI pipeline:

```yaml
- name: Lint
  run: yarn lint
  # Build fails if ESLint errors found
```

## Running ESLint

### Lint All Files

```bash
yarn lint
```

### Lint Specific File

```bash
yarn lint src/app/my-component/my-component.component.ts
```

### Auto-fix Issues

```bash
yarn lint --fix
```

**Note:** Some issues can't be auto-fixed (like inline templates/styles) and must be manually corrected.

## Checking for Violations

### Find Inline Templates

```bash
grep -r "template: \`" src/app --include="*.ts"
# Should return nothing!
```

### Find Inline Styles

```bash
grep -r "styles: \[" src/app --include="*.ts"
# Should return nothing!
```

### Verify External Files

```bash
# All components should have corresponding .html and .scss files
find src/app -name "*.component.ts" | while read file; do
  base="${file%.component.ts}"
  if [ ! -f "${base}.component.html" ]; then
    echo "Missing: ${base}.component.html"
  fi
  if [ ! -f "${base}.component.scss" ]; then
    echo "Missing: ${base}.component.scss"
  fi
done
```

## Migration Guide

### Converting Inline Template to External

**Before:**
```typescript
@Component({
  selector: 'app-my-component',
  template: `
    <div class="container">
      <h2>{{ title }}</h2>
    </div>
  `,
  styleUrl: './my-component.component.scss',
})
```

**After:**

1. Create `my-component.component.html`:
   ```html
   <!-- Copyright (c) 2025 Perpetuator LLC -->
   
   <div class="container">
     <h2>{{ title }}</h2>
   </div>
   ```

2. Update component:
   ```typescript
   @Component({
     selector: 'app-my-component',
     templateUrl: './my-component.component.html',  // ✅ Changed
     styleUrl: './my-component.component.scss',
   })
   ```

### Converting Inline Styles to External

**Before:**
```typescript
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styles: [`
    .container {
      padding: 16px;
      background: var(--md-sys-color-surface);
    }
  `],
})
```

**After:**

1. Create `my-component.component.scss`:
   ```scss
   /* Copyright (c) 2025 Perpetuator LLC */
   @use 'styles/mixins' as mixins;
   
   .container {
     padding: 16px;
     background: var(--md-sys-color-surface);
   }
   ```

2. Update component:
   ```typescript
   @Component({
     selector: 'app-my-component',
     templateUrl: './my-component.component.html',
     styleUrl: './my-component.component.scss',  // ✅ Changed
   })
   ```

## Benefits

### 1. Automatic Validation

All styles are validated by stylelint:

```bash
yarn lint:scss
# Checks all .scss files for MD3 compliance
```

### 2. Better IDE Support

- ✅ Syntax highlighting
- ✅ Autocomplete
- ✅ Error detection
- ✅ Formatting

### 3. Easier Code Review

Clear separation allows reviewers to:
- Review logic in `.ts` files
- Review templates in `.html` files
- Review styles in `.scss` files

### 4. MD3 Compliance

Stylelint enforces:
- Design token usage
- 4px grid spacing
- No hardcoded colors
- Proper Material component usage

### 5. Theme Support

Components automatically adapt to theme changes when using:
- MD3 design tokens: `var(--md-sys-color-*)`
- Material components: `<mat-button>`, `<mat-card>`, etc.

### 6. Maintainability

External files are:
- Easier to find
- Easier to modify
- Easier to reuse
- Easier to test

## ESLint Configuration

### Main Config File

**File:** `eslint.config.js`

```javascript
export default [
  // ... other configs
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        {
          template: 0,
          styles: 0,
          animations: 10,
        },
      ],
    },
  },
];
```

### Overriding Rules (Not Recommended)

If you absolutely must override this rule for a specific file:

```typescript
/* eslint-disable @angular-eslint/component-max-inline-declarations */
@Component({
  template: `...`,
})
/* eslint-enable @angular-eslint/component-max-inline-declarations */
```

**⚠️ Warning:** This bypasses stylelint validation and breaks MD3 compliance. Only use for:
- Generated code
- Third-party libraries
- Temporary prototypes (must be fixed before production)

## Related Documentation

- [MD3_COMPREHENSIVE_THEME_GUIDE.md](../reference/MD3_COMPREHENSIVE_THEME_GUIDE.md) - Material Design 3 theming
- [MD3_LINTING_GUIDE.md](../reference/MD3_LINTING_GUIDE.md) - Stylelint configuration for MD3
- [DEVELOPMENT.md](../development/DEVELOPMENT.md) - Development workflows

## Troubleshooting

### ESLint Not Showing Errors in IDE

1. **Check ESLint extension is installed:**
   - VS Code: Install "ESLint" extension
   - WebStorm/IntelliJ: ESLint built-in

2. **Check ESLint is enabled:**
   - VS Code: Settings → ESLint → Enable
   - WebStorm: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint

3. **Restart IDE**

### Pre-commit Hook Not Running

1. **Install Husky:**
   ```bash
   yarn install
   ```

2. **Verify hooks are installed:**
   ```bash
   ls -la .husky/
   # Should see: pre-commit
   ```

3. **Make hooks executable:**
   ```bash
   chmod +x .husky/pre-commit
   ```

### ESLint Errors But Build Succeeds

ESLint runs separately from TypeScript compilation:

```bash
# Runs TypeScript compiler
yarn build

# Runs ESLint (separate)
yarn lint
```

Both should pass for production code.

## License

Copyright © 2025 Perpetuator LLC. All rights reserved.

