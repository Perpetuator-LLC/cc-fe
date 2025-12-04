# ESLint Rule: No Inline Templates or Styles
**Date:** December 4, 2025  
**Status:** ✅ **ENFORCED**

## 🚫 Rule Configuration

The project now enforces that all Angular components MUST use external template and style files. Inline `template` and `styles` are prohibited.

### ESLint Rule Added:

```javascript
'@angular-eslint/component-max-inline-declarations': [
  'error',
  {
    template: 0,    // ❌ No inline templates allowed
    styles: 0,      // ❌ No inline styles allowed
    animations: 10, // ✅ Animations can be inline (reasonable default)
  },
],
```

## ❌ What's NOT Allowed

### Inline Template (Prohibited):
```typescript
@Component({
  selector: 'app-my-component',
  template: `<div>My template</div>`,  // ❌ ESLint ERROR
  styleUrl: './my-component.component.scss',
})
```

### Inline Styles (Prohibited):
```typescript
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styles: [`                             // ❌ ESLint ERROR
    .my-class { color: red; }
  `],
})
```

### Both Inline (Prohibited):
```typescript
@Component({
  selector: 'app-my-component',
  template: `<div>My template</div>`,    // ❌ ESLint ERROR
  styles: [`.my-class { color: red; }`], // ❌ ESLint ERROR
})
```

## ✅ What's Required

### External Files Only:
```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [...],
  templateUrl: './my-component.component.html',  // ✅ REQUIRED
  styleUrl: './my-component.component.scss',      // ✅ REQUIRED
})
export class MyComponent { }
```

### File Structure:
```
my-component/
├── my-component.component.ts      # Component logic
├── my-component.component.html    # External template (REQUIRED)
└── my-component.component.scss    # External styles (REQUIRED)
```

## 🔍 How It Works

### When You Try to Use Inline:

1. **During Development:**
   ```
   ESLint will show an error in your IDE immediately
   ```

2. **During Lint:**
   ```bash
   yarn lint
   # ERROR: Component has inline template/styles
   # @angular-eslint/component-max-inline-declarations
   ```

3. **During Pre-commit:**
   ```
   Commit will be blocked if inline templates/styles are detected
   ```

## 📋 Benefits

### 1. **Automatic Validation**
- ✅ All styles checked by stylelint
- ✅ All templates checked by Angular template linting
- ✅ No bypassing quality checks

### 2. **Better Maintainability**
- ✅ Easier to find and edit styles
- ✅ Clear separation of concerns
- ✅ Consistent structure across all components

### 3. **MD3 Compliance**
- ✅ Design tokens enforced via stylelint
- ✅ MD3 4px grid spacing validated
- ✅ No legacy CSS variables allowed

### 4. **Team Consistency**
- ✅ All components follow same pattern
- ✅ New developers know where to find files
- ✅ Code reviews are easier

## 🚀 Migration Status

All 9 components that had inline styles have been migrated:

1. ✅ delete-account-dialog
2. ✅ confirm-delete-dialog
3. ✅ auth-callback
4. ✅ create-podcast-dialog
5. ✅ policy-acceptance-dialog
6. ✅ create-episode-dialog
7. ✅ redeem-gift-code-dialog
8. ✅ select-topic-dialog
9. ✅ create-topic-dialog

## 📝 How to Fix Violations

If you get an ESLint error about inline templates/styles:

### Step 1: Create External Files

```bash
# In your component directory
touch my-component.component.html
touch my-component.component.scss
```

### Step 2: Move Content

**Extract template:**
```typescript
// FROM this:
template: `
  <div>My template content</div>
`,

// TO my-component.component.html:
<div>My template content</div>
```

**Extract styles:**
```typescript
// FROM this:
styles: [`
  .my-class { color: red; }
`],

// TO my-component.component.scss:
.my-class {
  color: var(--md-sys-color-error); // Use MD3 tokens!
}
```

### Step 3: Update Component Decorator

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [...],
  templateUrl: './my-component.component.html',  // Add this
  styleUrl: './my-component.component.scss',     // Add this
  // Remove: template
  // Remove: styles
})
```

### Step 4: Verify

```bash
# Run linter
yarn lint

# Run stylelint (your styles are now validated!)
yarn lint:scss

# Build
yarn build
```

## 🔧 Additional Rules

The ESLint config also enforces:

```javascript
'@angular-eslint/prefer-standalone-component': 'error',
```

This means all components must be standalone (no NgModules).

## 📚 Related Documentation

- **Migration Report:** `logs/ai_edits/2025-12-04_inline-styles-migration-complete.md`
- **Folder Organization:** `logs/ai_edits/2025-12-04_component-folder-organization.md`
- **Quick Reference:** `docs/no-more-inline-styles.md`
- **MD3 Theme Guide:** `notes/MD3_COMPREHENSIVE_THEME_GUIDE.md`

## ✅ Verification Commands

```bash
# Check for any remaining inline styles (should be empty)
grep -r "template: \`" src/app --include="*.ts"
grep -r "styles: \[" src/app --include="*.ts"

# Run ESLint
yarn lint

# Run stylelint
yarn lint:scss

# Build
yarn build
```

All should pass with no errors! ✅

## 🎯 Summary

- **Rule:** `@angular-eslint/component-max-inline-declarations`
- **Inline Templates:** ❌ **NOT ALLOWED** (limit: 0 lines)
- **Inline Styles:** ❌ **NOT ALLOWED** (limit: 0 lines)
- **External Files:** ✅ **REQUIRED** for all components
- **Enforcement:** ✅ **ACTIVE** via ESLint
- **Migration:** ✅ **100% COMPLETE**

From now on, all new components MUST use external `templateUrl` and `styleUrl` files. Any attempt to use inline templates or styles will be caught by ESLint and must be fixed before the code can be committed.

